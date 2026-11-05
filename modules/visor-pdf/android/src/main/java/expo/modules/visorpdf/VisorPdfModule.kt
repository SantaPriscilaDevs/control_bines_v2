package expo.modules.visorpdf

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/**
 * Visor de PDF con el `PdfRenderer` de Android, como la versión Kotlin: dibuja cada página como un
 * PNG blanco del ancho pedido y devuelve dónde quedó. La hoja sigue blanca en tema oscuro.
 */
class VisorPdfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VisorPdf")

    /** [base64]: el PDF. [ancho]: en píxeles. Devuelve `{uri, ancho, alto}` por página. */
    AsyncFunction("renderizar") { base64: String, ancho: Int ->
      val contexto = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      // Una sola carpeta: la guía anterior se borra al abrir la siguiente.
      val carpeta = File(contexto.cacheDir, "visor_pdf").apply {
        deleteRecursively()
        mkdirs()
      }
      val pdf = File(carpeta, "documento.pdf")
      try {
        pdf.writeBytes(Base64.decode(base64, Base64.DEFAULT))
        ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
          PdfRenderer(descriptor).use { renderer ->
            val marca = System.currentTimeMillis()
            (0 until renderer.pageCount).map { indice ->
              renderer.openPage(indice).use { pagina ->
                val alto = (ancho.toFloat() * pagina.height / pagina.width).toInt()
                val imagen = Bitmap.createBitmap(ancho, alto, Bitmap.Config.ARGB_8888)
                imagen.eraseColor(Color.WHITE)
                pagina.render(imagen, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                val archivo = File(carpeta, "pagina-${indice + 1}-$marca.png")
                FileOutputStream(archivo).use { imagen.compress(Bitmap.CompressFormat.PNG, 100, it) }
                imagen.recycle()
                mapOf("uri" to "file://${archivo.absolutePath}", "ancho" to ancho, "alto" to alto)
              }
            }
          }
        }
      } catch (e: IllegalArgumentException) {
        throw CodedException("ERR_PDF_INVALIDO", "No se recibió un PDF válido.", e)
      } catch (e: IOException) {
        throw CodedException("ERR_PDF_INVALIDO", "No se recibió un PDF válido.", e)
      } catch (e: SecurityException) {
        throw CodedException("ERR_PDF_PROTEGIDO", "El PDF está protegido y no se puede mostrar.", e)
      }
    }
  }
}
