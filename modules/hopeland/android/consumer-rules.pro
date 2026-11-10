# R8 no debe tocar los SDK de Hopeland: sus librerías nativas (.so) llaman por JNI a clases y
# métodos con su nombre original, y el SDK elige la clase del lector según el equipo. Son los mismos
# paquetes que protege CtrlBines en su proguard-rules.pro, más los de BarcodeAPI y DeviceAPI.

# pdasdk
-keep class cepri.** { *; }
-keep class com.clouiotech.** { *; }
-keep class com.hopeland.** { *; }
-keep class com.pda.** { *; }
-keep class com.port.** { *; }
-keep class com.util.** { *; }
-keep class com.zebra.** { *; }

# BarcodeAPI (servicio de escaneo del HY830) y DeviceAPI
-keep class com.barcode.** { *; }
-keep class com.custom.** { *; }
-keep class com.dawn.** { *; }
-keep class com.hsm.** { *; }
-keep class com.idata.** { *; }
-keep class com.mipha.** { *; }
-keep class com.panling.** { *; }

# API oculta de Android que BarcodeAPI usa para saber en qué equipo corre: existe en el equipo,
# no en el SDK de compilación.
-dontwarn android.os.SystemProperties
