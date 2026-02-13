import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDaysUntilDue,
  isTopicDue,
  storage,
  type ProgressData,
  type StreakData,
  type TopicProgress,
} from "@/lib/storage";

const STREAK_KEY = "dhbw_streak";
const SETTINGS_KEY = "dhbw_settings";

function daysAgo(base: string, days: number): string {
  return new Date(
    new Date(base).getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
}

describe("storage helpers", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("isTopicDue", () => {
    it("returns true when progress is missing", () => {
      expect(isTopicDue(undefined)).toBe(true);
    });

    it("returns true when lastPracticed is missing", () => {
      const progress = {
        topicId: "variables",
        questionsAnswered: 10,
        correctAnswers: 8,
        skillLevel: 2,
      } as TopicProgress;
      expect(isTopicDue(progress)).toBe(true);
    });

    it("returns false when interval is not reached", () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));

      const progress: TopicProgress = {
        topicId: "variables",
        questionsAnswered: 10,
        correctAnswers: 8,
        skillLevel: 3,
        lastPracticed: daysAgo(now, 6),
      };

      expect(isTopicDue(progress)).toBe(false);
    });

    it("returns true when interval is reached", () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));

      const progress: TopicProgress = {
        topicId: "variables",
        questionsAnswered: 10,
        correctAnswers: 8,
        skillLevel: 3,
        lastPracticed: daysAgo(now, 7),
      };

      expect(isTopicDue(progress)).toBe(true);
    });
  });

  describe("getDaysUntilDue", () => {
    it("returns 0 when progress is missing", () => {
      expect(getDaysUntilDue(undefined)).toBe(0);
    });

    it("returns remaining days for not-due topic", () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));

      const progress: TopicProgress = {
        topicId: "closures",
        questionsAnswered: 10,
        correctAnswers: 8,
        skillLevel: 4,
        lastPracticed: daysAgo(now, 10),
      };

      expect(getDaysUntilDue(progress)).toBe(4);
    });

    it("returns 0 when topic is already due", () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));

      const progress: TopicProgress = {
        topicId: "closures",
        questionsAnswered: 10,
        correctAnswers: 8,
        skillLevel: 2,
        lastPracticed: daysAgo(now, 3),
      };

      expect(getDaysUntilDue(progress)).toBe(0);
    });
  });
});

describe("storage state updates", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("recordPractice", () => {
    it("starts a new streak when there is no previous entry", async () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));
      const today = new Date(now).getDay();

      const result = await storage.recordPractice();

      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
      expect(result.lastPracticeDate).toBe(now);
      expect(result.weekHistory[today]).toBe(true);
      expect(result.weekHistory.filter(Boolean)).toHaveLength(1);
    });

    it("does not increment streak when already practiced today", async () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));

      const streak: StreakData = {
        currentStreak: 4,
        bestStreak: 7,
        lastPracticeDate: now,
        weekHistory: [false, true, false, false, false, false, true],
      };
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak));
      const setItemSpy = jest.spyOn(AsyncStorage, "setItem");
      setItemSpy.mockClear();

      const result = await storage.recordPractice();

      expect(result).toEqual(streak);
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it("resets broken streak to 1", async () => {
      const now = "2026-02-08T12:00:00.000Z";
      jest.useFakeTimers().setSystemTime(new Date(now));
      const today = new Date(now).getDay();

      const streak: StreakData = {
        currentStreak: 5,
        bestStreak: 9,
        lastPracticeDate: daysAgo(now, 3),
        weekHistory: [true, true, false, true, false, false, false],
      };
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak));

      const result = await storage.recordPractice();

      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(9);
      expect(result.weekHistory[today]).toBe(true);
      expect(result.weekHistory.filter(Boolean)).toHaveLength(1);
    });
  });

  describe("updateTopicProgress", () => {
    it("increments topic and global counters", async () => {
      await storage.updateTopicProgress("javascript", "variables", 5, 4);
      await storage.updateTopicProgress("javascript", "variables", 2, 1);

      const progress = await storage.getProgress();

      expect(progress.totalQuestions).toBe(7);
      expect(progress.correctAnswers).toBe(5);
      expect(
        progress.topicProgress["javascript:variables"].questionsAnswered,
      ).toBe(7);
      expect(
        progress.topicProgress["javascript:variables"].correctAnswers,
      ).toBe(5);
      expect(
        progress.topicProgress["javascript:variables"].lastPracticed,
      ).toBeTruthy();
    });
  });

  describe("updateTopicSkillLevel", () => {
    it("raises level on high score", async () => {
      await storage.updateTopicSkillLevel("javascript", "promises", 85);
      expect(await storage.getTopicSkillLevel("javascript", "promises")).toBe(
        2,
      );
    });

    it("lowers level on low score", async () => {
      const seeded: ProgressData = {
        totalQuestions: 0,
        correctAnswers: 0,
        achievements: [],
        topicProgress: {
          "javascript:promises": {
            topicId: "promises",
            questionsAnswered: 10,
            correctAnswers: 7,
            skillLevel: 3,
          },
        },
      };
      await storage.setProgress(seeded);

      await storage.updateTopicSkillLevel("javascript", "promises", 40);
      expect(await storage.getTopicSkillLevel("javascript", "promises")).toBe(
        2,
      );
    });

    it("does not exceed upper and lower bounds", async () => {
      const seeded: ProgressData = {
        totalQuestions: 0,
        correctAnswers: 0,
        achievements: [],
        topicProgress: {
          "javascript:advanced": {
            topicId: "advanced",
            questionsAnswered: 10,
            correctAnswers: 9,
            skillLevel: 5,
          },
          "javascript:basics": {
            topicId: "basics",
            questionsAnswered: 10,
            correctAnswers: 1,
            skillLevel: 1,
          },
        },
      };
      await storage.setProgress(seeded);

      await storage.updateTopicSkillLevel("javascript", "advanced", 95);
      await storage.updateTopicSkillLevel("javascript", "basics", 20);

      expect(await storage.getTopicSkillLevel("javascript", "advanced")).toBe(
        5,
      );
      expect(await storage.getTopicSkillLevel("javascript", "basics")).toBe(1);
    });
  });

  describe("getSettings", () => {
    it("uses hardcoded german default on first start", async () => {
      const settings = await storage.getSettings();

      expect(settings).toEqual({
        language: "de",
        themeMode: "auto",
      });
    });

    it("normalizes invalid stored settings values", async () => {
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ language: "fr", themeMode: "light" }),
      );

      const settings = await storage.getSettings();

      expect(settings).toEqual({
        language: "de",
        themeMode: "light",
      });
    });
  });
});
