package expo.modules.hopeland

import android.view.KeyEvent
import android.view.Window

/** Gatillo y botones laterales de lectura (los mismos de `DeviceUtils.isActionKey`). */
internal object TeclasGatillo {
  private val TECLAS = setOf(
    // HY820: gatillo y atajos izquierdo y derecho.
    KeyEvent.KEYCODE_F9, 285, 286, KeyEvent.KEYCODE_F1, KeyEvent.KEYCODE_F5,
    // HY830, confirmados en el equipo.
    KeyEvent.KEYCODE_BREAK, KeyEvent.KEYCODE_INSERT, KeyEvent.KEYCODE_FORWARD_DEL,
  )

  fun esGatillo(keyCode: Int) = keyCode in TECLAS
}

/**
 * Se pone delante del `Window.Callback` de la Activity para ver el gatillo antes que la vista con
 * foco: algunos equipos lo mandan como «Supr» o «Insert», y un campo de texto enfocado se lo
 * quedaría para borrar. Es lo que hacía `dispatchKeyEvent` en la versión Kotlin, sin tocar la
 * Activity que genera Expo.
 *
 * Solo consume la tecla si [escuchando] (una pantalla espera el gatillo); si no, sigue su curso.
 * Mantener el gatillo apretado repite la tecla: solo cuenta la primera.
 */
internal class CallbackGatillo(
  val original: Window.Callback,
  private val escuchando: () -> Boolean,
  private val alGatillo: (presionado: Boolean) -> Unit,
) : Window.Callback by original {

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (TeclasGatillo.esGatillo(event.keyCode) && escuchando()) {
      when (event.action) {
        KeyEvent.ACTION_DOWN -> if (event.repeatCount == 0) alGatillo(true)
        KeyEvent.ACTION_UP -> alGatillo(false)
      }
      return true
    }
    return original.dispatchKeyEvent(event)
  }
}
