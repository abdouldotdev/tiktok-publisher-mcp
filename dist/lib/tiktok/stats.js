/**
 * TikTok Analytics and Stats API v2.
 * Official endpoints for user profile metrics and post performance stats.
 */
import { requestJson } from "../http.js";
import { getAccessToken } from "./oauth.js";
const BASE = "https://open.tiktokapis.com/v2";
function assertOk(error, context) {
    if (error && error.code && error.code !== "ok") {
        throw new Error(`${context} failed: [${error.code}] ${error.message ?? "unknown error"}`);
    }
}
/**
 * Fetch creator statistics: followers, following, total likes, video count.
 */
export async function getAccountStats(profile, account) {
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
    const res = await requestJson({
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
export async function getPostStats(profile, account, postIds) {
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
    const res = await requestJson({
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
export async function listPosts(profile, account, maxCount = 20, cursor) {
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
    const body = { max_count: Math.min(Math.max(maxCount, 1), 20) };
    if (cursor !== undefined)
        body.cursor = cursor;
    const res = await requestJson({
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
//# sourceMappingURL=stats.js.map