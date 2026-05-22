import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSessionRestore } from '../src/hooks/useSessionRestore';
import { useSocketRuntime } from '../src/hooks/useSocketRuntime';
import { useMediaLifecycle } from '../src/hooks/media/useMediaLifecycle';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  useSessionRestore();
  useSocketRuntime();
  useMediaLifecycle();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade_from_bottom',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
