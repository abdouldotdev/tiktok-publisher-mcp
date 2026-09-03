/** Small fetch helpers shared by the provider clients. */

import fs from "node:fs";
import path from "node:path";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface JsonRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export async function requestJson<T = unknown>(req: JsonRequest): Promise<T> {
  const { url, method = "GET", headers = {}, body, timeoutMs = 60_000 } = req;

  const init: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    if (typeof body === "string") {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      (init.headers as Record<string, string>)["Content-Type"] ??= "application/json";
    }
  }

  const res = await fetchWithTimeout(url, init, timeoutMs);
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep the raw text — some errors come back as HTML */
  }

  if (!res.ok) {
    throw new HttpError(
      `${method} ${url} failed with ${res.status}: ${truncate(text, 500)}`,
      res.status,
      parsed,
    );
  }
  return parsed as T;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Download a URL to disk, following redirects (fetch does this by default). */
export async function downloadToFile(
  url: string,
  dest: string,
  timeoutMs = 120_000,
): Promise<string> {
  const res = await fetchWithTimeout(url, {}, timeoutMs);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

/** Write a base64 payload (data URI or bare base64) to disk. */
export function writeBase64ToFile(b64: string, dest: string): string {
  const bare = b64.startsWith("data:") ? b64.slice(b64.indexOf(",") + 1) : b64;
  fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(bare, "base64"));
  return dest;
}
