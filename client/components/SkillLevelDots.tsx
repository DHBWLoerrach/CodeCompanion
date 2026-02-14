import React from "react";
import { View, StyleSheet } from "react-native";
import type { MasteryLevel } from "@shared/skill-level";

interface SkillLevelDotsProps {
  level: MasteryLevel;
  color: string;
}

export function SkillLevelDots({ level, color }: SkillLevelDotsProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= level ? color : color + "40" },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
