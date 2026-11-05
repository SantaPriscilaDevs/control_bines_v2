package expo.modules.hopeland

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lector de códigos, gatillo y RFID de los handhelds Hopeland para JavaScript (`src/hardware`).
 * Porta `core/hardware` y `app/.../hardware` de la versión Kotlin.
 */
class HopelandModule : Module() {

  private val contexto: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val lectorCodigos by lazy { LectorCodigos(contexto) }
  private val lectorRfid by lazy {
    LectorRfid(contexto) { epc, rssi -> sendEvent("onTag", mapOf("epc" to epc, "rssi" to rssi)) }
  }

  /**
   * En los equipos con el servicio de escaneo del sistema, lo que ese servicio lee llega por
   * broadcast. En el HY416 es el único camino: su gatillo (tecla 292) lo atiende el sistema y el SDK
   * de Hopeland no conoce el equipo. En el HY820 el servicio está pero su gatillo (F9) no lo dispara:
   * ahí lee el SDK.
   */
  private val lectorSistema by lazy {
    if (LectorSistema.disponible(contexto)) {
      LectorSistema(contexto) { texto -> if (escuchando) sendEvent("onCodigo", mapOf("texto" to texto)) }
    } else {
      null
    }
  }

  /** Hay una pantalla esperando el gatillo; si no, la tecla sigue su curso normal. */
  @Volatile
  private var escuchando = false

  override fun definition() = ModuleDefinition {
    Name("Hopeland")
    Events("onGatillo", "onTag", "onCodigo")

    OnCreate { lectorSistema?.registrar() }
    OnDestroy { lectorSistema?.quitar() }

    OnActivityEntersForeground {
      ponerGatillo()
      lectorRfid.reanudar()
    }

    // Como `onStop` en la versión Kotlin: con la app atrás, los lectores quedan libres para otras apps.
    OnActivityEntersBackground {
      lectorCodigos.liberar()
      lectorRfid.pausar()
    }

    Function("escucharGatillo") { activo: Boolean ->
      escuchando = activo
      if (activo) ponerGatillo()
    }

    AsyncFunction("leerCodigo") { _: Int, promise: Promise ->
      lectorCodigos.leer { resultado ->
        // El HY820 trae el servicio del sistema pero su gatillo lee con el SDK. Si el SDK no abre y
        // el sistema lee por su cuenta (HY416), no es un error: el código llega por `onCodigo`.
        if (resultado.containsKey("motivo") && resultado["sinLector"] == "1" && lectorSistema != null) {
          promise.resolve(mapOf("texto" to ""))
        } else {
          promise.resolve(resultado - "sinLector")
        }
      }
    }

    Function("liberarCodigos") { lectorCodigos.liberar() }

    AsyncFunction("abrirRfid") { potencia: Int, modo: List<Int>, promise: Promise ->
      if (modo.size != 4) {
        promise.resolve("La configuración del lector RFID no es válida. Comuníquese con Sistemas.")
      } else {
        lectorRfid.abrir(potencia, modo) { motivo -> promise.resolve(motivo) }
      }
    }

    Function("iniciarLecturaRfid") { lectorRfid.iniciar() }
    Function("detenerLecturaRfid") { lectorRfid.detener() }
    Function("cerrarRfid") { lectorRfid.cerrar() }
    Function("pitar") { Pitido.pitar() }
  }

  /** Pone [CallbackGatillo] delante de la ventana de la Activity, una sola vez por ventana. */
  private fun ponerGatillo() {
    val actividad = appContext.currentActivity ?: return
    actividad.runOnUiThread {
      val ventana = actividad.window ?: return@runOnUiThread
      val actual = ventana.callback ?: return@runOnUiThread
      if (actual is CallbackGatillo) return@runOnUiThread
      ventana.callback = CallbackGatillo(actual, { escuchando }) { presionado ->
        sendEvent("onGatillo", mapOf("presionado" to presionado))
      }
    }
  }
}
