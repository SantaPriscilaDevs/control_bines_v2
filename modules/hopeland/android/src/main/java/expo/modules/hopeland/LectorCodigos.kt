package expo.modules.hopeland

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.barcode.barcode.BarcodeUtility
import com.hopeland.pda.scanner.scanner2d.W001A3
import com.pda.scanner.ScanReader
import com.pda.scanner.Scanner
import java.nio.charset.Charset
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Lector de códigos de los Hopeland con el SDK `pdasdk`, como `HopelandLectorCodigos` de la versión
 * Kotlin. Todo pasa por un único hilo propio: `decode()` bloquea hasta unos 3 s.
 *
 * En el HY830 el SDK no lee: configura el servicio de escaneo del sistema (`com.barcode.scanner`),
 * que lee solo al apretar el gatillo y avisa el código por broadcast ([LectorSistema]).
 */
internal class LectorCodigos(private val context: Context) {

  private val ejecutor = Executors.newSingleThreadExecutor { Thread(it, "lector-codigos") }
  private var escaner: Scanner? = null

  /** Hay una lectura en curso: `decode()` tiene el lector tomado hasta 3 s. */
  private val leyendo = AtomicBoolean(false)

  /**
   * Lee un código y avisa con `{texto}` (vacío si no leyó nada) o con `{motivo}` si no se pudo usar.
   * Si ya hay una lectura en curso, avisa vacío enseguida: apretar el gatillo varias veces no deja
   * lecturas en cola que sigan encendiendo el lector después de soltarlo.
   */
  fun leer(alTerminar: (Map<String, String>) -> Unit) {
    if (!leyendo.compareAndSet(false, true)) return alTerminar(mapOf("texto" to ""))
    ejecutor.execute {
      val resultado = try {
        leerEnHilo()
      } finally {
        leyendo.set(false)
      }
      alTerminar(resultado)
    }
  }

  private fun leerEnHilo(): Map<String, String> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
      return motivo("Falta el permiso de «Teléfono» para usar el lector. Actívelo en los ajustes de la app.")
    }
    val abierto = abrirSiHaceFalta()
      ?: return motivo("Este equipo no tiene lector de códigos o no se pudo abrir.") + ("sinLector" to "1")
    // El gatillo ya encendió el lector del sistema: si el SDK también lo pide, lo deja encendido
    // aunque se suelte el gatillo. El código llega por broadcast.
    if (abierto is W001A3) return mapOf("texto" to "")
    val bytes = try {
      abierto.decode()
    } catch (e: Throwable) {
      Log.w(TAG, "Falló la lectura", e)
      cerrar()
      return motivo("El lector dejó de responder. Intente nuevamente.")
    }
    val texto = bytes?.let(::decodificar)?.trim().orEmpty()
    if (texto.isNotEmpty()) Pitido.pitar()
    return mapOf("texto" to texto)
  }

  /** Suelta el lector para que otra app (o la app vieja) lo pueda abrir. */
  fun liberar() {
    ejecutor.execute(::cerrar)
  }

  /**
   * Abre el lector antes del primer gatillo. En el HY830 hace falta: el sistema lee al apretar el
   * gatillo, antes de que la app pida nada, y tiene que estar configurado para avisar por broadcast.
   */
  fun preparar() {
    ejecutor.execute {
      if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
        abrirSiHaceFalta()
      }
    }
  }

  private fun abrirSiHaceFalta(): Scanner? = try {
    escaner ?: abrir()
  } catch (e: Throwable) {
    // Fuera de un Hopeland el SDK no encuentra sus librerías nativas.
    Log.w(TAG, "No se pudo abrir el lector", e)
    null
  }

  private fun abrir(): Scanner? {
    SdkHopeland.iniciar(context)
    val instancia = ScanReader.getScannerInstance() ?: return null
    if (!instancia.open(context)) return null
    if (instancia is W001A3) configurarServicioDelSistema()
    return instancia.also { escaner = it }
  }

  /**
   * `open()` del SDK deja al servicio del HY830 avisando por broadcast, sin sonido y encendido 5 s
   * por pulsación aunque se suelte el gatillo. Se ajusta para que funcione como el HY416: lee
   * mientras el gatillo está apretado (hasta 5 s), se apaga al soltarlo y suena al leer.
   *
   * Además se apaga «interceptar la tecla de escaneo» (`persist.sys.blockScankey`): con esa opción
   * el servicio le deja el gatillo a otra app y no lee. Se activa desde los ajustes del lector o
   * desde otra app, queda guardada y el servicio la vuelve a aplicar cada vez que se enciende.
   */
  private fun configurarServicioDelSistema() {
    val servicio = BarcodeUtility.getInstance()
    servicio.enableBlockScankey(context, false)
    servicio.setReleaseScan(context, true)
    servicio.enablePlaySuccessSound(context, true)
  }

  private fun cerrar() {
    try {
      escaner?.close()
    } catch (e: Throwable) {
      Log.w(TAG, "No se pudo cerrar el lector", e)
    }
    escaner = null
  }

  /** UTF-8 y, si salen caracteres inválidos, GBK: lo mismo que `Common.decodeBarCode`. */
  private fun decodificar(bytes: ByteArray): String {
    val utf8 = String(bytes, Charsets.UTF_8)
    return if (utf8.contains('�')) String(bytes, Charset.forName("GBK")) else utf8
  }

  private fun motivo(texto: String) = mapOf("motivo" to texto)

  private companion object {
    const val TAG = "LectorCodigos"
  }
}
