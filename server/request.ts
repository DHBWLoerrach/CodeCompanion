export class InvalidJsonBodyError extends Error {
  constructor() {
    super('Request body must be valid JSON');
    this.name = 'InvalidJsonBodyError';
  }
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function invalidJsonBodyResponse(): Response {
  return Response.json(
    { error: 'Request body must be valid JSON' },
    { status: 400 }
  );
}
