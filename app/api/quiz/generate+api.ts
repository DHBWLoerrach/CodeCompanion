import { QUIZ_GENERATE_QUOTA_ENDPOINT } from '@shared/api-quota';
import { enforceQuizQuota, quotaUnavailableResponse } from '@server/quota';
import { generateQuizQuestions } from '@server/quiz';
import {
  buildApiRequestTimingFields,
  logApiError,
  logApiRequestOutcome,
} from '@server/logging';
import {
  invalidJsonBodyResponse,
  InvalidJsonBodyError,
  parseJsonBody,
} from '@server/request';
import {
  requireTopicId,
  toLanguage,
  toProgrammingLanguage,
  toQuestionCount,
  toQuizDifficultyLevel,
  validateTopicIdForLanguage,
} from '@server/validation';

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  let deviceIdHash: string | null = null;
  let quotaDurationMs: number | null = null;
  let quotaStartedAt: number | null = null;
  let upstreamStartedAt: number | null = null;

  try {
    const body = await parseJsonBody<{
      topicId?: string;
      count?: number;
      language?: string;
      skillLevel?: number;
      programmingLanguage?: string;
    }>(request);

    const topicId = requireTopicId(body?.topicId);
    if (!topicId) {
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 400,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      return Response.json({ error: 'topicId is required' }, { status: 400 });
    }

    const count = toQuestionCount(body?.count, 5);
    const language = toLanguage(body?.language);
    if (!language) {
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 400,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      return Response.json(
        { error: "language must be 'en' or 'de'" },
        { status: 400 }
      );
    }
    const skillLevel = toQuizDifficultyLevel(body?.skillLevel, 1);
    const programmingLanguage = toProgrammingLanguage(
      body?.programmingLanguage
    );
    if (!programmingLanguage) {
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 400,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      return Response.json(
        {
          error:
            'programmingLanguage must be one of: javascript, python, java, rust',
        },
        { status: 400 }
      );
    }
    if (!validateTopicIdForLanguage(topicId, programmingLanguage)) {
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 400,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      return Response.json(
        { error: 'Invalid topicId for programmingLanguage' },
        { status: 400 }
      );
    }

    try {
      quotaStartedAt = Date.now();
      const quota = await enforceQuizQuota(
        request,
        QUIZ_GENERATE_QUOTA_ENDPOINT
      );
      quotaDurationMs = Date.now() - quotaStartedAt;
      deviceIdHash = quota.deviceIdHash;
      if (quota.response) {
        logApiRequestOutcome({
          endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
          status: quota.response.status,
          deviceIdHash,
          ...(quota.reason ? { reason: quota.reason } : {}),
          ...buildApiRequestTimingFields({
            requestStartedAt,
            quotaDurationMs,
            upstreamStartedAt,
          }),
        });

        return quota.response;
      }
    } catch (error) {
      if (quotaDurationMs === null && quotaStartedAt !== null) {
        quotaDurationMs = Date.now() - quotaStartedAt;
      }
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 503,
        deviceIdHash,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      logApiError('Quiz quota error', error);
      return quotaUnavailableResponse();
    }

    upstreamStartedAt = Date.now();
    const questions = await generateQuizQuestions(
      programmingLanguage,
      topicId,
      count,
      language,
      skillLevel
    );
    logApiRequestOutcome({
      endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
      status: 200,
      deviceIdHash,
      ...buildApiRequestTimingFields({
        requestStartedAt,
        quotaDurationMs,
        upstreamStartedAt,
      }),
    });
    return Response.json({ questions });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      logApiRequestOutcome({
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        status: 400,
        ...buildApiRequestTimingFields({
          requestStartedAt,
          quotaDurationMs,
          upstreamStartedAt,
        }),
      });
      return invalidJsonBodyResponse();
    }
    logApiRequestOutcome({
      endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
      status: 500,
      deviceIdHash,
      ...buildApiRequestTimingFields({
        requestStartedAt,
        quotaDurationMs,
        upstreamStartedAt,
      }),
    });
    logApiError('Quiz generation error', error);
    return Response.json(
      { error: 'Failed to generate quiz questions' },
      { status: 500 }
    );
  }
}
