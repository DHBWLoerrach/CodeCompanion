import * as https from 'node:https';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_TIMEOUT_MS = 30_000;

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-nano';

export function quizMaxOutputTokens(count: number): number {
  return Math.min(8192, Math.max(4096, count * 300));
}

function getResponseText(response: unknown): string {
  if (
    typeof (response as { output_text?: unknown })?.output_text === 'string'
  ) {
    return (response as { output_text: string }).output_text;
  }

  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) {
    return '';
  }

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        (block as { type?: string })?.type === 'output_text' &&
        typeof (block as { text?: unknown })?.text === 'string'
      ) {
        parts.push((block as { text: string }).text);
      } else if (typeof (block as { text?: unknown })?.text === 'string') {
        parts.push((block as { text: string }).text);
      }
    }
  }

  return parts.join('');
}

function getResponseRefusal(response: unknown): string | null {
  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        (block as { type?: string })?.type === 'refusal' &&
        typeof (block as { refusal?: unknown })?.refusal === 'string'
      ) {
        return (block as { refusal: string }).refusal;
      }
    }
  }

  return null;
}

function assertOpenAIResponseIsUsable(response: unknown): void {
  const refusal = getResponseRefusal(response);
  if (refusal) {
    throw new Error(`OpenAI refused the request: ${refusal}`);
  }

  const status = (response as { status?: unknown })?.status;
  if (status !== 'incomplete') {
    return;
  }

  const reason = (
    response as {
      incomplete_details?: { reason?: unknown } | null;
    }
  )?.incomplete_details?.reason;

  if (typeof reason === 'string' && reason.length > 0) {
    throw new Error(`OpenAI response incomplete: ${reason}`);
  }

  throw new Error('OpenAI response incomplete');
}

function isTimeoutError(error: unknown): boolean {
  const timeoutError = error as { code?: unknown; message?: unknown } | null;
  if (timeoutError?.code === 'ETIMEDOUT') {
    return true;
  }

  return (
    typeof timeoutError?.message === 'string' &&
    timeoutError.message.toLowerCase().includes('timed out')
  );
}

function getOpenAIRequestTimeoutMs(): number {
  const timeout = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(timeout) && timeout > 0) {
    return timeout;
  }
  return DEFAULT_OPENAI_TIMEOUT_MS;
}

async function requestOpenAIViaHttps(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const requestBody = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      OPENAI_RESPONSES_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody).toString(),
        },
      },
      (response) => {
        response.setEncoding('utf8');
        let responseBody = '';
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(`OpenAI request failed with status ${statusCode}`)
            );
            return;
          }

          try {
            resolve(responseBody ? (JSON.parse(responseBody) as unknown) : {});
          } catch {
            reject(new Error('Invalid JSON response from OpenAI'));
          }
        });
      }
    );

    request.setTimeout(getOpenAIRequestTimeoutMs(), () => {
      const timeoutError = new Error(
        'Request timed out'
      ) as NodeJS.ErrnoException;
      timeoutError.code = 'ETIMEDOUT';
      request.destroy(timeoutError);
    });

    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

async function requestOpenAI(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error;
    }

    // Expo's fetch-nodeshim uses a hard 5s socket timeout.
    // Fall back to node:https with a configurable timeout for longer OpenAI responses.
    return requestOpenAIViaHttps(apiKey, payload);
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    if (isTimeoutError(error)) {
      return requestOpenAIViaHttps(apiKey, payload);
    }

    throw new Error('Invalid JSON response from OpenAI');
  }
}

export async function requestQuizResponseText(
  payload: Record<string, unknown>
): Promise<string> {
  const response = await requestOpenAI(payload);
  assertOpenAIResponseIsUsable(response);

  const content = getResponseText(response);
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return content;
}
