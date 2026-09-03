/** Small fetch helpers shared by the provider clients. */
export declare class HttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(message: string, status: number, body: unknown);
}
export interface JsonRequest {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
}
export declare function requestJson<T = unknown>(req: JsonRequest): Promise<T>;
export declare function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response>;
export declare function truncate(s: string, n: number): string;
export declare const sleep: (ms: number) => Promise<void>;
/** Download a URL to disk, following redirects (fetch does this by default). */
export declare function downloadToFile(url: string, dest: string, timeoutMs?: number): Promise<string>;
/** Write a base64 payload (data URI or bare base64) to disk. */
export declare function writeBase64ToFile(b64: string, dest: string): string;
