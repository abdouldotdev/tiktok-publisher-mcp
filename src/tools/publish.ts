import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_PROFILE } from "../config.js";
import {
  getPublishStatus,
  publishPhotos,
  publishVideo,
} from "../lib/tiktok/publish.js";

const PrivacyLevelSchema = z.enum([
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
]);

const PostModeSchema = z.enum(["MEDIA_UPLOAD", "DIRECT_POST"]);

export function registerPublishTools(server: McpServer): void {
  server.tool(
    "tiktok_publish_photos",
    "Publish a photo carousel post to TikTok via official Content Posting API v2 (PULL_FROM_URL).",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name (e.g. 'glowe', 'faithlock')."),
      account: z.string().describe("Target TikTok account name."),
      photo_images: z
        .array(z.string())
        .describe("Array of publicly accessible image URLs (from Cloudflare R2, S3, etc.)."),
      title: z.string().optional().describe("Post title / cover text."),
      description: z.string().optional().describe("Caption / post description with hashtags."),
      post_mode: PostModeSchema.default("MEDIA_UPLOAD").describe(
        "MEDIA_UPLOAD = drafts to creator inbox for review; DIRECT_POST = publishes directly live to feed."
      ),
      privacy_level: PrivacyLevelSchema.default("PUBLIC_TO_EVERYONE").describe(
        "Visibility: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, or SELF_ONLY."
      ),
      photo_cover_index: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("0-based index of the cover image in photo_images."),
      disable_comment: z.boolean().optional().default(false).describe("Disable comments on post."),
      disable_duet: z.boolean().optional().default(false).describe("Disable duet."),
      disable_stitch: z.boolean().optional().default(false).describe("Disable stitch."),
      auto_add_music: z
        .boolean()
        .optional()
        .default(true)
        .describe("Allow TikTok to suggest trending background audio."),
      brand_content_toggle: z.boolean().optional().default(false).describe("Commercial content disclosure."),
      brand_organic_toggle: z.boolean().optional().default(false).describe("Brand organic disclosure."),
    },
    async ({ profile, account, ...options }) => {
      const res = await publishPhotos(profile, account, options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message:
                  options.post_mode === "MEDIA_UPLOAD"
                    ? "Photo post sent to creator TikTok inbox (draft review mode)."
                    : "Photo post initiated for direct publishing.",
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
    "tiktok_publish_video",
    "Publish a video to TikTok via official Content Posting API v2 (PULL_FROM_URL).",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
      video_url: z.string().describe("Publicly reachable video URL (MP4, etc.)."),
      title: z.string().optional().describe("Video title."),
      description: z.string().optional().describe("Caption with hashtags."),
      post_mode: PostModeSchema.default("MEDIA_UPLOAD").describe(
        "MEDIA_UPLOAD = drafts to inbox; DIRECT_POST = publishes directly to profile."
      ),
      privacy_level: PrivacyLevelSchema.default("PUBLIC_TO_EVERYONE").describe(
        "Visibility: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, or SELF_ONLY."
      ),
      video_cover_timestamp_ms: z
        .number()
        .int()
        .optional()
        .default(1000)
        .describe("Timestamp in ms to use for video cover frame."),
      disable_comment: z.boolean().optional().default(false).describe("Disable comments."),
      disable_duet: z.boolean().optional().default(false).describe("Disable duet."),
      disable_stitch: z.boolean().optional().default(false).describe("Disable stitch."),
      brand_content_toggle: z.boolean().optional().default(false).describe("Commercial content disclosure."),
      brand_organic_toggle: z.boolean().optional().default(false).describe("Brand organic disclosure."),
    },
    async ({ profile, account, ...options }) => {
      const res = await publishVideo(profile, account, options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message:
                  options.post_mode === "MEDIA_UPLOAD"
                    ? "Video post sent to creator TikTok inbox (draft review mode)."
                    : "Video post initiated for direct publishing.",
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
    "tiktok_publish_status",
    "Check processing and publishing status of a TikTok post by publish_id.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("TikTok account name."),
      publish_id: z.string().describe("Publish ID returned from publish_photos or publish_video."),
    },
    async ({ profile, account, publish_id }) => {
      const status = await getPublishStatus(profile, account, publish_id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ profile, account, publish_id, ...status }, null, 2),
          },
        ],
      };
    }
  );
}
