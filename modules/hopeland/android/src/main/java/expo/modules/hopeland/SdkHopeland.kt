package expo.modules.hopeland

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import com.port.Adapt

/** Arranque único del SDK de Hopeland, compartido por el lector de códigos y el RFID. */
internal object SdkHopeland {
  @Volatile
  private var iniciado = false

  /** Con el contexto de la aplicación, no con una Activity: el SDK guarda el contexto para siempre. */
  @Synchronized
  fun iniciar(context: Context) {
    if (iniciado) return
    Adapt.init(context.applicationContext)
    Adapt.enablePauseInBackGround(context.applicationContext)
    iniciado = true
  }
}

/** El pitido corto de lectura correcta (el de `Common.playTone`, un poco más corto). */
internal object Pitido {
  fun pitar() {
    val tono = try {
      ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
    } catch (_: RuntimeException) {
      return
    }
    tono.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
    Handler(Looper.getMainLooper()).postDelayed(tono::release, 250)
  }
}
