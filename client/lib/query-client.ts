import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { DEVICE_ID_HEADER } from "@shared/api-quota";

/**
 * Gets the base URL for the Expo API routes (e.g., "http://localhost:8081")
 * @returns {string} The API base URL
 */
function isLocalDevelopmentHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function canUseInsecureHttp(hostname: string): boolean {
  return (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    isLocalDevelopmentHost(hostname)
  );
}

function enforceHttpsUnlessAllowed(url: URL): URL {
  if (url.protocol === "https:") {
    return url;
  }

  if (url.protocol === "http:" && canUseInsecureHttp(url.hostname)) {
    return url;
  }

  throw new Error("HTTPS is required for API URL outside local development");
}

export function getApiUrl(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) {
    return enforceHttpsUnlessAllowed(new URL(explicitUrl)).href;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hasProtocol = /^https?:\/\//i.test(hostUri);
    const url = hasProtocol ? new URL(hostUri) : new URL(`http://${hostUri}`);

    if (!hasProtocol && !isLocalDevelopmentHost(url.hostname)) {
      url.protocol = "https:";
    }

    return enforceHttpsUnlessAllowed(url).href;
  }

  throw new Error("EXPO_PUBLIC_API_URL is not set");
}

export class ApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed (${status})`);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

function isQuotaProtectedQuizRoute(method: string, route: string): boolean {
  return (
    method.toUpperCase() === "POST" &&
    (route === "/api/quiz/generate" || route === "/api/quiz/generate-mixed")
  );
}

async function parseErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      const text = await res.text();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new ApiRequestError(res.status, await parseErrorBody(res));
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (isQuotaProtectedQuizRoute(method, route)) {
    headers[DEVICE_ID_HEADER] = await getOrCreateDeviceId();
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
// @visibleForTesting
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
