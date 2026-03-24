import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { deviceIdStorageKey, getOrCreateDeviceId } from "@/lib/device-id";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "generated-device-id"),
}));

const randomUUIDMock = jest.mocked(Crypto.randomUUID);
const EXISTING_DEVICE_ID = "123e4567-e89b-42d3-a456-426614174000";
const GENERATED_DEVICE_ID = "123e4567-e89b-42d3-b456-426614174001";

describe("device ID storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    randomUUIDMock.mockClear();
    randomUUIDMock.mockReturnValue(GENERATED_DEVICE_ID);
  });

  it("generates and stores a device ID on first use", async () => {
    const deviceId = await getOrCreateDeviceId();

    expect(deviceId).toBe(GENERATED_DEVICE_ID);
    expect(randomUUIDMock).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(deviceIdStorageKey)).toBe(
      GENERATED_DEVICE_ID,
    );
  });

  it("returns the stored device ID without generating a new one", async () => {
    await AsyncStorage.setItem(deviceIdStorageKey, EXISTING_DEVICE_ID);

    const deviceId = await getOrCreateDeviceId();

    expect(deviceId).toBe(EXISTING_DEVICE_ID);
    expect(randomUUIDMock).not.toHaveBeenCalled();
  });

  it("replaces an invalid stored device ID with a new UUID v4", async () => {
    await AsyncStorage.setItem(deviceIdStorageKey, "existing-device-id");

    const deviceId = await getOrCreateDeviceId();

    expect(deviceId).toBe(GENERATED_DEVICE_ID);
    expect(randomUUIDMock).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(deviceIdStorageKey)).toBe(
      GENERATED_DEVICE_ID,
    );
  });

  it("propagates AsyncStorage write errors", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("write failed"));

    await expect(getOrCreateDeviceId()).rejects.toThrow("write failed");
  });
});
