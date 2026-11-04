// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['android/*', 'dist/*', 'modules/*/android/*'] },
  {
    // Los colores salen solo de los tokens del tema.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/styles/theme.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]', message: 'Usa un token de src/styles/theme.ts en vez de un color fijo.' },
      ],
    },
  },
]);
