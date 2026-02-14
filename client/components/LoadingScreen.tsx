import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/contexts/ThemeContext";

export function LoadingScreen() {
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
