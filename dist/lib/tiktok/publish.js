/**
 * TikTok Content Posting API v2.
 * Official TikTok API client for photo and video publishing via PULL_FROM_URL.
 */
import { requestJson } from "../http.js";
import { getAccessToken } from "./oauth.js";
const BASE = "https://open.tiktokapis.com/v2";
function assertOk(error, context) {
    if (error && error.code && error.code !== "ok") {
        throw new Error(`${context} failed: [${error.code}] ${error.message ?? "unknown error"}`);
    }
}
export async function getCreatorInfo(profile, account) {
    const token = await getAccessToken(profile, account);
    const res = await requestJson({
        url: `${BASE}/post/publish/creator_info/query/`,
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: {},
    });
    assertOk(res.error, "creator_info query");
    const d = res.data ?? {};
    return {
        creatorAvatarUrl: d.creator_avatar_url,
        creatorUsername: d.creator_username,
        creatorNickname: d.creator_nickname,
        privacyLevelOptions: d.privacy_level_options,
        commentDisabled: d.comment_disabled,
        duetDisabled: d.duet_disabled,
        stitchDisabled: d.stitch_disabled,
        maxVideoPostDurationSec: d.max_video_post_duration_sec,
    };
}
export async function publishPhotos(profile, account, opts) {
    if (!opts.photo_images || opts.photo_images.length === 0) {
        throw new Error("photo_images must contain at least one image URL.");
    }
    // TikTok requires at least 2 images for a photo post.
    const images = opts.photo_images.length === 1
        ? [opts.photo_images[0], opts.photo_images[0]]
        : opts.photo_images;
    const coverIndex = Math.min(Math.max(opts.photo_cover_index ?? 0, 0), images.length - 1);
    const token = await getAccessToken(profile, account);
    const postMode = opts.post_mode ?? "MEDIA_UPLOAD";
    const res = await requestJson({
        url: `${BASE}/post/publish/content/init/`,
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: {
            post_info: {
                title: opts.title ?? "",
                description: opts.description ?? "",
                privacy_level: opts.privacy_level ?? "SELF_ONLY",
                disable_comment: opts.disable_comment ?? false,
                disable_duet: opts.disable_duet ?? false,
                disable_stitch: opts.disable_stitch ?? false,
                auto_add_music: opts.auto_add_music ?? true,
                brand_content_toggle: opts.brand_content_toggle ?? false,
                brand_organic_toggle: opts.brand_organic_toggle ?? false,
            },
            source_info: {
                source: "PULL_FROM_URL",
                photo_cover_index: coverIndex,
                photo_images: images,
            },
            post_mode: postMode,
            media_type: "PHOTO",
        },
        timeoutMs: 120_000,
    });
    assertOk(res.error, "publishPhotos init");
    const publishId = res.data?.publish_id;
    if (!publishId) {
        throw new Error(`publishPhotos init returned no publish_id: ${JSON.stringify(res)}`);
    }
    return { publish_id: publishId, account, post_mode: postMode };
}
export async function publishVideo(profile, account, opts) {
    if (!opts.video_url) {
        throw new Error("video_url is required.");
    }
    const token = await getAccessToken(profile, account);
    const postMode = opts.post_mode ?? "MEDIA_UPLOAD";
    const res = await requestJson({
        url: `${BASE}/post/publish/content/init/`,
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: {
            post_info: {
                title: opts.title ?? "",
                description: opts.description ?? "",
                privacy_level: opts.privacy_level ?? "SELF_ONLY",
                disable_comment: opts.disable_comment ?? false,
                disable_duet: opts.disable_duet ?? false,
                disable_stitch: opts.disable_stitch ?? false,
                brand_content_toggle: opts.brand_content_toggle ?? false,
                brand_organic_toggle: opts.brand_organic_toggle ?? false,
            },
            source_info: {
                source: "PULL_FROM_URL",
                video_url: opts.video_url,
                video_cover_timestamp_ms: opts.video_cover_timestamp_ms ?? 1000,
            },
            post_mode: postMode,
            media_type: "VIDEO",
        },
        timeoutMs: 120_000,
    });
    assertOk(res.error, "publishVideo init");
    const publishId = res.data?.publish_id;
    if (!publishId) {
        throw new Error(`publishVideo init returned no publish_id: ${JSON.stringify(res)}`);
    }
    return { publish_id: publishId, account, post_mode: postMode };
}
export async function getPublishStatus(profile, account, publishId) {
    const token = await getAccessToken(profile, account);
    const res = await requestJson({
        url: `${BASE}/post/publish/status/fetch/`,
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: { publish_id: publishId },
    });
    assertOk(res.error, "publish status fetch");
    const d = res.data ?? {};
    return {
        status: d.status,
        fail_reason: d.fail_reason,
        publicly_available_post_id: d.publicly_available_post_id ?? d.publicaly_available_post_id,
        uploaded_bytes: d.uploaded_bytes,
    };
}
//# sourceMappingURL=publish.js.map