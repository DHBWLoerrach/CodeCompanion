import React from 'react';
import { Picker, Row, Text } from '@expo/ui';

import type { SettingsPickerRowProps } from './SettingsPickerRow.types';

export type {
  SettingsPickerOption,
  SettingsPickerRowProps,
} from './SettingsPickerRow.types';

/**
 * Fallback (web/type-checking): label plus the universal menu `Picker`.
 * iOS and Android use the platform files next to this one.
 */
export function SettingsPickerRow<T extends string>({
  label,
  options,
  selectedValue,
  onValueChange,
  testID,
}: SettingsPickerRowProps<T>) {
  return (
    <Row spacing={16} alignment="center">
      <Text>{label}</Text>
      <Picker<T>
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        testID={testID}
      >
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </Row>
  );
}
