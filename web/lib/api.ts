export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.trim() };
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join(", ");
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = parseBody(text);
  if (!res.ok) {
    throw new ApiError(res.status, data, errorMessage(data, res.statusText || "Request failed"));
  }
  return data as T;
}

export function apiForm<T>(path: string, file: Blob, field = "file"): Promise<T> {
  const body = new FormData();
  const name = file instanceof File && file.name ? file.name : "page.webp";
  body.append(field, file, name);
  return api<T>(path, { method: "POST", body });
}
