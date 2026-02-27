import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import { AppIcon } from "@/components/AppIcon";
import { HeaderIconButton } from "@/components/HeaderIconButton";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { MarkdownView } from "@/components/MarkdownView";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCloseHandler } from "@/hooks/useCloseHandler";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { getParam, getParamWithDefault } from "@/lib/router-utils";

export default function TopicExplanationScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { topicId, programmingLanguage } = useLocalSearchParams<{
    topicId?: string;
    programmingLanguage?: string;
  }>();
  const resolvedTopicId = getParam(topicId);
  const resolvedProgrammingLanguage = getParamWithDefault(
    programmingLanguage,
    "javascript",
  );

  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const handleClose = useCloseHandler();
  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };

  useEffect(() => {
    let isActive = true;

    const loadExplanation = async () => {
      if (!resolvedTopicId) {
        setError(t("topicNotFound"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = getApiUrl();
        const response = await fetch(
          new URL("/api/topic/explain", apiUrl).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicId: resolvedTopicId,
              language,
              programmingLanguage: resolvedProgrammingLanguage,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to generate explanation");
        }

        const data = await response.json();
        if (isActive) {
          setExplanation(data.explanation ?? "");
        }
      } catch (fetchError) {
        console.error("Error generating explanation:", fetchError);
        if (isActive) {
          setError(t("failedToLoadExplanation"));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadExplanation();

    return () => {
      isActive = false;
    };
  }, [resolvedTopicId, language, t, resolvedProgrammingLanguage, retryCount]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("topicExplanation"),
          headerLeft: () => <HeaderIconButton icon="x" onPress={handleClose} />,
          headerBackVisible: false,
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl, flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText
                type="body"
                style={{ color: theme.tabIconDefault, marginTop: Spacing.lg }}
              >
                {t("generatingExplanation")}
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <ThemedText type="body" selectable style={{ color: theme.error }}>
                {error}
              </ThemedText>
              <Pressable
                testID="topic-explanation-retry-button"
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={handleRetry}
              >
                <AppIcon
                  name="refresh-cw"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: Spacing.sm }}
                />
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", fontWeight: "600" }}
                >
                  {t("tryAgain")}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <MarkdownView content={explanation} />
          )}
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  errorState: {
    gap: Spacing.lg,
  },
  retryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
