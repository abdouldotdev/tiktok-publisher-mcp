/**
 * TikTok Login Kit — authorization-code flow with persistent refresh.
 * Official TikTok API v2 OAuth flow with PKCE support and automated token refresh.
 */
import { TikTokAccount } from "../../config.js";
export declare const DEFAULT_SCOPES: string[];
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
export declare function authStart(opts: AuthStartOptions): AuthStartResult;
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
export declare function authComplete(opts: AuthCompleteOptions): Promise<AuthCompleteResult>;
export declare function saveAccount(profileName: string, account: string, data: TikTokAccount): void;
export declare function listAccounts(profileName: string): Array<{
    name: string;
    openId?: string;
    displayName?: string;
    scope?: string;
    expiresAt?: string;
    expired: boolean;
    refreshExpiresAt?: string;
}>;
export declare function removeAccount(profileName: string, account: string): boolean;
export declare function refreshAccount(profileName: string, account: string): Promise<TikTokAccount>;
export declare function getAccessToken(profileName: string, account: string): Promise<string>;
