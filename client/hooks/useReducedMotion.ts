import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let isInitialized = false;
let isReducedMotionEnabled = false;
const listeners = new Set<() => void>();

let areVisualPreferencesInitialized = false;
let isReducedTransparencyEnabled = false;
let isHighTextContrastEnabled = false;
const visualPreferenceListeners = new Set<() => void>();
let reducedMotionSubscription: ReturnType<
  typeof AccessibilityInfo.addEventListener
> | null = null;
const visualPreferenceSubscriptions: Array<
  ReturnType<typeof AccessibilityInfo.addEventListener>
> = [];

function notifyListeners(value: boolean) {
  if (isReducedMotionEnabled === value) {
    return;
  }

  isReducedMotionEnabled = value;
  listeners.forEach((listener) => listener());
}

function initializeReducedMotionPreference() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  reducedMotionSubscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    notifyListeners
  );
  void AccessibilityInfo.isReduceMotionEnabled().then(notifyListeners, () =>
    notifyListeners(false)
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initializeReducedMotionPreference();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return isReducedMotionEnabled;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function notifyVisualPreferenceListeners() {
  visualPreferenceListeners.forEach((listener) => listener());
}

function updateReducedTransparency(value: boolean) {
  if (isReducedTransparencyEnabled !== value) {
    isReducedTransparencyEnabled = value;
    notifyVisualPreferenceListeners();
  }
}

function updateHighTextContrast(value: boolean) {
  if (isHighTextContrastEnabled !== value) {
    isHighTextContrastEnabled = value;
    notifyVisualPreferenceListeners();
  }
}

function initializeVisualPreferences() {
  if (areVisualPreferencesInitialized) {
    return;
  }

  areVisualPreferencesInitialized = true;
  visualPreferenceSubscriptions.push(
    AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      updateReducedTransparency
    ),
    AccessibilityInfo.addEventListener(
      'highTextContrastChanged',
      updateHighTextContrast
    )
  );
  void AccessibilityInfo.isReduceTransparencyEnabled().then(
    updateReducedTransparency,
    () => updateReducedTransparency(false)
  );
  void AccessibilityInfo.isHighTextContrastEnabled().then(
    updateHighTextContrast,
    () => updateHighTextContrast(false)
  );
}

function subscribeToVisualPreferences(listener: () => void) {
  visualPreferenceListeners.add(listener);
  initializeVisualPreferences();

  return () => {
    visualPreferenceListeners.delete(listener);
  };
}

export function useReducedTransparency() {
  return useSyncExternalStore(
    subscribeToVisualPreferences,
    () => isReducedTransparencyEnabled,
    () => false
  );
}

export function useHighTextContrast() {
  return useSyncExternalStore(
    subscribeToVisualPreferences,
    () => isHighTextContrastEnabled,
    () => false
  );
}

/** @internal Test helper for resetting the module-level native preference store. */
export function __resetAccessibilityPreferencesForTests() {
  reducedMotionSubscription?.remove();
  reducedMotionSubscription = null;
  visualPreferenceSubscriptions.splice(0).forEach((subscription) => {
    subscription.remove();
  });
  isInitialized = false;
  areVisualPreferencesInitialized = false;
  isReducedMotionEnabled = false;
  isReducedTransparencyEnabled = false;
  isHighTextContrastEnabled = false;
  listeners.clear();
  visualPreferenceListeners.clear();
}
