/**
 * TikTok Login Kit — authorization-code flow with persistent refresh.
 * Official TikTok API v2 OAuth flow with PKCE support and automated token refresh.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  TikTokAccount,
  TikTokProfile,
  getProfile,
  homeDir,
  required,
  updateProfile,
  DEFAULT_REDIRECT_URI,
} from "../../config.js";
import { requestJson } from "../http.js";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

export const DEFAULT_SCOPES = [
  "user.info.basic",
  "user.info.stats",
  "video.publish",
  "video.upload",
  "video.list",
];

interface PendingAuth {
  profile: string;
  account: string;
  state: string;
  codeVerifier?: string;
  redirectUri: string;
  scopes: string[];
  createdAt: string;
}

function pendingPath(): string {
  return path.join(homeDir(), "pending-auth.json");
}

function readPending(): Record<string, PendingAuth> {
  const p = pendingPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function writePending(all: Record<string, PendingAuth>): void {
  fs.mkdirSync(homeDir(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(pendingPath(), JSON.stringify(all, null, 2), { mode: 0o600 });
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface AuthStartOptions {
  profile: string;
  account: string;
  redirectUri?: string;
  scopes?: string[];
  usePkce?: boolean;
}

export interface AuthStartResult {
  authorizeUrl: string;
  state: string;
  redirectUri: string;
  scopes: string[];
}

export function authStart(opts: AuthStartOptions): AuthStartResult {
  const profile = getProfile(opts.profile);
  const clientKey = required(profile.clientKey, "clientKey", opts.profile);
  const redirectUri = opts.redirectUri || profile.redirectUri || DEFAULT_REDIRECT_URI;
  const scopes = opts.scopes?.length ? opts.scopes : DEFAULT_SCOPES;
  const state = base64url(crypto.randomBytes(16));

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scopes.join(","),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  let codeVerifier: string | undefined;
  if (opts.usePkce) {
    codeVerifier = base64url(crypto.randomBytes(48));
    const challenge = crypto.createHash("sha256").update(codeVerifier).digest("hex");
    params.set("code_challenge", challenge);
    params.set("code_challenge_method", "S256");
  }

  const all = readPending();
  all[state] = {
    profile: opts.profile,
    account: opts.account,
    state,
    codeVerifier,
    redirectUri,
    scopes,
    createdAt: new Date().toISOString(),
  };
  writePending(all);

  return { authorizeUrl: `${AUTHORIZE_URL}?${params.toString()}`, state, redirectUri, scopes };
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function isoIn(seconds?: number): string | undefined {
  return seconds ? new Date(Date.now() + seconds * 1000).toISOString() : undefined;
}

export interface AuthCompleteOptions {
  profile?: string;
  account?: string;
  redirectUrl?: string;
  code?: string;
  state?: string;
  redirectUri?: string;
}

export interface AuthCompleteResult {
  profile: string;
  account: string;
  openId?: string;
  scope?: string;
  expiresAt?: string;
  displayName?: string;
}

export async function authComplete(opts: AuthCompleteOptions): Promise<AuthCompleteResult> {
  let code = opts.code;
  let state = opts.state;

  if (opts.redirectUrl) {
    const parsed = new URL(opts.redirectUrl);
    const err = parsed.searchParams.get("error");
    if (err) {
      throw new Error(
        `TikTok returned an error on redirect: ${err} — ${
          parsed.searchParams.get("error_description") ?? "no description"
        }`
      );
    }
    code = parsed.searchParams.get("code") ?? code;
    state = parsed.searchParams.get("state") ?? state;
  }
  if (!code) throw new Error("No authorization code — provide redirectUrl or code");

  code = decodeURIComponent(code);

  const all = readPending();
  const pending = state ? all[state] : undefined;
  if (state && !pending) {
    throw new Error(
      `Unknown state "${state}" — not issued by tiktok_auth_start on this machine, or pending record was cleared.`
    );
  }

  const profileName = opts.profile ?? pending?.profile;
  const account = opts.account ?? pending?.account;
  if (!profileName) throw new Error("Cannot resolve profile — pass profile explicitly");
  if (!account) throw new Error("Cannot resolve account name — pass account explicitly");

  const profile = getProfile(profileName);
  const clientKey = required(profile.clientKey, "clientKey", profileName);
  const clientSecret = required(profile.clientSecret, "clientSecret", profileName);
  const redirectUri = opts.redirectUri || pending?.redirectUri || profile.redirectUri || DEFAULT_REDIRECT_URI;

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  if (pending?.codeVerifier) body.set("code_verifier", pending.codeVerifier);

  const res = await requestJson<TokenResponse>({
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (res.error || !res.access_token) {
    throw new Error(
      `Token exchange failed: ${res.error ?? "no access_token"} — ${res.error_description ?? ""}`
    );
  }

  const stored: TikTokAccount = {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: isoIn(res.expires_in),
    refreshExpiresAt: isoIn(res.refresh_expires_in),
    openId: res.open_id,
    scope: res.scope,
  };

  let displayName: string | undefined;
  try {
    displayName = await fetchDisplayName(res.access_token);
    stored.displayName = displayName;
  } catch {
    // user.info.basic may not be granted
  }

  saveAccount(profileName, account, stored);

  if (state) {
    delete all[state];
    writePending(all);
  }

  return {
    profile: profileName,
    account,
    openId: res.open_id,
    scope: res.scope,
    expiresAt: stored.expiresAt,
    displayName,
  };
}

async function fetchDisplayName(accessToken: string): Promise<string | undefined> {
  const res = await requestJson<{ data?: { user?: { display_name?: string } } }>({
    url: `${USERINFO_URL}?fields=open_id,display_name`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res?.data?.user?.display_name;
}

export function saveAccount(profileName: string, account: string, data: TikTokAccount): void {
  updateProfile(profileName, (prev) => ({
    ...prev,
    accounts: {
      ...(prev.accounts ?? {}),
      [account]: { ...(prev.accounts?.[account] ?? {}), ...data },
    },
  }));
}

export function listAccounts(profileName: string): Array<{
  name: string;
  openId?: string;
  displayName?: string;
  scope?: string;
  expiresAt?: string;
  expired: boolean;
  refreshExpiresAt?: string;
}> {
  const accounts = getProfile(profileName).accounts ?? {};
  return Object.entries(accounts).map(([name, a]) => ({
    name,
    openId: a.openId,
    displayName: a.displayName,
    scope: a.scope,
    expiresAt: a.expiresAt,
    expired: !!a.expiresAt && new Date(a.expiresAt) <= new Date(),
    refreshExpiresAt: a.refreshExpiresAt,
  }));
}

export function removeAccount(profileName: string, account: string): boolean {
  const accounts = { ...(getProfile(profileName).accounts ?? {}) };
  if (!(account in accounts)) return false;
  delete accounts[account];
  updateProfile(profileName, (prev) => ({ ...prev, accounts }));
  return true;
}

export async function refreshAccount(
  profileName: string,
  account: string
): Promise<TikTokAccount> {
  const profile = getProfile(profileName);
  const current = profile.accounts?.[account];
  if (!current) throw new Error(`Account "${account}" not found in profile "${profileName}"`);
  if (!current.refreshToken) {
    throw new Error(`Account "${account}" has no refresh_token — re-run tiktok_auth_start`);
  }

  const clientKey = required(profile.clientKey, "clientKey", profileName);
  const clientSecret = required(profile.clientSecret, "clientSecret", profileName);

  const res = await requestJson<TokenResponse>({
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    }).toString(),
  });

  if (res.error || !res.access_token) {
    throw new Error(
      `Refresh failed for "${account}": ${res.error ?? "no access_token"} — ${res.error_description ?? ""}. Re-run tiktok_auth_start.`
    );
  }

  const updated: TikTokAccount = {
    ...current,
    accessToken: res.access_token,
    refreshToken: res.refresh_token ?? current.refreshToken,
    expiresAt: isoIn(res.expires_in) ?? current.expiresAt,
    refreshExpiresAt: isoIn(res.refresh_expires_in) ?? current.refreshExpiresAt,
    scope: res.scope ?? current.scope,
  };
  saveAccount(profileName, account, updated);
  return updated;
}

export async function getAccessToken(profileName: string, account: string): Promise<string> {
  const current = getProfile(profileName).accounts?.[account];
  if (!current) {
    throw new Error(
      `Account "${account}" not found in profile "${profileName}". Run tiktok_auth_start first.`
    );
  }
  const expiringSoon =
    !!current.expiresAt && new Date(current.expiresAt).getTime() < Date.now() + 60_000;
  if (expiringSoon) return (await refreshAccount(profileName, account)).accessToken;
  return current.accessToken;
}
