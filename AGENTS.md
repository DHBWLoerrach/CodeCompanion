# Repository Guidelines

## Project Overview

DHBW Code Companion is a mobile learning app for programming topics (Expo SDK 54, React Native 0.81, React 19, Expo Router 6).

- Supports multiple programming languages (JavaScript, Python, Java) via JSON curricula in `shared/curriculum/`.
- Supports app localization (German/English) via `client/lib/i18n.ts` and `client/contexts/LanguageContext.tsx`.
- AI quiz and explanation generation runs through OpenAI Responses API in server-side API routes.
- User profile, settings, progress, and streak data are stored locally (AsyncStorage), with no server-side user data storage.

## Project Structure & Module Organization

- `app/`: Expo Router file-based routes and API endpoints (`app/api/*+api.ts`).
- `client/`: app UI and client logic (`components/`, `screens/`, `hooks/`, `lib/`, `constants/`, `contexts/`).
- `server/`: server-only route logic (for example `server/quiz.ts`, `server/topic-prompts.ts`, `server/validation.ts`, `server/logging.ts`).
- `shared/`: runtime-neutral shared types/data (`shared/curriculum/`, `shared/programming-language.ts`, `shared/skill-level.ts`).
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
- `npm run test:watch` / `npm run test:coverage`: watch/coverage workflows.
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
- Keep language-aware logic covered (app language and programming language selections).

## Commit & Pull Request Guidelines

- Keep commits focused and imperative.
- Preferred commit style from history: clear and concise (< 80 chars, e.g. "Add quiz generation API route" or "Fix theme context bug").
- Before committing: `npm run check:types && npm run lint && npm run check:format && npm test`
- Commit messages must be in English and concise (<= 80 chars recommended).

## Architecture Notes

- Path aliases: `@/* -> ./client/*`, `@shared/* -> ./shared/*`, `@server/* -> ./server/*` (configured in `tsconfig.json` and `babel.config.js`).
- Route files in `app/` should stay thin and delegate to `client/screens/`.
- State management pattern: React Query + Context + AsyncStorage (no Redux/Zustand).
- API routes:
  - `POST /api/quiz/generate`
  - `POST /api/quiz/generate-mixed`
  - `POST /api/topic/explain`
- API requests may include `programmingLanguage` (`javascript` | `python` | `java`), defaulting to `javascript` when omitted.
- Curricula source of truth: `shared/curriculum/<language>.json`, loaded and validated in `shared/curriculum/index.ts`.
- `client/lib/topics.ts` adapts shared curricula for client screens and legacy translation fallback.
- Add a topic:
  1. Add the topic to the target `shared/curriculum/<language>.json` file.
  2. Add the topic prompt in `server/topic-prompts.ts`.
  3. Ensure IDs and prerequisites remain valid for curriculum validation.
- Add a programming language:
  1. Extend `shared/programming-language.ts`.
  2. Add a curriculum JSON in `shared/curriculum/`.
  3. Add prompt mappings in `server/topic-prompts.ts`.

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
