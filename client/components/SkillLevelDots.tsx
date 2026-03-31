import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { MasteryLevel } from '@shared/skill-level';
import { withOpacity } from '@/constants/theme';

interface SkillLevelDotsProps {
  level: MasteryLevel;
  color: string;
  size?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkillLevelDots({
  level,
  color,
  size = 6,
  gap = 2,
  style,
}: SkillLevelDotsProps) {
  return (
    <View style={[styles.container, { gap }, style]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
            { backgroundColor: i <= level ? color : withOpacity(color, 0.25) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  dot: {
    flexShrink: 0,
  },
});
