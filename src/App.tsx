import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={estilos.raiz}>
      <Text>Mobile App</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
