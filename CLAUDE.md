# mobile_app

Reemplazo de **CtrlBines** en React Native con Expo. Corre en handhelds Hopeland: HY820 y HY830
con Android 8.1 y HY416 con Android 9. «mobile_app» es un nombre provisional.

## Alcance

Solo cinco funcionalidades, confirmadas el 2026-11-04:

1. Captura de eventos con guía de movilización: los 19 eventos de trazabilidad (garitas, llegadas,
   pesca, análisis de calidad, despachos de meta e hielo, recepción).
2. Guías de remisión: salida e ingreso, con la lectura RFID de los bines de la guía.
3. Salida de exportación, con el sellado del embarque.
4. Guías virtuales: recepción y PDF.
5. Validar personal.

Además: inicio de sesión, elegir planta (solo de una lista, sin QR), Inicio, Historial y Perfil.
Lo demás de la app vieja (bines, despacho, autorizar salidas, guías PDF) se eliminó a propósito.

Diseño aprobado, por rol y por pantalla: https://claude.ai/artifact/L2oCNwLFZwh3RAtCvzf5vY
Roles y uso en producción: https://claude.ai/artifact/HxLVQtHybeH6BKZHzoAMeo

## Referencias

- **`../CtrlBines`**, rama `12-refactor-ctrl-bines`: la versión en Jetpack Compose. Es la fuente de
  verdad del comportamiento.
  - Contratos de la API: `core/network/.../CtrlBinesApi.kt` y `dto/`.
  - Reglas y textos de cada pantalla: `feature/*`.
  - Catálogo de eventos y opciones del menú: `core/data/.../menu/Catalogo.kt`.
  - Hardware: `core/hardware` (lector de códigos, gatillo) y `core/lectura` (RFID).
- **`../GSMobile`**: la otra app React Native de la empresa. De ahí salen el tema, las primitivas
  de UI y los patrones (cliente HTTP, Query, stores). Lee su `CLAUDE.md`.
- **`../SPErp`**: el backend Laravel. Endpoints en `app/Http/Controllers/CtrlBinMovil/ControlBinMovilController.php`,
  rutas `binesMovil/*` en `routes/api.php`.

## Decisiones

- **Expo SDK 58 sin EAS.** Se compila en local (`pnpm android`, `./gradlew` dentro de `android/`).
  Nada se sube a servidores de Expo.
- **Solo Android** (`platforms: ['android']`).
- **`android/` se genera** con `pnpm prebuild` desde `app.config.ts` y está en `.gitignore`. No se
  edita a mano: los cambios nativos van en `app.config.ts` o en un config plugin.
- **Ambientes**: `.env` (no se versiona; plantilla en `.env.example`). `APP_VARIANT=development`
  instala «Mobile App DEV» con el paquete `com.santapriscila.mobileapp.dev`, junto a la app en uso.
  `EXPO_PUBLIC_API_URL` es la API del ERP. Producción: `http://192.168.1.42/api/auth/`.
- **Navegación**: React Navigation, stack nativo tipado (`src/navigation/`), como GS Mobile. No se
  usa Expo Router.
- **Estado**: TanStack Query para lo del servidor y zustand para lo de cliente.
- **HTTP**: una sola instancia de axios en `src/lib/api/`, con errores normalizados.
- **Persistencia**:
  - `expo-secure-store` para la sesión y el token.
  - `expo-sqlite` para la cola de registros sin conexión y el historial.
  - `expo-sqlite/kv-store` para preferencias.
- **Hardware Hopeland**: módulo local de Expo en `modules/hopeland` (Kotlin). Envuelve los SDK de
  Hopeland (`.aar`, `.jar` y `.so`). La API para JavaScript vive en `src/hardware/` y ya define lo
  que el módulo tiene que exponer (`Hopeland`: `escucharGatillo`, `leerCodigo`, `abrirRfid`,
  `iniciarLecturaRfid`, `detenerLecturaRfid`, `cerrarRfid`, `pitar` y los eventos `onGatillo` y
  `onTag`). Sin el módulo, las pantallas avisan que el lector no está disponible.
- **PDF de guías virtuales**: módulo local `modules/visor-pdf` con el `PdfRenderer` de Android.
- **Íconos**: Lucide (`lucide-react-native`), importados de a uno en `components/ui/Icon.tsx`
  (`lucide-react-native/icons/<archivo>`). Algunos archivos tienen otro nombre que el ícono
  (`circle-exclamation-point`, `triangle-exclamation-point`, `rotate-ccw-clock`).
- **Fechas y horas**: el diálogo nativo de `@react-native-community/datetimepicker`.

## Estructura de `src/`

- `App.tsx`: proveedores (área segura, Query, navegación) y el envío de lo pendiente.
- `navigation/`: stack, tipos de rutas y `rutas.ts` (qué pantalla abre cada opción del menú del ERP).
- `features/<funcionalidad>/`: pantallas, hooks y servicios de cada funcionalidad:
  - `sesion`: login, elegir planta, la sesión guardada y el menú del ERP.
  - `inicio`: Inicio, Historial, Perfil, menú lateral y el armado por rol.
  - `eventos`: catálogo de los 19 eventos, captura, registro y cola sin conexión.
  - `remision`: guías de remisión y su lectura RFID. `exportacion`: salida y sellado.
  - `consultas`: Validar personal, guías virtuales y su PDF.
  - `pendientes`: envío de lo guardado sin conexión.
- Las reglas sin red ni base (`reglas.ts`, `armado.ts`, `catalogo.ts`) tienen pruebas en `__tests__/`.
- `components/ui/`: primitivas del sistema de diseño.
- `styles/theme.ts`: tokens claro y oscuro del Sistema de Diseño Santa Priscila. Los colores solo
  salen de ahí; ESLint prohíbe hex en el resto de `src/`.
- `lib/api/`: cliente HTTP. `lib/storage/`: almacenes.
- `hardware/`: lector de códigos, gatillo y RFID desde JavaScript.
- `hooks/`: hooks compartidos.

Import con alias `@/` → `src/` (solo en `tsconfig.json`; Metro lo resuelve).

## Reglas

- Dependencias **siempre** con `npx expo install <paquete>`: elige la versión compatible con el SDK.
- Expo cambia mucho entre versiones. Antes de usar una API de Expo, revisa la documentación de la
  versión 58: https://docs.expo.dev/versions/v58.0.0/ (índice: https://docs.expo.dev/llms.txt).
- Textos al usuario:
  - En tono formal (usted).
  - No nombran al ERP, al portal ni a SALEM.
  - Si el usuario no puede resolver un error solo, el texto termina con «Comuníquese con Sistemas.».
- Ingreso va en verde y Salida en rojo, rellenos: los usuarios actúan por instinto.
- La pantalla más chica es la del HY416: **320 × 533 dp**. Todo tiene que caber ahí y con letra 1,3×.
- Antes de dar algo por terminado: `pnpm lint`, `pnpm typecheck` y `pnpm test`.

## Comandos

```bash
pnpm install
pnpm prebuild        # genera android/ desde app.config.ts
pnpm android         # compila el development build y lo instala en el equipo conectado
pnpm start           # servidor de desarrollo (con el development build ya instalado)
pnpm lint && pnpm typecheck && pnpm test
```

## Estado y próximos pasos

Actualiza esta sección al cerrar cada tarea.

**2026-11-04: base creada.**
- Expo SDK 58 con la configuración, los ambientes, ESLint, Jest y la estructura de carpetas.
- `src/App.tsx` todavía es un marcador.
- El primer development build para arm64 compiló, en 2 min 44 s, y quedó instalado en el HY416 como
  `com.santapriscila.mobileapp.dev`, junto a la app en uso.

**2026-11-05: pantallas y navegación migradas, sin probar contra el ERP.**
- Portado de la rama `12-refactor-ctrl-bines`, con los ajustes del documento de diseño:
  - Tema, primitivas y la fuente Aniuk.
  - Navegación por estado de sesión, cliente HTTP con errores formales y sesión guardada.
  - Login, elegir planta, Inicio por rol, menú lateral, Historial y Perfil (tema y letra).
  - Captura de los 19 eventos, con la cola sin conexión en SQLite y el envío automático.
  - Guías de remisión con su lectura RFID, Salida de exportación con sellado, Validar personal,
    Guías virtuales y su PDF.
- `pnpm lint`, `pnpm typecheck` y `pnpm test` (55 pruebas de las reglas portadas) pasan. El APK de
  desarrollo compiló en 54 s y en el HY416 abre el inicio de sesión.
- No se probó ninguna llamada al ERP: falta iniciar sesión en el equipo.
- No se migró la actualización desde el ERP (`binesMovil/apk`): baja el APK de la app vieja, con
  otro paquete. Se resuelve cuando se decida el paquete definitivo.
- El visor del PDF todavía no acerca con los dedos.
- El teclado: `Screen` usa `KeyboardAvoidingView` con `padding`. En el HY416 el botón sube con el
  teclado; revisar en el HY820.

**Plan:**
1. Probar en el HY416, pantalla por pantalla, con usuarios de cada rol. Escribir en el ERP solo con
   cuidado (ver «Lo que escribe en producción al probar»).
2. Módulo nativo `modules/hopeland`: lector de códigos, gatillo y RFID, con la interfaz que ya espera
   `src/hardware/index.ts`. Se porta desde `../CtrlBines/app/.../hardware` (implementación con los
   SDK), `core/hardware` y `core/lectura`. Los SDK están en `../CtrlBines/app/libs` y
   `app/src/main/jniLibs`. Es la parte con más riesgo.
3. Pruebas en el HY820 (Android 8.1).

**Pendiente de decidir:**
- El nombre definitivo de la app y del paquete. Para reemplazar la app en uso sin desinstalarla
  harían falta el paquete `com.ipsp.ctrlbines` y su misma firma.
- Si todos los textos pasan a usted. Por ahora, usted en mensajes y errores.

## Cómo trabajamos

- Todo en español: respuestas, commits, comentarios y textos.
- **Commits solo locales**: sin push, salvo que el usuario lo pida. Sin líneas `Co-Authored-By`.
- Subagentes con el modelo **sonnet**. No lanzar workflows multiagente sin preguntar.
- **Producción solo se lee**, con consultas SELECT. Nunca imprimir contraseñas de bases de datos.
  No escribir las credenciales del usuario en el equipo: inicia sesión él.
- La máquina se queda sin RAM:
  - Después de compilar, `./gradlew --stop` dentro de `android/`.
  - No usar `--rerun-tasks`.
  - No usar `pkill -f <patrón>` con el patrón en la misma línea de comando.
- El usuario revisa el diseño pantalla por pantalla. Sus correcciones van al documento de diseño y
  a la app.

## Pruebas en los equipos

- **HY416**, serie A025100AD013074: Android 9, arm64, 320 × 533 dp. **HY820**: Android 8.1.
  Ya existe la regla de udev para USB (`/etc/udev/rules.d/51-android.rules`, vendor 0e8d).
- Compilar solo para arm64 y conectar el servidor de desarrollo:

  ```bash
  cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
  adb install -r app/build/outputs/apk/debug/app-debug.apk
  adb reverse tcp:8081 tcp:8081 && pnpm start
  ```

- **Lo que escribe en producción al probar** (los mismos endpoints que la app en uso):
  - Escanear o consultar una **pre-guía la marca como LEÍDA** (`activo = 2`), aunque no se
    registre. Lo hace `binesMovil/registrar-trazabilidad`.
  - «Registrar» crea un movimiento real. Para probar, «Descartar».
  - Leer una guía virtual registra que llegó.
  - Lo registrado sin conexión se envía solo cuando vuelve la red.
- Base de pruebas: el ERP local (`php artisan serve --host=10.51.15.19` en `../SPErp`) usa la
  empresa 1, «(Pruebas)», en 10.50.1.13. Casi no tiene guías de despacho ni de remisión.
- Leer producción desde `../SPErp`: `php artisan tinker` y luego
  `setup_dbconns(true); DB::connection('conn1')` (10.51.1.202, `myad001`).
  - Roles y usuarios en `Administracion.*`. Está incompleta: le faltan usuarios que sí registran.
  - `log_t_mov_bin` no tiene índice por fecha: filtrar por rango de `id_movimiento_bin`.

## Reglas del backend que la app debe respetar

- Una guía puede registrarse otra vez en el mismo evento. Solo se rechaza si su **último**
  movimiento es ese mismo evento. En análisis de calidad, despacho de meta y garita interna no se
  repite la misma dirección. La app no valida duplicados por su cuenta: traduce el rechazo a un
  mensaje formal.
- El ERP todavía no manda la cédula del chofer ni el código del vehículo. Mientras no lleguen, esas
  filas no se muestran.
- `guardarConfig` (guías de remisión entre plantas) confirma el movimiento y después responde 404,
  «Error al actualizar estado!!!». Se cuenta como guardado.
- El lote sin conexión de la app vieja tiene `sin_pesca` y la fecha invertidos, y el backend los
  vuelve a invertir. No arreglar un solo lado.
