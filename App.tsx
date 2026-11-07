import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TodoMainScreen } from './src/screens/TodoMainScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <TodoMainScreen />
    </SafeAreaProvider>
  );
}
