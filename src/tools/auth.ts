import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_PROFILE } from "../config.js";
import {
  authComplete,
  authStart,
  listAccounts,
  refreshAccount,
  removeAccount,
} from "../lib/tiktok/oauth.js";

export function registerAuthTools(server: McpServer): void {
  server.tool(
    "tiktok_auth_start",
    "Begin TikTok OAuth flow. Returns an authorization URL to open in a browser. TikTok will redirect back to redirectUri.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name (e.g. 'glowe', 'faithlock')."),
      account: z.string().describe("Identifier for this account (e.g. 'glowe_official', 'brand_us')."),
      redirectUri: z
        .string()
        .optional()
        .describe("Override redirect URI (defaults to the profile's redirectUri)."),
      scopes: z.array(z.string()).optional().describe("Custom TikTok permission scopes."),
      usePkce: z.boolean().optional().default(false).describe("Enable PKCE."),
    },
    async (args) => {
      const res = authStart(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                instructions:
                  "Open authorizeUrl in browser, approve permissions, then copy the URL you are redirected to and pass it to tiktok_auth_complete.",
                ...res,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_auth_complete",
    "Complete TikTok OAuth flow by providing the redirected URL (or code and state). Exchanges code for tokens and saves account.",
    {
      profile: z.string().optional().describe("Profile name if state cannot resolve it."),
      account: z.string().optional().describe("Account name if state cannot resolve it."),
      redirectUrl: z
        .string()
        .optional()
        .describe("The full redirect URL from the browser address bar after authorization."),
      code: z.string().optional().describe("Raw authorization code if extracted."),
      state: z.string().optional().describe("OAuth state string."),
      redirectUri: z.string().optional().describe("Must match redirectUri used in auth_start."),
    },
    async (args) => {
      const res = await authComplete(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Account '${res.account}' successfully connected for profile '${res.profile}'.`,
                ...res,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_accounts_list",
    "List all connected TikTok accounts for a given profile.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
    },
    async ({ profile }) => {
      const accounts = listAccounts(profile);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, accounts }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_account_refresh",
    "Manually refresh access tokens for a specific TikTok account.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Account identifier to refresh."),
    },
    async ({ profile, account }) => {
      const res = await refreshAccount(profile, account);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                profile,
                account,
                refreshed: true,
                expiresAt: res.expiresAt,
                refreshExpiresAt: res.refreshExpiresAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_account_remove",
    "Disconnect and remove a TikTok account from a profile.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Account identifier to remove."),
    },
    async ({ profile, account }) => {
      const removed = removeAccount(profile, account);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, removed }, null, 2),
          },
        ],
      };
    }
  );
}
