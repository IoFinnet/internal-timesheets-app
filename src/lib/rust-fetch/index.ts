import { invoke } from "@tauri-apps/api/core";
import { Duration } from "luxon";

export async function rustFetch(
  input: string | URL | globalThis.Request,
  init?: Pick<RequestInit, "headers" | "method" | "signal"> & { body?: string },
) {
  const { promise, resolve, reject } = Promise.withResolvers<Response>();
  setTimeout(() => reject(new Error("request timed out")), Duration.fromObject({ seconds: 30 }).as("milliseconds"));

  const headers = new Headers();
  for (const [key, value] of Object.entries(init?.headers ?? {})) {
    headers.append(key, value);
  }

  const request: RustHttpRequest = {
    url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    method: init?.method ?? "GET",
    headers: Object.fromEntries(headers.entries()),
    body: init?.body ?? undefined,
  };

  const response: RustHttpResponse = await invoke("http_request", { request });
  init?.signal?.throwIfAborted();

  resolve(
    new Response(canStatusHaveBody(response.status) ? response.body : null, {
      status: response.status,
      headers: response.headers,
    }),
  );

  return promise;
}

interface RustHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | undefined;
}

interface RustHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

function canStatusHaveBody(status: number): boolean {
  // 1xx informational responses cannot have a body
  if (status >= 100 && status < 200) return false;

  // 204 No Content and 304 Not Modified cannot have a body
  if (status === 204 || status === 304) return false;

  return true;
}
