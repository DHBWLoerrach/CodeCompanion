import type { SFSymbol } from 'sf-symbols-typescript';

export interface SettingsPickerOption<T extends string> {
  label: string;
  value: T;
}

export interface SettingsPickerRowProps<T extends string> {
  /** Feather icon name (rendered via AppIcon on Android/web). */
  icon: string;
  /** SF Symbol for the native SwiftUI picker label on iOS. */
  sfSymbol: SFSymbol;
  label: string;
  options: SettingsPickerOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  testID?: string;
}
