import QRCode from "qrcode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requestJson } from "../lib/http.js";
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
    "Begin TikTok OAuth flow. Returns an authorization URL and a scannable QR code to open directly on your mobile phone or browser.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name (e.g. 'project_name')."),
      account: z.string().describe("Identifier for this account (e.g. 'main_account', 'brand_us')."),
      redirectUri: z
        .string()
        .optional()
        .describe("Override redirect URI (defaults to the profile's redirectUri)."),
      scopes: z.array(z.string()).optional().describe("Custom TikTok permission scopes."),
      usePkce: z.boolean().optional().default(false).describe("Enable PKCE."),
    },
    async (args) => {
      const res = authStart(args);

      let qrCodeAscii = "";
      try {
        qrCodeAscii = await QRCode.toString(res.authorizeUrl, {
          type: "terminal",
          small: true,
        });
      } catch (err) {
        qrCodeAscii = `(QR generation error: ${(err as Error).message})`;
      }

      const responseText = [
        "📱 SCAN TO AUTHORIZE TIKTOK ON YOUR PHONE:",
        "\n" + qrCodeAscii,
        "Or click the authorization URL in your browser:",
        res.authorizeUrl,
        "\nNext steps:",
        "1. Approve access on TikTok (on phone or browser).",
        "2. The browser will land on your callback URL (https://auto-viral.com/auth/tiktok/callback).",
        "3. Copy that full redirected URL and pass it to 'tiktok_auth_complete'.",
        "\nOAuth Details:",
        JSON.stringify(res, null, 2),
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_auth_wait",
    "Wait for the user to scan the QR code and approve on their phone. Automatically catches the code from the auto-viral.com relay and connects the account without any copy-paste.",
    {
      state: z.string().describe("OAuth state string from tiktok_auth_start."),
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Account identifier."),
      timeoutSec: z
        .number()
        .int()
        .min(5)
        .max(120)
        .optional()
        .default(60)
        .describe("Max seconds to wait for mobile scan."),
    },
    async ({ state, profile, account, timeoutSec = 60 }) => {
      const pollEndpoints = [
        `https://auto-viral.com/api/auth/tiktok/poll?state=${encodeURIComponent(state)}`,
        `https://auto-viral-sage.vercel.app/api/auth/tiktok/poll?state=${encodeURIComponent(state)}`,
      ];

      const startTime = Date.now();
      const maxMs = timeoutSec * 1000;

      while (Date.now() - startTime < maxMs) {
        for (const url of pollEndpoints) {
          try {
            const res = await requestJson<{ found: boolean; code: string | null }>({
              url,
              timeoutMs: 4000,
            });

            if (res && res.found && res.code) {
              const completeResult = await authComplete({
                profile,
                account,
                code: res.code,
                state,
              });

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        success: true,
                        message: `🎉 TikTok account '${account}' connected automatically from phone scan!`,
                        ...completeResult,
                      },
                      null,
                      2
                    ),
                  },
                ],
              };
            }
          } catch {
            // Ignore transient network errors during polling
          }
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                message:
                  "Timed out waiting for mobile scan. Run 'tiktok_auth_wait' again, or paste the redirected URL into 'tiktok_auth_complete'.",
                state,
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
