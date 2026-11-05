import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { colorByScheme, type ColorScheme, type SchemeName } from './theme';
import { useTheme } from './useTheme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Estilos a nivel de módulo en función del esquema de color, memoizados por esquema (como en GS
 * Mobile).
 *
 *   const useStyles = makeStyles(color => ({ tarjeta: { backgroundColor: color.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (color: ColorScheme, scheme: SchemeName) => T) {
  const cache = new Map<SchemeName, T>();
  const resolve = (scheme: SchemeName): T => {
    let estilos = cache.get(scheme);
    if (!estilos) {
      estilos = StyleSheet.create(factory(colorByScheme[scheme], scheme));
      cache.set(scheme, estilos);
    }
    return estilos;
  };
  return (): T => resolve(useTheme().scheme);
}
