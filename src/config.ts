/**
 * TikTok Farm MCP — Profile and credentials store.
 *
 * Each profile corresponds to an app or brand (e.g. "glowe", "faithlock", "autoviral").
 * Accounts are stored per profile with persistent OAuth tokens and auto-refresh.
 *
 * Storage: $TIKTOK_FARM_HOME/profiles.json (default ~/.tiktok-farm-mcp/profiles.json)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const DEFAULT_REDIRECT_URI = "https://auto-viral.com/auth/tiktok/callback";
export const DEFAULT_PROFILE = "default";

export interface TikTokAccount {
  accessToken: string;
  refreshToken?: string;
  /** ISO-8601 */
  expiresAt?: string;
  refreshExpiresAt?: string;
  openId?: string;
  scope?: string;
  displayName?: string;
}

export interface TikTokProfile {
  clientKey?: string;
  clientSecret?: string;
  redirectUri?: string;
  accounts?: Record<string, TikTokAccount>;
}

export type ProfileStore = Record<string, TikTokProfile>;

export function homeDir(): string {
  return process.env.TIKTOK_FARM_HOME || path.join(os.homedir(), ".tiktok-farm-mcp");
}

function storePath(): string {
  return path.join(homeDir(), "profiles.json");
}

export function readStore(): ProfileStore {
  const p = storePath();
  if (!fs.existsSync(p)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
    return parsed && typeof parsed === "object" ? (parsed as ProfileStore) : {};
  } catch (err) {
    throw new Error(
      `Profile store at ${p} is not valid JSON (${(err as Error).message}). Fix or delete the file.`
    );
  }
}

export function writeStore(store: ProfileStore): void {
  const dir = homeDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = storePath();
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
  fs.chmodSync(p, 0o600);
}

function envFallbackProfile(): TikTokProfile {
  const e = process.env;
  return {
    clientKey: e.TIKTOK_CLIENT_KEY,
    clientSecret: e.TIKTOK_CLIENT_SECRET,
    redirectUri: e.TIKTOK_REDIRECT_URI || DEFAULT_REDIRECT_URI,
  };
}

export function getProfile(name: string = DEFAULT_PROFILE): TikTokProfile {
  const store = readStore();
  const stored = store[name] ?? {};
  const env = name === DEFAULT_PROFILE ? envFallbackProfile() : {};

  return {
    clientKey: stored.clientKey ?? env.clientKey,
    clientSecret: stored.clientSecret ?? env.clientSecret,
    redirectUri: stored.redirectUri ?? env.redirectUri ?? DEFAULT_REDIRECT_URI,
    accounts: stored.accounts ?? {},
  };
}

export function updateProfile(
  name: string,
  updater: (prev: TikTokProfile) => TikTokProfile
): TikTokProfile {
  const store = readStore();
  const prev = store[name] ?? { redirectUri: DEFAULT_REDIRECT_URI, accounts: {} };
  const next = updater(prev);
  store[name] = next;
  writeStore(store);
  return next;
}

export function deleteProfile(name: string): boolean {
  const store = readStore();
  if (!(name in store)) return false;
  delete store[name];
  writeStore(store);
  return true;
}

export function listProfiles(): Array<{
  name: string;
  hasClientKey: boolean;
  redirectUri: string;
  accounts: string[];
}> {
  const store = readStore();
  const names = Array.from(new Set([...Object.keys(store), DEFAULT_PROFILE]));

  return names.map((n) => {
    const p = getProfile(n);
    return {
      name: n,
      hasClientKey: Boolean(p.clientKey),
      redirectUri: p.redirectUri || DEFAULT_REDIRECT_URI,
      accounts: Object.keys(p.accounts ?? {}),
    };
  });
}

export function required<T>(value: T | undefined | null, field: string, profile: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Missing required configuration '${field}' for profile '${profile}'. Set it using tiktok_profile_set.`
    );
  }
  return value;
}
