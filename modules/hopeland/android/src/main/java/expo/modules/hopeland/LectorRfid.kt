package expo.modules.hopeland

import android.content.Context
import android.util.Log
import com.pda.rfid.IAsynchronousMessage
import com.pda.rfid.uhf.UHFReader
import java.util.concurrent.Callable
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * Lector UHF de los Hopeland con el SDK `pdasdk`, como `HopelandLectorRfid` de la versión Kotlin:
 * todas las órdenes en un hilo propio (abrir tarda medio segundo y cada orden espera al módulo). Las
 * lecturas llegan por [IAsynchronousMessage] desde un hilo del SDK y se pasan a [alLeer].
 */
internal class LectorRfid(private val context: Context, private val alLeer: (epc: String, rssi: Double) -> Unit) {

  private val ejecutor = Executors.newSingleThreadExecutor { Thread(it, "lector-rfid") }
  private val receptor = IAsynchronousMessage { modelo ->
    modelo?._EPC?.takeIf { it.isNotBlank() }?.let { alLeer(it.uppercase(), modelo._RSSI_dB) }
  }
  private var abierto = false

  /**
   * Si el SDK no responde (fuera de un Hopeland el módulo no existe y la orden espera para siempre),
   * se avisa a los [ESPERA_APERTURA_MS] y el lector queda como no disponible: su hilo sigue tomado.
   */
  @Volatile
  private var colgado = false

  /** Máscara de antenas según el índice que reporta el lector (igual que `UHF_GetReaderProperty`). */
  private var antena = 1

  /** Con qué se abrió por última vez, para reabrirlo al volver la app al frente. */
  @Volatile
  private var configuracion: Pair<Int, List<Int>>? = null

  @Volatile
  private var pausado = false

  /** Abre y configura el lector. Avisa null si quedó listo; si no, el motivo. */
  fun abrir(potencia: Int, modo: List<Int>, alTerminar: (String?) -> Unit) {
    if (colgado) return alTerminar(NO_RESPONDE)
    configuracion = potencia to modo
    val apertura = ejecutor.submit(Callable { abrirEnHilo(potencia, modo) })
    // La espera va en otro hilo: el de los módulos de Expo no se puede quedar bloqueado 5 s.
    Thread {
      val motivo = try {
        apertura.get(ESPERA_APERTURA_MS, TimeUnit.MILLISECONDS)
      } catch (_: TimeoutException) {
        Log.w(TAG, "El lector RFID no respondió al abrir")
        colgado = true
        NO_RESPONDE
      } catch (e: ExecutionException) {
        Log.w(TAG, "No se pudo abrir el lector RFID", e)
        NO_DISPONIBLE
      }
      alTerminar(motivo)
    }.start()
  }

  private fun abrirEnHilo(potencia: Int, modo: List<Int>): String? {
    return try {
      SdkHopeland.iniciar(context)
      if (!abierto) {
        if (!UHFReader.getUHFInstance().OpenConnect(receptor)) return "No se pudo abrir el lector RFID. Intente nuevamente."
        abierto = true
        Thread.sleep(500)
      }
      val potenciaMaxima = leerPropiedades()
      UHFReader.getUHFInstance().Stop()
      // Sin filtro de repetidos en el módulo: la pantalla decide qué hacer con cada lectura.
      UHFReader._Config.SetTagUpdateParam(0, 0)
      UHFReader._Config.SetANTPowerParam(1, potencia.coerceAtMost(potenciaMaxima))
      UHFReader._Config.SetEPCBaseBandParam(modo[0], modo[1], modo[2], modo[3])
      null
    } catch (e: Throwable) {
      // Fuera de un Hopeland el SDK no encuentra sus librerías nativas.
      Log.w(TAG, "No se pudo abrir el lector RFID", e)
      abierto = false
      NO_DISPONIBLE
    }
  }

  /** Lee sin parar hasta [detener] (gatillo apretado). */
  fun iniciar() = ordenar { UHFReader._Tag6C.GetEPC(antena, 1) }

  fun detener() = ordenar { }

  /** Detiene y suelta el lector para que lo pueda abrir otra pantalla u otra app. */
  fun cerrar() {
    configuracion = null
    pausado = false
    soltar()
  }

  /**
   * Con la app atrás se suelta el lector, como `onPause` en la versión Kotlin. Si una pantalla lo
   * tenía abierto, [reanudar] lo vuelve a abrir con la misma configuración.
   */
  fun pausar() {
    if (configuracion == null) return
    pausado = true
    soltar()
  }

  fun reanudar() {
    val (potencia, modo) = configuracion ?: return
    if (!pausado) return
    pausado = false
    abrir(potencia, modo) { }
  }

  private fun soltar() {
    if (colgado) return
    ejecutor.execute {
      if (!abierto) return@execute
      try {
        UHFReader.getUHFInstance().Stop()
        UHFReader._Config.CloseConnect()
      } catch (e: Throwable) {
        Log.w(TAG, "No se pudo cerrar el lector RFID", e)
      }
      abierto = false
    }
  }

  /** Detiene la lectura en curso y, si se pide, empieza otra. */
  private fun ordenar(despues: () -> Unit) {
    if (colgado) return
    ejecutor.execute {
      if (!abierto) return@execute
      try {
        UHFReader.getUHFInstance().Stop()
        despues()
      } catch (e: Throwable) {
        Log.w(TAG, "El lector RFID no respondió", e)
      }
    }
  }

  /** `min|max|antena|...`: devuelve la potencia máxima y fija la antena. */
  private fun leerPropiedades(): Int {
    val partes = UHFReader._Config.GetReaderProperty()?.split('|').orEmpty()
    if (partes.size <= 3) return POTENCIA_MAXIMA
    antena = mapOf(1 to 1, 2 to 3, 3 to 7, 4 to 15)[partes[2].trim().toIntOrNull()] ?: 1
    return partes[1].trim().toIntOrNull() ?: POTENCIA_MAXIMA
  }

  private companion object {
    const val TAG = "LectorRfid"
    const val POTENCIA_MAXIMA = 33
    const val ESPERA_APERTURA_MS = 5_000L
    const val NO_DISPONIBLE = "Este equipo no tiene lector RFID o no se pudo abrir."
    const val NO_RESPONDE = "El lector RFID no responde. Reinicie el equipo; si continúa, comuníquese con Sistemas."
  }
}
