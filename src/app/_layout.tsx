import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="plan-ready" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout-day/[id]" />
        <Stack.Screen name="exercise-library/index" />
        <Stack.Screen name="exercise-library/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
