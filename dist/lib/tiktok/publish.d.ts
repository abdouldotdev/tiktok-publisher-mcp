/**
 * TikTok Content Posting API v2.
 * Official TikTok API client for photo and video publishing via PULL_FROM_URL.
 */
export type PrivacyLevel = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
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
export declare function getCreatorInfo(profile: string, account: string): Promise<CreatorInfo>;
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
export declare function publishPhotos(profile: string, account: string, opts: PublishPhotosOptions): Promise<PublishResult>;
export declare function publishVideo(profile: string, account: string, opts: PublishVideoOptions): Promise<PublishResult>;
export interface PublishStatus {
    status?: string;
    fail_reason?: string;
    publicly_available_post_id?: string[];
    uploaded_bytes?: number;
}
export declare function getPublishStatus(profile: string, account: string, publishId: string): Promise<PublishStatus>;
