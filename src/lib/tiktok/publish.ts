import fs from "fs";
import { requestJson } from "../http.js";
import { getAccessToken } from "./oauth.js";

const BASE = "https://open.tiktokapis.com/v2";

export type PrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export type PostMode = "MEDIA_UPLOAD" | "DIRECT_POST";

export interface CreatorInfo {
  creatorAvatarUrl?: string;
  creatorUsername?: string;
  creatorNickname?: string;
  privacyLevelOptions?: string[];
  commentDisabled?: boolean;
  duetDisabled?: boolean;
  stitchDisabled?: boolean;
  maxVideoPostDurationSec?: number;
}

interface CreatorInfoResponse {
  data?: {
    creator_avatar_url?: string;
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  };
  error?: { code?: string; message?: string };
}

function assertOk(error: { code?: string; message?: string } | undefined, context: string): void {
  if (error && error.code && error.code !== "ok") {
    if (error.code === "url_ownership_unverified") {
      throw new Error(
        `${context} failed: [url_ownership_unverified] TikTok requires domain verification for PULL_FROM_URL. Go to TikTok for Developers > App > Products > Content Posting API > Web Domain Verification and add your hosting domain (or use FILE_UPLOAD for local files).`
      );
    }
    if (error.code === "scope_not_authorized") {
      throw new Error(
        `${context} failed: [scope_not_authorized] Missing required TikTok permission scope. Re-authorize your account with the required scopes.`
      );
    }
    throw new Error(`${context} failed: [${error.code}] ${error.message ?? "unknown error"}`);
  }
}

export async function getCreatorInfo(profile: string, account: string): Promise<CreatorInfo> {
  const token = await getAccessToken(profile, account);
  const res = await requestJson<CreatorInfoResponse>({
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

export interface PublishPhotosOptions {
  photo_images: string[];
  title?: string;
  description?: string;
  privacy_level?: PrivacyLevel;
  photo_cover_index?: number;
  disable_comment?: boolean;
  disable_duet?: boolean;
  disable_stitch?: boolean;
  auto_add_music?: boolean;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
  post_mode?: PostMode;
}

export interface PublishVideoOptions {
  video_url: string;
  source?: "PULL_FROM_URL" | "FILE_UPLOAD";
  title?: string;
  description?: string;
  privacy_level?: PrivacyLevel;
  video_cover_timestamp_ms?: number;
  disable_comment?: boolean;
  disable_duet?: boolean;
  disable_stitch?: boolean;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
  post_mode?: PostMode;
}

export interface PublishResult {
  publish_id: string;
  account: string;
  post_mode: PostMode;
}

interface InitResponse {
  data?: { publish_id?: string; upload_url?: string };
  error?: { code?: string; message?: string };
}

export async function publishPhotos(
  profile: string,
  account: string,
  opts: PublishPhotosOptions
): Promise<PublishResult> {
  if (!opts.photo_images || opts.photo_images.length === 0) {
    throw new Error("photo_images must contain at least one image URL.");
  }

  // TikTok requires at least 2 images for a photo post.
  const images =
    opts.photo_images.length === 1
      ? [opts.photo_images[0], opts.photo_images[0]]
      : opts.photo_images;

  const coverIndex = Math.min(
    Math.max(opts.photo_cover_index ?? 0, 0),
    images.length - 1
  );
  const token = await getAccessToken(profile, account);
  const postMode: PostMode = opts.post_mode ?? "MEDIA_UPLOAD";

  const res = await requestJson<InitResponse>({
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

export async function publishVideo(
  profile: string,
  account: string,
  opts: PublishVideoOptions
): Promise<PublishResult> {
  if (!opts.video_url) {
    throw new Error("video_url is required.");
  }

  const token = await getAccessToken(profile, account);
  const postMode: PostMode = opts.post_mode ?? "MEDIA_UPLOAD";

  // Auto-detect FILE_UPLOAD if video_url is a local file path
  const isLocalFile = fs.existsSync(opts.video_url);
  const sourceMode = opts.source ?? (isLocalFile ? "FILE_UPLOAD" : "PULL_FROM_URL");

  let fileSize = 0;
  let fileBuffer: Buffer | null = null;
  if (sourceMode === "FILE_UPLOAD") {
    if (!isLocalFile) {
      throw new Error(`FILE_UPLOAD mode requires a valid local file path: '${opts.video_url}'`);
    }
    const stat = fs.statSync(opts.video_url);
    fileSize = stat.size;
    fileBuffer = fs.readFileSync(opts.video_url);
  }

  // Official TikTok API:
  // MEDIA_UPLOAD (draft inbox) -> /v2/post/publish/inbox/video/init/
  // DIRECT_POST (feed publish)  -> /v2/post/publish/video/init/
  const initEndpoint =
    postMode === "MEDIA_UPLOAD"
      ? `${BASE}/post/publish/inbox/video/init/`
      : `${BASE}/post/publish/video/init/`;

  const sourceInfo =
    sourceMode === "FILE_UPLOAD"
      ? {
          source: "FILE_UPLOAD",
          video_size: fileSize,
          chunk_size: fileSize,
          total_chunk_count: 1,
        }
      : {
          source: "PULL_FROM_URL",
          video_url: opts.video_url,
        };

  const res = await requestJson<InitResponse>({
    url: initEndpoint,
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
        video_cover_timestamp_ms: opts.video_cover_timestamp_ms ?? 1000,
        brand_content_toggle: opts.brand_content_toggle ?? false,
        brand_organic_toggle: opts.brand_organic_toggle ?? false,
      },
      source_info: sourceInfo,
    },
    timeoutMs: 120_000,
  });

  assertOk(res.error, "publishVideo init");
  const publishId = res.data?.publish_id;
  if (!publishId) {
    throw new Error(`publishVideo init returned no publish_id: ${JSON.stringify(res)}`);
  }

  // If FILE_UPLOAD, stream binary data to TikTok upload_url
  if (sourceMode === "FILE_UPLOAD" && res.data?.upload_url && fileBuffer) {
    const uploadRes = await fetch(res.data.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
        "Content-Length": String(fileSize),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      throw new Error(`Failed to upload video binary to TikTok: ${uploadRes.status} ${errText}`);
    }
  }

  return { publish_id: publishId, account, post_mode: postMode };
}

export interface PublishStatus {
  status?: string;
  fail_reason?: string;
  publicly_available_post_id?: string[];
  uploaded_bytes?: number;
}

interface StatusResponse {
  data?: {
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    publicly_available_post_id?: string[];
    uploaded_bytes?: number;
  };
  error?: { code?: string; message?: string };
}

export async function getPublishStatus(
  profile: string,
  account: string,
  publishId: string
): Promise<PublishStatus> {
  const token = await getAccessToken(profile, account);
  const res = await requestJson<StatusResponse>({
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
