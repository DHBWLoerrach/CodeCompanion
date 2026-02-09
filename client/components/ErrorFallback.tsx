import React from "react";
import { reloadAppAsync } from "expo";
import { StyleSheet, View, Pressable, Text, Alert } from "react-native";
import { AppIcon } from "@/components/AppIcon";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

const fallbackTheme = Colors.light;

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const handleShowDetails = () => {
    Alert.alert("Error Details", formatErrorDetails(), [
      { text: "OK", style: "default" },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: fallbackTheme.backgroundRoot },
      ]}
    >
      {__DEV__ ? (
        <Pressable
          onPress={handleShowDetails}
          style={({ pressed }) => [
            styles.topButton,
            {
              backgroundColor: fallbackTheme.backgroundDefault,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AppIcon name="alert-circle" size={20} color={fallbackTheme.text} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <Text style={[styles.title, { color: fallbackTheme.text }]}>Oops!</Text>

        <Text style={[styles.message, { color: fallbackTheme.text }]}>
          DHBW Learn encountered an unexpected issue. Tap below to get back to
          learning!
        </Text>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: fallbackTheme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text
            style={[styles.buttonText, { color: fallbackTheme.buttonText }]}
          >
            Back to Learning
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    width: "100%",
    maxWidth: 600,
  },
  title: {
    textAlign: "center",
    lineHeight: 40,
    fontSize: 32,
    fontWeight: "700",
  },
  message: {
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 24,
    fontSize: 16,
  },
  topButton: {
    position: "absolute",
    top: Spacing["2xl"] + Spacing.lg,
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing["2xl"],
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
});
