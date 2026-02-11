# Repository Guidelines

## Project Overview

DHBW Code Companion is a mobile learning app for JavaScript topics (Expo SDK 54, React Native 0.81, React 19, Expo Router 6). AI quiz/explanation generation runs through OpenAI Responses API in server-side API routes. All user data stored locally (AsyncStorage), no server-side user storage.

## Project Structure & Module Organization

- `app/`: file-based routes and API endpoints (`app/api/*+api.ts`).
- `client/`: app UI and client logic (`components/`, `screens/`, `hooks/`, `lib/`, `constants/`, `contexts/`).
- `server/`: server-only logic for API routes (for example `server/quiz.ts`, `server/logging.ts`, `server/validation.ts`).
- `shared/`: runtime-neutral shared types/utilities (for example `shared/skill-level.ts`).
- `__tests__/unit` and `__tests__/integration`: Jest test suites.
- `e2e/maestro`: Maestro end-to-end flows.
- `test/setup.ts`: Jest setup/mocks.
- `.github/workflows/deploy.yml`: manual production deploy workflow.

## Build, Test, and Development Commands

- `npm run start`: Expo dev server (iOS/Android/Web).
- `npm run ios` / `npm run android`: native builds.
- `npm run lint` / `npm run lint:fix`: run/fix ESLint issues.
- `npm run check:types`: TypeScript check (`tsc --noEmit`).
- `npm run check:format` / `npm run format`: Prettier check/write.
- `npm test`: full Jest suite.
- `npm run test:unit` / `npm run test:integration`: scoped tests.
- `npm run test:e2e` / `npm run test:e2e:ai`: Maestro smoke/AI-tagged tests.
- Single test example: `npx jest __tests__/unit/path/to/file.test.ts`.

## Coding Style & Naming Conventions

- TypeScript-first (`.ts`/`.tsx`), strict typing, Expo Router patterns.
- Prettier + ESLint are mandatory; fix warnings before PR.
- Components/screens use `PascalCase` (for example `TopicDetailScreen.tsx`).
- Hooks use `useXxx` naming.
- API route files end with `+api.ts`.

## Testing Guidelines

- Frameworks: Jest (`jest-expo`) + Testing Library + Maestro.
- Test files use `*.test.ts` / `*.test.tsx`.

## Commit & Pull Request Guidelines

- Keep commits focused and imperative.
- Preferred commit style from history: clear and concise (< 80 chars, e.g. "Add quiz generation API route" or "Fix theme context bug".>)
- Before committing: `npm run check:types && npm run lint && npm run check:format && npm test`
- Commit messages must be in English and be concise (<= 80 chars recommended).

## Architecture Notes

- Path aliases: `@/* -> ./client/*`, `@shared/* -> ./shared/*`, `@server/* -> ./server/*` (configured in `tsconfig.json` and `babel.config.js`).
- Route files in `app/` should stay thin and delegate to `client/screens/`.
- State management pattern: React Query + Context + AsyncStorage (no Redux/Zustand).
- API routes: `POST /api/quiz/generate`, `POST /api/quiz/generate-mixed`, `POST /api/topic/explain`.
- Add a topic in three places: `client/lib/topics.ts`, `client/lib/i18n.ts`, `server/quiz.ts` (`TOPIC_PROMPTS`).

## Environment Variables

- `OPENAI_API_KEY`: required for AI endpoints; server-side only.
- `OPENAI_MODEL`: optional, default `gpt-5.2`.
- `EXPO_PUBLIC_API_URL`: client API base URL for deployments.

## Security & Deployment Rules

- Never commit secrets (`.env` and `.env*.local` are gitignored).
- OpenAI keys must be created as `Restricted` with only `Responses: Write`.
- Production deploys are manual via GitHub Actions only (`.github/workflows/deploy.yml`).
- Never run local `eas deploy` from developer machines.
- EAS environment variables are immutable per deployment; rotate/update keys and redeploy to apply changes.
