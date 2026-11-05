# Mobile App

Reemplazo de **CtrlBines** hecho en React Native con Expo. Corre solo en Android, en los handhelds
Hopeland **HY820** (Android 8.1), **HY830** (Android 13) y **HY416** (Android 9). El lector de
códigos, el gatillo y el RFID funcionan solo en esos equipos. En un teléfono o en el emulador se
pueden ver las pantallas, pero el lector avisa que no está disponible.

Las decisiones del proyecto, la estructura de `src/` y las reglas de trabajo están en
[CLAUDE.md](CLAUDE.md). Este archivo explica qué instalar para desarrollar y cómo probar la app en
un equipo.

### Desarrollo y uso en campo

La app en uso **no depende de ninguna computadora ni de ningún cable**. Hay dos formas de
compilarla:

| | APK de producción | *Development build* |
| --- | --- | --- |
| Para qué | El uso diario en las camaroneras y plantas | Programar y probar |
| El código JavaScript | Va dentro del APK | Lo sirve Metro desde la computadora del desarrollador |
| Necesita | Solo la red para hablar con el ERP. Sin red, guarda los registros y los envía al volver | La computadora con Metro, por cable o por Wi-Fi |

Todo lo que sigue (Node, el Android SDK, `adb`, Metro, el cable) es para desarrollar.

## Qué hace falta

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Git | cualquiera reciente | Clonar el repositorio |
| Node.js | 26 LTS (también sirven 22.13+ y 24.3+) | Expo, Metro y las herramientas de JavaScript |
| pnpm | 12 | Instalar las dependencias. El proyecto usa `pnpm-lock.yaml`: no usar npm ni yarn |
| JDK | 17 | Compilar la parte Android con Gradle |
| Android SDK | ver la lista de abajo | Compilar e instalar el APK |
| Cable USB de datos | — | Solo al desarrollar: instalar el APK de prueba y ver los registros del equipo. Se puede reemplazar por Wi-Fi (ver «Sin cable») |

Paquetes del Android SDK:

| Paquete | Versión |
| --- | --- |
| Platform-Tools (`adb`) | la más reciente |
| SDK Platform | 37 |
| Build-Tools | 37.0.0 |
| NDK | 27.1.12297006 |
| CMake | 3.22.1 |

Si falta algún paquete y las licencias están aceptadas, Gradle lo descarga solo en la primera
compilación. Instalarlos antes ahorra esperas y errores.

### Lo que no hace falta

A diferencia de GS Mobile, este proyecto **no** necesita:

- **Cuenta de Expo ni EAS.** Todo se compila en su máquina; nada se sube a servidores de Expo.
- **`react-native-cli` ni `expo-cli` globales.** Los comandos salen del proyecto, con `pnpm` o
  `npx expo`.
- **Watchman.** Es opcional: Metro funciona sin él.
- **Xcode, CocoaPods ni Ruby.** No hay versión para iOS.
- **Parches en `node_modules`.** Si algo nativo necesita un cambio, va en `app.config.ts` o en un
  módulo de `modules/`.
- **Android Studio.** Es cómodo para instalar el SDK y leer Kotlin, pero basta con las
  herramientas de línea de comandos.

## Instalación

Probado en Ubuntu 26.04. En Windows y macOS los pasos son los mismos, con otros instaladores;
todavía no se probaron con este proyecto.

### Linux (Ubuntu)

1. **Node.js** con [nvm](https://github.com/nvm-sh/nvm#installing-and-updating), sin `sudo`.
   Instalar nvm con el comando de su página, abrir una terminal nueva y luego:

   ```bash
   nvm install 26
   ```

2. **pnpm**:

   ```bash
   npm install -g pnpm@12
   ```

3. **JDK 17**:

   ```bash
   sudo apt install openjdk-17-jdk
   ```

4. **Android SDK**. Con Android Studio: *Settings → Languages & Frameworks → Android SDK*, marcar
   *Show Package Details* e instalar los paquetes de la tabla. Sin Android Studio:

   ```bash
   # Bajar «Command line tools only» de https://developer.android.com/studio#command-line-tools-only
   mkdir -p ~/Android/Sdk/cmdline-tools
   unzip commandlinetools-linux-*.zip -d ~/Android/Sdk/cmdline-tools
   mv ~/Android/Sdk/cmdline-tools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest

   ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager \
     "platform-tools" "platforms;android-37.0" "build-tools;37.0.0" \
     "ndk;27.1.12297006" "cmake;3.22.1"
   ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --licenses
   ```

5. **Variables de entorno**. Agregar al final de `~/.bashrc` (o `~/.zshrc`):

   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
   ```

   Abrir una terminal nueva y comprobar:

   ```bash
   java -version      # 17
   adb version
   echo $ANDROID_HOME
   ```

6. **Permiso para el USB**. Linux no deja usar el handheld sin una regla de udev. Los Hopeland
   usan el chip MediaTek (fabricante `0e8d`):

   ```bash
   echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="0e8d", MODE="0660", GROUP="plugdev"' \
     | sudo tee /etc/udev/rules.d/51-android.rules
   sudo udevadm control --reload-rules
   sudo usermod -aG plugdev $USER
   # Cerrar sesión y volver a entrar para que tome el grupo
   ```

### Windows

1. Instalar Node.js, el JDK 17 y Android Studio:

   ```powershell
   winget install OpenJS.NodeJS.LTS Microsoft.OpenJDK.17 Google.AndroidStudio Git.Git
   npm install -g pnpm@12
   ```

2. En Android Studio, instalar los paquetes del SDK de la tabla (*Settings → Languages &
   Frameworks → Android SDK → Show Package Details*).
3. Variables de entorno de usuario (*Editar las variables de entorno de esta cuenta*):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` = la carpeta del JDK 17, por ejemplo `C:\Program Files\Microsoft\jdk-17...`
   - Agregar a `Path`: `%LOCALAPPDATA%\Android\Sdk\platform-tools`
4. Si `adb devices` no muestra el handheld, instalar el controlador USB de MediaTek.
5. Trabajar en una ruta corta, como `C:\dev\mobile_app`: las rutas largas rompen la compilación
   nativa en Windows.

### macOS

```bash
brew install node pnpm openjdk@17
brew install --cask android-studio
```

Después, los pasos 4 y 5 de Linux, con `JAVA_HOME=$(/usr/libexec/java_home -v 17)` y
`ANDROID_HOME=$HOME/Library/Android/sdk`. macOS no necesita la regla de udev.

## Preparar el proyecto

```bash
git clone <url-del-repositorio> mobile_app
cd mobile_app
pnpm install
cp .env.example .env     # y revisar EXPO_PUBLIC_API_URL
pnpm prebuild            # genera android/ a partir de app.config.ts
```

`android/` **no se versiona ni se edita a mano**: se vuelve a generar con `pnpm prebuild`. Los
cambios nativos van en `app.config.ts` o en los módulos de `modules/`.

### Ambientes (`.env`)

| Variable | Valor | Efecto |
| --- | --- | --- |
| `APP_VARIANT` | `development` | Instala «Mobile App DEV» (paquete `com.santapriscila.mobileapp.dev`) al lado de la app en uso |
| | `production` | El paquete definitivo |
| `EXPO_PUBLIC_API_URL` | `http://10.51.15.19:8000/api/auth/` | El ERP local de pruebas, empresa «(Pruebas)» |
| | `https://www.santa-priscila.com.ec/api/auth/` | Producción |

Con la API de producción, la app escribe datos reales: consultar una pre-guía la marca como leída
y «Registrar» crea un movimiento. Antes de probar, leer «Lo que escribe en producción al probar»
en [CLAUDE.md](CLAUDE.md).

`.env` se lee al iniciar Metro y al compilar. Después de cambiarlo, reiniciar `pnpm start`.

## Instalar el development build en un handheld

Esto es para desarrollar. El APK de producción, firmado y con el JavaScript adentro, todavía no
está armado: es uno de los pendientes del proyecto.

1. En el handheld, activar las opciones de desarrollador: *Ajustes → Acerca del teléfono* y tocar
   siete veces *Número de compilación*. Luego, en *Opciones de desarrollador*, activar
   *Depuración por USB*.
2. Conectarlo por USB y aceptar en el equipo el aviso «¿Permitir depuración por USB?».
3. Comprobar que aparece como `device`:

   ```bash
   adb devices -l
   ```

4. Compilar e instalar el *development build*:

   ```bash
   pnpm android
   ```

   Esto compila para todas las arquitecturas. Para compilar solo la de los handhelds (arm64), que
   tarda menos y usa menos memoria:

   ```bash
   cd android
   ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ./gradlew --stop      # libera la memoria de Gradle
   cd ..
   ```

   La primera compilación tarda unos 3 minutos; las siguientes, alrededor de 1.

5. Levantar Metro y conectar el handheld a él por el cable:

   ```bash
   adb reverse tcp:8081 tcp:8081
   pnpm start
   ```

   Abrir «Mobile App DEV» en el handheld. Si pide un servidor, elegir `http://localhost:8081`.

### Sin cable

El handheld y la computadora tienen que estar en la misma red Wi-Fi.

- **Metro por Wi-Fi:** `pnpm start` sin `adb reverse`. En «Mobile App DEV», ingresar
  `http://<IP de la computadora>:8081`. El firewall de la computadora tiene que dejar pasar el
  puerto 8081.
- **adb por Wi-Fi**, para instalar el APK y leer registros:
  - HY830 (Android 13): *Opciones de desarrollador → Depuración inalámbrica → Vincular con código*,
    y en la computadora `adb pair <ip>:<puerto>` y `adb connect <ip>:<puerto>`.
  - HY820 y HY416 (Android 8.1 y 9): no tienen depuración inalámbrica. Hace falta el cable una
    vez para `adb tcpip 5555`; después, `adb connect <ip>:5555` hasta que el equipo se reinicie.

## Trabajo diario

| Cambió… | Qué hacer |
| --- | --- |
| Código en `src/` | Nada: Metro recarga solo. Si no, tecla `r` en la terminal de Metro |
| `.env` | Reiniciar `pnpm start` |
| Kotlin en `modules/` | Volver a compilar e instalar el APK (paso 4) |
| `app.config.ts` o una dependencia nativa | `pnpm prebuild` y volver a compilar |

- **Dependencias:** siempre con `npx expo install <paquete>`, que elige la versión compatible con el
  SDK de Expo. No usar `pnpm add` para librerías de React Native.
- **Antes de un commit:** `pnpm lint && pnpm typecheck && pnpm test`.
- **Dos equipos conectados:** indicar cuál usar con `export ANDROID_SERIAL=<serie>` (la serie sale
  en `adb devices`). `adb reverse` se hace en cada equipo.

## Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| `adb devices` muestra `no permissions` | Falta la regla de udev o el grupo `plugdev` (paso 6 de Linux). Desconectar y volver a conectar |
| `adb devices` muestra `unauthorized` | Aceptar el aviso de depuración en el handheld |
| La app abre en blanco o dice «Unable to load script» | Metro no está corriendo o se perdió `adb reverse` al desconectar el cable. Repetir el paso 5 |
| El puerto 8081 está ocupado | `pnpm start --port 8082` y `adb reverse tcp:8081 tcp:8082` |
| «SDK location not found» | Falta `ANDROID_HOME`. Revisar el paso 5 de Linux y abrir una terminal nueva |
| Gradle se queda sin memoria o la máquina se congela | Compilar solo arm64, `./gradlew --stop` al terminar y no usar `--rerun-tasks` |
| El lector dice que no está disponible | No es un Hopeland (teléfono, emulador) o falta el permiso «Teléfono» de la app |
| Un cambio en `app.config.ts` no aparece | Faltó `pnpm prebuild` antes de compilar |

## Comandos

```bash
pnpm install         # dependencias
pnpm prebuild        # genera android/ desde app.config.ts
pnpm android         # compila el development build y lo instala en el equipo conectado
pnpm start           # Metro, con el development build ya instalado
pnpm lint            # ESLint
pnpm typecheck       # TypeScript
pnpm test            # pruebas de las reglas (Jest)
```
