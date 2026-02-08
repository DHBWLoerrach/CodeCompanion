/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/__tests__/**/*.spec.ts",
    "**/__tests__/**/*.spec.tsx",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/client/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },
  collectCoverageFrom: [
    "client/lib/**/*.{ts,tsx}",
    "shared/**/*.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  clearMocks: true,
};
