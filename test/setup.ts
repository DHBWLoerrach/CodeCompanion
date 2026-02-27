import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "Light" },
  NotificationFeedbackType: { Success: "Success", Error: "Error" },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);

jest.mock("react-native-reanimated", () => {
  const mockReanimated = require("react-native-reanimated/mock");
  mockReanimated.default.call = () => {};
  return mockReanimated;
});

jest.mock("react-native-keyboard-controller", () => {
  const mockReact = require("react");
  return {
    KeyboardProvider: ({ children }: { children: unknown }) => children,
    KeyboardAwareScrollView: ({ children }: { children: unknown }) =>
      mockReact.createElement(mockReact.Fragment, null, children),
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
