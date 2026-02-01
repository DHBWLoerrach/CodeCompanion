import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  USER_PROFILE: "dhbw_user_profile",
  PROGRESS: "dhbw_progress",
  STREAK: "dhbw_streak",
  SETTINGS: "dhbw_settings",
};

export interface UserProfile {
  displayName: string;
  avatarIndex: number;
}

export interface TopicProgress {
  topicId: string;
  questionsAnswered: number;
  correctAnswers: number;
  lastPracticed?: string;
  completed: boolean;
}

export interface ProgressData {
  totalQuestions: number;
  correctAnswers: number;
  topicProgress: Record<string, TopicProgress>;
  achievements: string[];
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPracticeDate: string | null;
  weekHistory: boolean[];
}

export type ThemeMode = "auto" | "light" | "dark";

export interface SettingsData {
  language: "en" | "de";
  difficulty: "beginner" | "intermediate" | "advanced";
  themeMode: ThemeMode;
}

const defaultProfile: UserProfile = {
  displayName: "",
  avatarIndex: 0,
};

const defaultProgress: ProgressData = {
  totalQuestions: 0,
  correctAnswers: 0,
  topicProgress: {},
  achievements: [],
};

const defaultStreak: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  lastPracticeDate: null,
  weekHistory: [false, false, false, false, false, false, false],
};

const defaultSettings: SettingsData = {
  language: "en",
  difficulty: "beginner",
  themeMode: "auto",
};

export const storage = {
  async getProfile(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  },

  async setProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  async getProgress(): Promise<ProgressData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : defaultProgress;
    } catch {
      return defaultProgress;
    }
  },

  async setProgress(progress: ProgressData): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  },

  async updateTopicProgress(
    topicId: string,
    questionsAnswered: number,
    correctAnswers: number
  ): Promise<void> {
    const progress = await this.getProgress();
    const existing = progress.topicProgress[topicId] || {
      topicId,
      questionsAnswered: 0,
      correctAnswers: 0,
      completed: false,
    };

    progress.topicProgress[topicId] = {
      ...existing,
      questionsAnswered: existing.questionsAnswered + questionsAnswered,
      correctAnswers: existing.correctAnswers + correctAnswers,
      lastPracticed: new Date().toISOString(),
      completed: existing.correctAnswers + correctAnswers >= 10,
    };

    progress.totalQuestions += questionsAnswered;
    progress.correctAnswers += correctAnswers;

    await this.setProgress(progress);
  },

  async getStreak(): Promise<StreakData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
      const streak = data ? JSON.parse(data) : defaultStreak;
      return this.updateStreakIfNeeded(streak);
    } catch {
      return defaultStreak;
    }
  },

  updateStreakIfNeeded(streak: StreakData): StreakData {
    if (!streak.lastPracticeDate) return streak;

    const today = new Date().toDateString();
    const lastDate = new Date(streak.lastPracticeDate).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastDate === today) {
      return streak;
    }

    if (lastDate === yesterday) {
      return streak;
    }

    return {
      ...streak,
      currentStreak: 0,
      weekHistory: [false, false, false, false, false, false, false],
    };
  },

  async recordPractice(): Promise<StreakData> {
    const streak = await this.getStreak();
    const today = new Date().toDateString();
    const lastDate = streak.lastPracticeDate
      ? new Date(streak.lastPracticeDate).toDateString()
      : null;

    if (lastDate === today) {
      return streak;
    }

    const dayOfWeek = new Date().getDay();
    const newWeekHistory = [...streak.weekHistory];
    newWeekHistory[dayOfWeek] = true;

    let newStreak = streak.currentStreak;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastDate === yesterday || !lastDate) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const newStreakData: StreakData = {
      currentStreak: newStreak,
      bestStreak: Math.max(streak.bestStreak, newStreak),
      lastPracticeDate: new Date().toISOString(),
      weekHistory: newWeekHistory,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(newStreakData));
    return newStreakData;
  },

  async getSettings(): Promise<SettingsData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  async setSettings(settings: SettingsData): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  async addAchievement(achievementId: string): Promise<void> {
    const progress = await this.getProgress();
    if (!progress.achievements.includes(achievementId)) {
      progress.achievements.push(achievementId);
      await this.setProgress(progress);
    }
  },

  async clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.PROGRESS,
      STORAGE_KEYS.STREAK,
      STORAGE_KEYS.SETTINGS,
    ]);
  },
};
