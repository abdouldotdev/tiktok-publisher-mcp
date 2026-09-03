import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_PROFILE } from "../config.js";
import { getCreatorInfo } from "../lib/tiktok/publish.js";
import { getAccountStats, getPostStats, listPosts } from "../lib/tiktok/stats.js";

export function registerStatsTools(server: McpServer): void {
  server.tool(
    "tiktok_creator_info",
    "Query creator permissions and publishing capabilities for a connected account.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
    },
    async ({ profile, account }) => {
      const info = await getCreatorInfo(profile, account);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, ...info }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_account_stats",
    "Fetch official profile metrics for a connected account (followers, following, likes, video count).",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
    },
    async ({ profile, account }) => {
      const stats = await getAccountStats(profile, account);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, ...stats }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_post_stats",
    "Fetch official performance stats (views, likes, comments, shares) for specific post IDs.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
      post_ids: z.array(z.string()).describe("Array of TikTok post / video IDs."),
    },
    async ({ profile, account, post_ids }) => {
      const metrics = await getPostStats(profile, account, post_ids);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, metrics }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "tiktok_posts_list",
    "List recent posts and their analytics for the connected TikTok account.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
      max_count: z.number().int().min(1).max(20).optional().default(20).describe("Max posts to return (up to 20)."),
      cursor: z.number().optional().describe("Pagination cursor timestamp in ms."),
    },
    async ({ profile, account, max_count, cursor }) => {
      const result = await listPosts(profile, account, max_count, cursor);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, ...result }, null, 2),
          },
        ],
      };
    }
  );
}
