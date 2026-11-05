import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '@/styles/makeStyles';
import Icon, { type IconName } from './Icon';
import Text from './Text';

export interface BottomBarItem<K extends string> {
  key: K;
  label: string;
  icon: IconName;
}

const useStyles = makeStyles(color => ({
  barra: { backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.borderMuted },
  fila: { flexDirection: 'row', height: 64 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  indicador: { width: 56, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  indicadorActivo: { backgroundColor: color.primarySubtle },
  activo: { fontWeight: '800' },
}));

/** Barra inferior de las pantallas principales: Inicio, Historial y Perfil. */
export default function BottomBar<K extends string>({
  items,
  selected,
  onSelect,
}: {
  items: BottomBarItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barra, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      <View style={styles.fila}>
        {items.map(item => {
          const activo = item.key === selected;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: activo }}
              style={styles.item}
            >
              <View style={[styles.indicador, activo && styles.indicadorActivo]}>
                <Icon name={item.icon} size={20} color={activo ? 'primary' : 'textMuted'} />
              </View>
              <Text type="captionStrong" color={activo ? 'primary' : 'textMuted'} style={activo ? styles.activo : undefined}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
