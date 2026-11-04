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
  Hopeland (`.aar`, `.jar` y `.so`). La API para JavaScript vive en `src/hardware/`.

## Estructura de `src/`

- `App.tsx`: proveedores (tema, Query, navegación).
- `navigation/`: stack y tipos de rutas.
- `features/<funcionalidad>/`: pantallas, hooks y servicios de cada funcionalidad.
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
