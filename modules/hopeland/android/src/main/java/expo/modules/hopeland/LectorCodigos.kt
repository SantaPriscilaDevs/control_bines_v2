package expo.modules.hopeland

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.pda.scanner.ScanReader
import com.pda.scanner.Scanner
import java.nio.charset.Charset
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Lector de códigos de los Hopeland con el SDK `pdasdk`, como `HopelandLectorCodigos` de la versión
 * Kotlin. Todo pasa por un único hilo propio: `decode()` bloquea hasta unos 3 s.
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
    val abierto = try {
      escaner ?: abrir()
    } catch (e: Throwable) {
      // Fuera de un Hopeland el SDK no encuentra sus librerías nativas.
      Log.w(TAG, "No se pudo abrir el lector", e)
      null
    } ?: return motivo("Este equipo no tiene lector de códigos o no se pudo abrir.") + ("sinLector" to "1")
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

  private fun abrir(): Scanner? {
    SdkHopeland.iniciar(context)
    val instancia = ScanReader.getScannerInstance() ?: return null
    return if (instancia.open(context)) instancia.also { escaner = it } else null
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
