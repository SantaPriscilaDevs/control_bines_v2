import { useColorScheme } from 'react-native';
import { usePreferencias } from '@/lib/storage/preferencias';
import { colorByScheme, ESCALA_MAXIMA_LETRA, type ColorScheme, type SchemeName } from './theme';

export interface Tema {
  color: ColorScheme;
  scheme: SchemeName;
  isDark: boolean;
}

/** El esquema que se ve: el elegido en Perfil o, con «Sistema», el del teléfono. */
export function useTheme(): Tema {
  const preferencia = usePreferencias(s => s.tema);
  const sistema = useColorScheme();
  const scheme: SchemeName =
    preferencia === 'sistema' ? (sistema === 'dark' ? 'dark' : 'light') : preferencia === 'oscuro' ? 'dark' : 'light';
  return { color: colorByScheme[scheme], scheme, isDark: scheme === 'dark' };
}

export interface EscalaLetra {
  /** Si el texto sigue el tamaño de letra del teléfono. */
  sigueAlTelefono: boolean;
  /** Factor fijo cuando no lo sigue: 1 en Normal y 1,3 en Grande. */
  factor: number;
}

/** El tamaño de letra elegido en Perfil. Nunca pasa de 1,3 veces el tamaño base. */
export function useEscalaLetra(): EscalaLetra {
  const letra = usePreferencias(s => s.letra);
  if (letra === 'sistema') return { sigueAlTelefono: true, factor: 1 };
  return { sigueAlTelefono: false, factor: letra === 'grande' ? ESCALA_MAXIMA_LETRA : 1 };
}
