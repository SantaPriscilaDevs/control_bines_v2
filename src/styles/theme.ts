// Capa semántica del Sistema de Diseño Santa Priscila, la misma de GS Mobile (`src/styles/theme.ts`),
// con los tokens propios de los handhelds: Ingreso en verde, Salida en rojo y el punto «En línea».
// Regla: los colores solo salen de aquí. ESLint prohíbe hex en el resto de `src/`.

const defineScheme = <T extends Record<string, string>>(scheme: T): { readonly [K in keyof T]: string } => scheme;

export const colorLight = defineScheme({
  // superficies (capas tonales, de fondo a frente)
  bg: '#F0F6FF',
  surface: '#FFFFFF',
  surfaceContainer: '#E0EBFC',
  surfaceContainerHigh: '#C7D9F6',
  // texto
  text: '#021D49',
  textMuted: '#605F63',
  textSubtle: '#78777B',
  // límites
  border: '#D8D8DA',
  borderMuted: '#E6EEF8',
  borderStrong: '#78777B',
  // marca: la cabecera navy
  brand: '#021D49',
  // interacción
  primary: '#006793',
  primaryActive: '#003B57',
  primaryBg: '#009CDB',
  primarySubtle: '#ECF7FF',
  // estado
  success: '#53682C',
  successSubtle: '#F3F7ED',
  warning: '#845300',
  warningSubtle: '#FFF3E7',
  danger: '#A23625',
  dangerSubtle: '#FFF2F0',
  info: '#006D74',
  infoSubtle: '#E9F9FA',
  focusRing: '#0081B6',
  // Sentido de un movimiento: no es un estado, así que no usa success ni danger. Los usuarios
  // actúan por instinto: verde entra, rojo sale, rellenos y con texto blanco.
  ingreso: '#2E7D32',
  onIngreso: '#FFFFFF',
  salida: '#C62828',
  onSalida: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  onBrand: '#FFFFFF',
  onBrandMuted: '#C7D9F6',
  onBrandSubtle: 'rgba(255,255,255,0.12)',
  onBrandBorder: 'rgba(255,255,255,0.55)',
  // El success del esquema oscuro: el punto «En línea» va sobre la cabecera navy.
  onlineDot: '#9CB673',
  scrim: 'rgba(2,29,73,0.55)',
  // La hoja de un PDF sigue blanca en tema oscuro.
  paper: '#FFFFFF',
});

// Tema oscuro: el navy de la cabecera no cambia; las tarjetas se separan del fondo por color.
export const colorDark: typeof colorLight = {
  bg: '#050D1B',
  surface: '#0E1829',
  surfaceContainer: '#1A2637',
  surfaceContainerHigh: '#273346',
  text: '#EAE9EB',
  textMuted: '#C2C1C4',
  textSubtle: '#ABAAAE',
  border: '#273346',
  borderMuted: '#1F2B3C',
  borderStrong: '#6F7B8D',
  brand: '#021D49',
  // Sobre primary va texto navy, no blanco.
  primary: '#48B7F2',
  primaryActive: '#AEE0FF',
  primaryBg: '#009CDB',
  primarySubtle: '#00273A',
  success: '#9CB673',
  successSubtle: '#1E270E',
  warning: '#F59E00',
  warningSubtle: '#341E00',
  danger: '#FD826C',
  dangerSubtle: '#40120B',
  info: '#3DBFC9',
  infoSubtle: '#00292C',
  focusRing: '#48B7F2',
  ingreso: '#2E7D32',
  onIngreso: '#FFFFFF',
  salida: '#C62828',
  onSalida: '#FFFFFF',
  textOnPrimary: '#021D49',
  onBrand: '#FFFFFF',
  onBrandMuted: '#C7D9F6',
  onBrandSubtle: 'rgba(255,255,255,0.12)',
  onBrandBorder: 'rgba(255,255,255,0.55)',
  onlineDot: '#9CB673',
  scrim: 'rgba(2,29,73,0.70)',
  paper: '#FFFFFF',
};

export type ColorScheme = typeof colorLight;
export type ColorToken = keyof ColorScheme;
export type SchemeName = 'light' | 'dark';

export const colorByScheme: Record<SchemeName, ColorScheme> = { light: colorLight, dark: colorDark };

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;
export type SpaceToken = keyof typeof space;

// Los radios de GS Mobile (12 · 14 · 16 + cabecera 22), para que las dos apps se vean iguales.
export const radius = {
  control: 12,
  container: 14,
  overlay: 16,
  header: 22,
  pill: 9999,
} as const;

// Aniuk existe en 400, 500, 700 y 800. La familia se registra en app.config.ts.
export const font = {
  sans: 'Aniuk',
  mono: 'monospace',
  weight: { regular: '400', medium: '500', bold: '700', heavy: '800' } as const,
};

const sans = (fontSize: number, lineHeight: number, fontWeight: (typeof font.weight)[keyof typeof font.weight]) => ({
  fontSize,
  lineHeight,
  fontWeight,
  fontFamily: font.sans,
});

const mono = (fontSize: number, lineHeight: number) => ({
  fontSize,
  lineHeight,
  fontWeight: font.weight.bold,
  fontFamily: font.mono,
  fontVariant: ['tabular-nums'] as 'tabular-nums'[],
  writingDirection: 'ltr' as const,
});

/**
 * Roles tipográficos. Son los de GS Mobile y los que agregó la versión Kotlin: números y códigos
 * en monoespaciada (guías, placas, horas y cantidades), rótulos y etiquetas en mayúsculas.
 */
export const type = {
  displayLg: sans(38, 40, font.weight.heavy),
  displayMd: sans(34, 38, font.weight.heavy),
  titleXl: sans(26, 30, font.weight.heavy),
  titleLg: sans(22, 26, font.weight.bold),
  titleMd: sans(20, 25, font.weight.bold),
  titleSm: sans(16, 20, font.weight.bold),
  /** El sujeto de una fila o el título de una sección. */
  titleSubject: sans(17, 22, font.weight.heavy),
  bodyLg: sans(16, 24, font.weight.regular),
  body: sans(15, 21, font.weight.regular),
  bodyStrong: sans(15, 21, font.weight.bold),
  bodySm: sans(13, 18, font.weight.regular),
  bodySmStrong: sans(13, 18, font.weight.bold),
  caption: sans(12, 16, font.weight.regular),
  captionStrong: sans(12, 16, font.weight.bold),
  /** Rótulo de un dato (CONDUCTOR, PLACA…). */
  label: { ...sans(12, 16, font.weight.medium), letterSpacing: 1, textTransform: 'uppercase' as const },
  /** Rótulo de sección dentro de una tarjeta, en el color primario. */
  labelStrong: { ...sans(12, 16, font.weight.bold), letterSpacing: 1, textTransform: 'uppercase' as const },
  /** Sobretítulo de la cabecera navy. */
  overline: { ...sans(11, 14, font.weight.bold), letterSpacing: 1.5, textTransform: 'uppercase' as const },
  /** Etiquetas de estado y de tipo. */
  tag: { ...sans(11, 14, font.weight.bold), letterSpacing: 0.6, textTransform: 'uppercase' as const },
  tagLg: { ...sans(15, 20, font.weight.bold), letterSpacing: 0.6, textTransform: 'uppercase' as const },
  /** Guías, placas y horas en listas. */
  mono: mono(15, 20),
  monoSm: mono(13, 18),
  /** Cantidades: el contador de lectura, los resúmenes y los conteos por estado. */
  numXl: mono(36, 40),
  numLg: mono(26, 30),
  numMd: mono(20, 24),
} as const;
export type TypeRole = keyof typeof type;

// Elevación: sombras tintadas de navy y solo en tema claro. En oscuro la elevación es color.
export const shadow = {
  card: {
    shadowColor: '#021D49',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#021D49',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  none: { shadowOpacity: 0, elevation: 0 },
} as const;

// Táctil: los handhelds se usan con guantes y apurados.
export const hit = { min: 44, control: 48, button: 52 } as const;

/** Tope de la letra: el ajuste del teléfono la agranda hasta 1,3 veces, como en GS Mobile. */
export const ESCALA_MAXIMA_LETRA = 1.3;
