/**
 * TikTok Analytics and Stats API v2.
 * Official endpoints for user profile metrics and post performance stats.
 */

import { requestJson } from "../http.js";
import { getAccessToken } from "./oauth.js";

const BASE = "https://open.tiktokapis.com/v2";

export interface AccountStats {
  open_id?: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

interface AccountStatsResponse {
  data?: {
    user?: AccountStats;
  };
  error?: { code?: string; message?: string };
}

export interface PostMetrics {
  id: string;
  title?: string;
  video_description?: string;
  create_time?: number;
  share_url?: string;
  cover_image_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

interface VideoQueryResponse {
  data?: {
    videos?: PostMetrics[];
  };
  error?: { code?: string; message?: string };
}

interface VideoListResponse {
  data?: {
    videos?: PostMetrics[];
    cursor?: number;
    has_more?: boolean;
  };
  error?: { code?: string; message?: string };
}

function assertOk(error: { code?: string; message?: string } | undefined, context: string): void {
  if (error && error.code && error.code !== "ok") {
    throw new Error(`${context} failed: [${error.code}] ${error.message ?? "unknown error"}`);
  }
}

/**
 * Fetch creator statistics: followers, following, total likes, video count.
 */
export async function getAccountStats(profile: string, account: string): Promise<AccountStats> {
  const token = await getAccessToken(profile, account);
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  const res = await requestJson<AccountStatsResponse>({
    url: `${BASE}/user/info/?fields=${fields}`,
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  assertOk(res.error, "user/info stats");
  return res.data?.user ?? {};
}

/**
 * Query performance metrics for specific post IDs (views, likes, comments, shares).
 */
export async function getPostStats(
  profile: string,
  account: string,
  postIds: string[]
): Promise<PostMetrics[]> {
  if (!postIds || postIds.length === 0) {
    throw new Error("postIds array cannot be empty.");
  }

  const token = await getAccessToken(profile, account);
  const fields = [
    "id",
    "title",
    "video_description",
    "create_time",
    "share_url",
    "cover_image_url",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
  ].join(",");

  const res = await requestJson<VideoQueryResponse>({
    url: `${BASE}/video/query/?fields=${fields}`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: {
      filters: {
        video_ids: postIds,
      },
    },
  });

  assertOk(res.error, "video/query stats");
  return res.data?.videos ?? [];
}

/**
 * List recent posts and their analytics for the connected account.
 */
export async function listPosts(
  profile: string,
  account: string,
  maxCount = 20,
  cursor?: number
): Promise<{ videos: PostMetrics[]; cursor?: number; has_more?: boolean }> {
  const token = await getAccessToken(profile, account);
  const fields = [
    "id",
    "title",
    "video_description",
    "create_time",
    "share_url",
    "cover_image_url",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
  ].join(",");

  const body: Record<string, unknown> = { max_count: Math.min(Math.max(maxCount, 1), 20) };
  if (cursor !== undefined) body.cursor = cursor;

  const res = await requestJson<VideoListResponse>({
    url: `${BASE}/video/list/?fields=${fields}`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body,
  });

  assertOk(res.error, "video/list query");
  return {
    videos: res.data?.videos ?? [],
    cursor: res.data?.cursor,
    has_more: res.data?.has_more,
  };
}
