import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  Row,
  Text,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  fillMaxWidth,
  testID as testIDModifier,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';

import { SettingsRowIcon } from './SettingsRowAccessory';
import type { SettingsPickerRowProps } from './SettingsPickerRow.types';

/**
 * Android: a Material 3 settings row whose trailing value opens a dropdown
 * menu. `FieldGroup.Section` wraps non-`ListItem` children in its own
 * connected-list row, so this renders only the row content.
 */
export function SettingsPickerRow<T extends string>({
  icon,
  label,
  options,
  selectedValue,
  onValueChange,
  testID,
}: SettingsPickerRowProps<T>) {
  const colors = useMaterialColors();
  const [expanded, setExpanded] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? '';

  return (
    <Row
      horizontalArrangement={{ spacedBy: 16 }}
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        clickable(() => setExpanded(true)),
        ...(testID ? [testIDModifier(testID)] : []),
      ]}
    >
      <SettingsRowIcon name={icon} />
      <Text modifiers={[weight(1)]}>{label}</Text>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <Text color={colors.primary}>{selectedLabel}</Text>
        <DropdownMenu.Items>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                setExpanded(false);
                onValueChange(option.value);
              }}
            >
              <DropdownMenuItem.Text>
                <Text>{option.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Row>
  );
}
