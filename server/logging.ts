function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error === null || error === undefined) return "Unknown error";

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function logApiError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "production") {
    console.error(`${context}: ${toErrorMessage(error)}`);
    return;
  }

  console.error(`${context}:`, error);
}
