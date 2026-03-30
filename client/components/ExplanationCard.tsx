import React from "react";
import { StyleSheet, View } from "react-native";

import { SecondaryButton } from "@/components/ActionButton";
import { InlineCodeText } from "@/components/InlineCodeText";
import { SurfaceCard } from "@/components/SurfaceCard";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, withOpacity } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";

interface ExplanationCardProps {
  isCorrect: boolean;
  correctAnswer: string;
  resultSentence: string;
  explanation: string;
  takeaway: string;
  commonMistake?: string;
  topicId?: string;
  onPressTopic?: () => void;
}

function normalizeComparableText(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*(result|ergebnis|resultat|ausgabe|output)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function ExplanationCard({
  isCorrect,
  correctAnswer,
  resultSentence,
  explanation,
  takeaway,
  commonMistake,
  topicId,
  onPressTopic,
}: ExplanationCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const titleColor = isCorrect ? theme.success : theme.error;
  const shouldShowResultSentence =
    normalizeComparableText(resultSentence) !==
    normalizeComparableText(correctAnswer);

  return (
    <SurfaceCard
      style={styles.card}
      backgroundColor={theme.backgroundSecondary}
      borderColor={theme.cardBorderSubtle}
      topAccentColor={titleColor}
    >
      <InlineCodeText
        type="h4"
        style={[styles.title, { color: titleColor }]}
        text={
          isCorrect
            ? `${t("correctTitle")} — ${correctAnswer}`
            : `${t("incorrectTitle")} ${correctAnswer}`
        }
      />

      <View style={styles.body}>
        {shouldShowResultSentence ? (
          <InlineCodeText type="body" text={resultSentence} />
        ) : null}
        <InlineCodeText type="body" text={explanation} />
      </View>

      <View
        style={[
          styles.takeaway,
          {
            backgroundColor: withOpacity(theme.secondary, 0.08),
            borderLeftColor: theme.secondary,
          },
        ]}
      >
        <ThemedText type="label" style={{ color: theme.secondary }}>
          {t("takeawayLabel")}
        </ThemedText>
        <InlineCodeText type="body" text={takeaway} />
      </View>

      {commonMistake ? (
        <View
          style={[
            styles.commonMistake,
            { backgroundColor: theme.backgroundTertiary },
          ]}
        >
          <ThemedText type="label" style={{ color: theme.tabIconDefault }}>
            {t("commonMistakeLabel")}
          </ThemedText>
          <InlineCodeText type="body" text={commonMistake} />
        </View>
      ) : null}

      {topicId && onPressTopic ? (
        <SecondaryButton
          testID="quiz-topic-explanation-button"
          color={theme.secondary}
          icon="book-open"
          label={t("moreOnThisTopic")}
          onPress={onPressTopic}
          style={styles.topicAction}
        />
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  body: {
    gap: Spacing.sm,
  },
  takeaway: {
    borderCurve: "continuous",
    borderLeftWidth: 3,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  commonMistake: {
    borderCurve: "continuous",
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  topicAction: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
});
