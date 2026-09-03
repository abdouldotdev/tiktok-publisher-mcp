/** Small fetch helpers shared by the provider clients. */
import fs from "node:fs";
import path from "node:path";
export class HttpError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "HttpError";
    }
}
export async function requestJson(req) {
    const { url, method = "GET", headers = {}, body, timeoutMs = 60_000 } = req;
    const init = { method, headers: { ...headers } };
    if (body !== undefined) {
        if (typeof body === "string") {
            init.body = body;
        }
        else {
            init.body = JSON.stringify(body);
            init.headers["Content-Type"] ??= "application/json";
        }
    }
    const res = await fetchWithTimeout(url, init, timeoutMs);
    const text = await res.text();
    let parsed = text;
    try {
        parsed = text ? JSON.parse(text) : null;
    }
    catch {
        /* keep the raw text — some errors come back as HTML */
    }
    if (!res.ok) {
        throw new HttpError(`${method} ${url} failed with ${res.status}: ${truncate(text, 500)}`, res.status, parsed);
    }
    return parsed;
}
export async function fetchWithTimeout(url, init, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
        }
        throw err;
    }
    finally {
        clearTimeout(timer);
    }
}
export function truncate(s, n) {
    return s.length <= n ? s : `${s.slice(0, n)}…`;
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Download a URL to disk, following redirects (fetch does this by default). */
export async function downloadToFile(url, dest, timeoutMs = 120_000) {
    const res = await fetchWithTimeout(url, {}, timeoutMs);
    if (!res.ok)
        throw new Error(`Download failed (${res.status}) for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
    fs.writeFileSync(dest, buf);
    return dest;
}
/** Write a base64 payload (data URI or bare base64) to disk. */
export function writeBase64ToFile(b64, dest) {
    const bare = b64.startsWith("data:") ? b64.slice(b64.indexOf(",") + 1) : b64;
    fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(bare, "base64"));
    return dest;
}
//# sourceMappingURL=http.js.map