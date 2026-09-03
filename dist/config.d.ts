/**
 * TikTok Farm MCP — Profile and credentials store.
 *
 * Each profile corresponds to an app or brand (e.g. "glowe", "faithlock", "autoviral").
 * Accounts are stored per profile with persistent OAuth tokens and auto-refresh.
 *
 * Storage: $TIKTOK_FARM_HOME/profiles.json (default ~/.tiktok-farm-mcp/profiles.json)
 */
export declare const DEFAULT_REDIRECT_URI = "https://auto-viral.com/auth/tiktok/callback";
export declare const DEFAULT_PROFILE = "default";
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
export declare function homeDir(): string;
export declare function readStore(): ProfileStore;
export declare function writeStore(store: ProfileStore): void;
export declare function getProfile(name?: string): TikTokProfile;
export declare function updateProfile(name: string, updater: (prev: TikTokProfile) => TikTokProfile): TikTokProfile;
export declare function deleteProfile(name: string): boolean;
export declare function listProfiles(): Array<{
    name: string;
    hasClientKey: boolean;
    redirectUri: string;
    accounts: string[];
}>;
export declare function required<T>(value: T | undefined | null, field: string, profile: string): T;
