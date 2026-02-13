import React from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProgrammingLanguageProvider } from "@/contexts/ProgrammingLanguageContext";
import { ThemedStatusBar } from "@/components/ThemedStatusBar";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTranslation } from "@/hooks/useTranslation";

function RootStack() {
  const screenOptions = useScreenOptions();
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="language-select"
        options={({ route }) => {
          const canNavigateBack =
            (route.params as { allowBack?: string } | undefined)?.allowBack ===
            "1";

          return {
            title: t("selectLanguage"),
            headerBackVisible: canNavigateBack,
            gestureEnabled: canNavigateBack,
          };
        }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "" }} />
      <Stack.Screen
        name="quiz-session"
        options={{
          presentation: "modal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="session-summary"
        options={{
          presentation: "modal",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="topic-explanation"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="info-modal"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="topic/[topicId]" options={{ title: "" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ProgrammingLanguageProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <RootStack />
                  <ThemedStatusBar />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </ProgrammingLanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
