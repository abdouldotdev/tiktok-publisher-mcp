import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  DEFAULT_PROFILE,
  DEFAULT_REDIRECT_URI,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
} from "../config.js";

export function registerProfileTools(server: McpServer): void {
  server.tool(
    "tiktok_profile_set",
    "Configure credentials and settings for a project profile (e.g. 'project_name').",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name to create or update (e.g. 'project_name')."),
      clientKey: z.string().optional().describe("TikTok developer app Client Key."),
      clientSecret: z.string().optional().describe("TikTok developer app Client Secret."),
      redirectUri: z
        .string()
        .optional()
        .default(DEFAULT_REDIRECT_URI)
        .describe("Must match a redirect URI registered in the TikTok developer portal."),
    },
    async ({ profile, clientKey, clientSecret, redirectUri }) => {
      const updated = updateProfile(profile, (prev) => ({
        ...prev,
        clientKey: clientKey ?? prev.clientKey,
        clientSecret: clientSecret ?? prev.clientSecret,
        redirectUri: redirectUri ?? prev.redirectUri ?? DEFAULT_REDIRECT_URI,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                profile,
                clientKey: updated.clientKey ? `...${updated.clientKey.slice(-4)}` : undefined,
                redirectUri: updated.redirectUri,
                accountsCount: Object.keys(updated.accounts ?? {}).length,
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
    "tiktok_profile_get",
    "View configuration for a profile with secrets redacted.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
    },
    async ({ profile }) => {
      const p = getProfile(profile);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                profile,
                clientKey: p.clientKey ? `...${p.clientKey.slice(-4)}` : undefined,
                clientSecret: p.clientSecret ? "configured" : "missing",
                redirectUri: p.redirectUri,
                accounts: Object.keys(p.accounts ?? {}),
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
    "tiktok_profile_list",
    "List all configured profiles in the TikTok farm.",
    {},
    async () => {
      const profiles = listProfiles();
      return {
        content: [{ type: "text", text: JSON.stringify({ profiles }, null, 2) }],
      };
    }
  );

  server.tool(
    "tiktok_profile_delete",
    "Delete a profile and all its stored accounts.",
    {
      profile: z.string().describe("Profile name to delete."),
    },
    async ({ profile }) => {
      const deleted = deleteProfile(profile);
      return {
        content: [{ type: "text", text: JSON.stringify({ profile, deleted }, null, 2) }],
      };
    }
  );
}
