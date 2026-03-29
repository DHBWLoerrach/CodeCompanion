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

jest.mock("react-native-ease", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockRN = require("react-native");

  function MockEaseView(props: Record<string, unknown>) {
    const { onTransitionEnd, animate, initialAnimate, transition, ...rest } =
      props;

    mockReact.useEffect(() => {
      if (typeof onTransitionEnd === "function") {
        onTransitionEnd({ finished: true });
      }
    });

    return mockReact.createElement(mockRN.View, rest);
  }

  return { EaseView: MockEaseView };
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
