package expo.modules.hopeland

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Lector de códigos del propio Android, en los equipos que traen el servicio de escaneo del
 * fabricante (`com.eastaeon.scandecoderservice`, el del HY416). Ahí el sistema atiende el gatillo,
 * lee y avisa el resultado por broadcast; el SDK de Hopeland no conoce estos equipos.
 */
internal class LectorSistema(private val context: Context, private val alLeer: (String) -> Unit) {

  private var receptor: BroadcastReceiver? = null

  fun registrar() {
    if (receptor != null) return
    val nuevo = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        texto(intent)?.let(alLeer)
      }
    }
    val filtro = IntentFilter().apply { ACCIONES.forEach(::addAction) }
    ContextCompat.registerReceiver(context, nuevo, filtro, ContextCompat.RECEIVER_EXPORTED)
    receptor = nuevo
  }

  fun quitar() {
    receptor?.let {
      try {
        context.unregisterReceiver(it)
      } catch (_: IllegalArgumentException) {
        // Ya no estaba registrado.
      }
    }
    receptor = null
  }

  /** El código leído: primero las claves conocidas y, si no, el primer texto que traiga. */
  private fun texto(intent: Intent): String? {
    val extras = intent.extras ?: return null
    val claves = CLAVES + extras.keySet().filterNot { it in CLAVES }
    for (clave in claves) {
      @Suppress("DEPRECATION")
      val valor = extras.get(clave)
      val texto = when (valor) {
        is String -> valor
        is ByteArray -> String(valor, Charsets.UTF_8)
        else -> null
      }?.trim()
      if (!texto.isNullOrEmpty()) return texto
    }
    Log.w(TAG, "Broadcast ${intent.action} sin texto; claves: ${extras.keySet()}")
    return null
  }

  companion object {
    private const val TAG = "LectorSistema"
    private const val SERVICIO = "com.eastaeon.scandecoderservice"

    /** Las dos salidas por broadcast que trae el servicio; la activa depende de su configuración. */
    private val ACCIONES = listOf("com.android.receive_scan_action", "com.android.server.scannerservice.broadcast")
    private val CLAVES = listOf("data", "scannerdata", "barcode", "barcode_string", "barcodeString")

    /** Si este equipo lee con el servicio del sistema y no con el SDK de Hopeland. */
    fun disponible(context: Context): Boolean = try {
      context.packageManager.getPackageInfo(SERVICIO, 0)
      true
    } catch (_: PackageManager.NameNotFoundException) {
      false
    }
  }
}
