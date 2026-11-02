import React from 'react';
import { Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import type { SettingsPickerRowProps } from './SettingsPickerRow.types';

/**
 * iOS: a native SwiftUI menu `Picker`. Inside a `FieldGroup` (SwiftUI `Form`)
 * it shows the label on the leading side and the current value as a menu
 * button on the trailing side, like the iOS Settings app.
 */
export function SettingsPickerRow<T extends string>({
  label,
  sfSymbol,
  options,
  selectedValue,
  onValueChange,
  testID,
}: SettingsPickerRowProps<T>) {
  return (
    <Picker<T>
      label={label}
      systemImage={sfSymbol}
      selection={selectedValue}
      onSelectionChange={onValueChange}
      modifiers={[pickerStyle('menu')]}
      testID={testID}
    >
      {options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </Picker>
  );
}
