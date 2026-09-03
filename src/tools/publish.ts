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
    "tiktok_publish_post",
    "Publish a post (photo carousel or video) to TikTok via official Content Posting API v2 (PULL_FROM_URL).",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name (e.g. 'glowe', 'faithlock')."),
      account: z.string().describe("Target TikTok account name."),
      photo_images: z
        .array(z.string())
        .optional()
        .describe("Array of image URLs for a photo carousel post. Provide either photo_images OR video_url."),
      video_url: z
        .string()
        .optional()
        .describe("Publicly reachable URL for a video post. Provide either photo_images OR video_url."),
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
        .describe("0-based index of cover image in photo_images."),
      video_cover_timestamp_ms: z
        .number()
        .int()
        .optional()
        .default(1000)
        .describe("Timestamp in ms to use for video cover frame."),
      disable_comment: z.boolean().optional().default(false).describe("Disable comments on post."),
      disable_duet: z.boolean().optional().default(false).describe("Disable duet."),
      disable_stitch: z.boolean().optional().default(false).describe("Disable stitch."),
      auto_add_music: z
        .boolean()
        .optional()
        .default(true)
        .describe("Allow TikTok to suggest trending background audio (for photo posts)."),
      brand_content_toggle: z.boolean().optional().default(false).describe("Commercial content disclosure."),
      brand_organic_toggle: z.boolean().optional().default(false).describe("Brand organic disclosure."),
    },
    async ({ profile, account, photo_images, video_url, ...options }) => {
      if (!photo_images && !video_url) {
        throw new Error("Provide either 'photo_images' (for a carousel) or 'video_url' (for a video).");
      }
      if (photo_images && video_url) {
        throw new Error("Cannot pass both 'photo_images' and 'video_url' in the same post.");
      }

      let res;
      let postType: "photo_carousel" | "video";

      if (photo_images && photo_images.length > 0) {
        postType = "photo_carousel";
        res = await publishPhotos(profile, account, {
          photo_images,
          ...options,
        });
      } else {
        postType = "video";
        res = await publishVideo(profile, account, {
          video_url: video_url!,
          ...options,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                postType,
                message:
                  options.post_mode === "MEDIA_UPLOAD"
                    ? "Post sent to creator TikTok inbox (draft review mode)."
                    : "Post initiated for direct publishing to feed.",
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
    "tiktok_publish_photos",
    "Convenience alias: Publish a photo carousel post to TikTok.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
      photo_images: z.array(z.string()).describe("Array of image URLs."),
      title: z.string().optional().describe("Post title."),
      description: z.string().optional().describe("Caption with hashtags."),
      post_mode: PostModeSchema.default("MEDIA_UPLOAD").describe("MEDIA_UPLOAD (draft) or DIRECT_POST."),
      privacy_level: PrivacyLevelSchema.default("PUBLIC_TO_EVERYONE").describe("Visibility level."),
      photo_cover_index: z.number().int().min(0).optional().default(0),
      disable_comment: z.boolean().optional().default(false),
      disable_duet: z.boolean().optional().default(false),
      disable_stitch: z.boolean().optional().default(false),
      auto_add_music: z.boolean().optional().default(true),
      brand_content_toggle: z.boolean().optional().default(false),
      brand_organic_toggle: z.boolean().optional().default(false),
    },
    async ({ profile, account, ...options }) => {
      const res = await publishPhotos(profile, account, options);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...res }, null, 2) }],
      };
    }
  );

  server.tool(
    "tiktok_publish_video",
    "Convenience alias: Publish a video post to TikTok.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("Target TikTok account name."),
      video_url: z.string().describe("Video URL."),
      title: z.string().optional().describe("Video title."),
      description: z.string().optional().describe("Caption with hashtags."),
      post_mode: PostModeSchema.default("MEDIA_UPLOAD").describe("MEDIA_UPLOAD (draft) or DIRECT_POST."),
      privacy_level: PrivacyLevelSchema.default("PUBLIC_TO_EVERYONE").describe("Visibility level."),
      video_cover_timestamp_ms: z.number().int().optional().default(1000),
      disable_comment: z.boolean().optional().default(false),
      disable_duet: z.boolean().optional().default(false),
      disable_stitch: z.boolean().optional().default(false),
      brand_content_toggle: z.boolean().optional().default(false),
      brand_organic_toggle: z.boolean().optional().default(false),
    },
    async ({ profile, account, ...options }) => {
      const res = await publishVideo(profile, account, options);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...res }, null, 2) }],
      };
    }
  );

  server.tool(
    "tiktok_publish_status",
    "Check processing and publishing status of a TikTok post by publish_id.",
    {
      profile: z.string().default(DEFAULT_PROFILE).describe("Profile name."),
      account: z.string().describe("TikTok account name."),
      publish_id: z.string().describe("Publish ID returned from tiktok_publish_post."),
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
