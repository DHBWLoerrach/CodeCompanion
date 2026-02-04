import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { AppIcon } from "@/components/AppIcon";
import { ThemedText } from "@/components/ThemedText";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PracticeButton() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    router.push("/quiz-session");
  };

  return (
    <Animated.View style={[styles.practiceButtonContainer, animatedStyle]}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.practiceButton, { backgroundColor: theme.primary }]}
        accessibilityRole="button"
        accessibilityLabel={t("startPractice")}
      >
        <AppIcon name="edit-3" size={28} color="#FFFFFF" />
      </AnimatedPressable>
    </Animated.View>
  );
}

function HeaderBrand() {
  const { theme } = useTheme();

  return (
    <View style={styles.headerBrand}>
      <View style={[styles.headerBadge, { backgroundColor: theme.primary }]}>
        <ThemedText
          type="label"
          style={styles.headerBadgeText}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          JS
        </ThemedText>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isIOS = process.env.EXPO_OS === "ios";

  return (
    <Tabs
      initialRouteName="learn"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : theme.backgroundRoot,
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="learn"
        options={{
          title: t("learn"),
          headerShown: true,
          headerTitle: t("learnJavaScript"),
          headerTitleAlign: "left",
          headerShadowVisible: false,
          headerLeft: () => <HeaderBrand />,
          headerRight: () => (
            <Pressable
              style={styles.headerButton}
              onPress={() => router.push("/settings")}
            >
              <AppIcon name="settings" size={20} color={theme.tabIconDefault} />
            </Pressable>
          ),
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "",
          tabBarButton: () => <PracticeButton />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t("progress"),
          headerShown: true,
          headerTitle: t("yourProgress"),
          headerTitleAlign: "left",
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              style={styles.headerButton}
              onPress={() => router.push("/settings")}
            >
              <AppIcon name="settings" size={20} color={theme.tabIconDefault} />
            </Pressable>
          ),
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    paddingLeft: Spacing.lg,
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    fontWeight: "700",
  },
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  practiceButtonContainer: {
    position: "absolute",
    top: -20,
    alignSelf: "center",
    ...Shadows.floatingButton,
  },
  practiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
