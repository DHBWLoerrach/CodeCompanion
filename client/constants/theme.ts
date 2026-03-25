import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2C3E50",
    buttonText: "#FFFFFF",
    onColor: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: "#E2001A",
    link: "#4A90E2",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F9FA",
    backgroundSecondary: "#F0F2F4",
    backgroundTertiary: "#E8EBED",
    primary: "#E2001A",
    secondary: "#4A90E2",
    success: "#34C759",
    accent: "#FFB800",
    disabled: "#D1D5DB",
    error: "#E2001A",
    codeBackground: "#F8F9FA",
    cardBorder: "#E8EBED",
    cardBorderSubtle: "rgba(232, 235, 237, 0.72)",
    separator: "rgba(44, 62, 80, 0.08)",
  },
  dark: {
    text: "#ECEDEE",
    buttonText: "#FFFFFF",
    onColor: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#E2001A",
    link: "#4A90E2",
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    primary: "#E2001A",
    secondary: "#4A90E2",
    success: "#34C759",
    accent: "#FFB800",
    disabled: "#6B7280",
    error: "#E2001A",
    codeBackground: "#2A2C2E",
    cardBorder: "#404244",
    cardBorderSubtle: "rgba(255, 255, 255, 0.12)",
    separator: "rgba(255, 255, 255, 0.08)",
  },
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  code: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "'Fira Code', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  floatingButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const AvatarColors = ["#E2001A", "#4A90E2", "#34C759", "#FFB800"];

export const AVATARS = ["monitor", "award", "code", "zap"] as const;

export type ButtonSize = "default" | "compact";

export function getButtonHeight(size: ButtonSize = "default") {
  return size === "compact" ? 48 : Spacing.buttonHeight;
}

export const BottomActionBarLayout = {
  paddingTop: Spacing.md,
  paddingBottom: Spacing.lg,
  gap: Spacing.md,
  extraScrollPadding: Spacing.lg,
} as const;

export function getBottomActionBarScrollPadding({
  buttonCount = 1,
  buttonSize = "default",
  extraScrollPadding = BottomActionBarLayout.extraScrollPadding,
  safeAreaBottom = 0,
}: {
  buttonCount?: number;
  buttonSize?: ButtonSize;
  extraScrollPadding?: number;
  safeAreaBottom?: number;
} = {}) {
  return (
    BottomActionBarLayout.paddingTop +
    BottomActionBarLayout.paddingBottom +
    buttonCount * getButtonHeight(buttonSize) +
    Math.max(buttonCount - 1, 0) * BottomActionBarLayout.gap +
    safeAreaBottom +
    extraScrollPadding
  );
}

export function withOpacity(color: string | null | undefined, opacity: number) {
  const clampedOpacity = Math.min(Math.max(opacity, 0), 1);

  if (!color) {
    return "transparent";
  }

  const hex = color.trim();

  if (/^#([\da-f]{3}|[\da-f]{6})$/i.test(hex)) {
    const normalized =
      hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;

    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);

    return `rgba(${red}, ${green}, ${blue}, ${clampedOpacity})`;
  }

  const rgbMatch = hex.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );

  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch;
    return `rgba(${red}, ${green}, ${blue}, ${clampedOpacity})`;
  }

  return hex;
}
