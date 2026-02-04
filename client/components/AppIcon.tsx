import { SymbolView, type SymbolScale, type SymbolWeight } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import { StyleProp, ImageStyle } from "react-native";

const SF_SYMBOLS: Record<string, string> = {
  "edit-3": "square.and.pencil",
  "book-open": "book",
  "bar-chart-2": "chart.bar",
  "alert-circle": "exclamationmark.circle",
  "x": "xmark",
  "award": "rosette",
  "clock": "clock",
  "settings": "gearshape",
  "monitor": "desktopcomputer",
  "code": "chevron.left.slash.chevron.right",
  "zap": "bolt",
  "globe": "globe",
  "moon": "moon",
  "external-link": "arrow.up.right.square",
  "chevron-right": "chevron.right",
  "info": "info.circle",
  "trash-2": "trash",
  "help-circle": "questionmark.circle",
  "check-square": "checkmark.square",
  "lock": "lock",
  "check-circle": "checkmark.circle",
  "book": "book",
  "star": "star",
  "check": "checkmark",
  "refresh-cw": "arrow.clockwise",
  "x-circle": "xmark.circle",
  "trending-up": "chart.line.uptrend.xyaxis",
  "play": "play.fill",
};

type AppIconProps = {
  name: keyof typeof SF_SYMBOLS | string;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
  sf?: string;
  weight?: SymbolWeight;
  scale?: SymbolScale;
};

const SYMBOL_STYLES: Record<string, { weight?: SymbolWeight; scale?: SymbolScale }> = {
  "gearshape": { weight: "regular", scale: "medium" },
  "square.and.pencil": { weight: "semibold", scale: "medium" },
  "book": { weight: "regular", scale: "medium" },
  "chart.bar": { weight: "regular", scale: "medium" },
  "xmark": { weight: "semibold", scale: "medium" },
  "rosette": { weight: "regular", scale: "medium" },
  "clock": { weight: "regular", scale: "medium" },
  "bolt": { weight: "semibold", scale: "medium" },
  "arrow.clockwise": { weight: "semibold", scale: "medium" },
  "play.fill": { weight: "semibold", scale: "medium" },
};

export function AppIcon({
  name,
  size = 20,
  color,
  style,
  sf,
  weight,
  scale,
}: AppIconProps) {
  const symbol = sf ?? SF_SYMBOLS[name] ?? name;
  const symbolStyle = SYMBOL_STYLES[symbol] ?? {};
  const resolvedWeight = weight ?? symbolStyle.weight ?? "semibold";
  const resolvedScale = scale ?? symbolStyle.scale ?? "medium";
  return (
    <SymbolView
      name={symbol as any}
      size={size}
      tintColor={color}
      weight={resolvedWeight}
      scale={resolvedScale}
      style={style as any}
      resizeMode="scaleAspectFit"
      fallback={<Feather name={name as any} size={size} color={color} style={style as any} />}
    />
  );
}
