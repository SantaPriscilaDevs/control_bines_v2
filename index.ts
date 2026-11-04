import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App) y prepara el
// entorno tanto en el development build como en el APK de producción.
registerRootComponent(App);
