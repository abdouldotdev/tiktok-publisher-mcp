/**
 * TikTok Analytics and Stats API v2.
 * Official endpoints for user profile metrics and post performance stats.
 */
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
/**
 * Fetch creator statistics: followers, following, total likes, video count.
 */
export declare function getAccountStats(profile: string, account: string): Promise<AccountStats>;
/**
 * Query performance metrics for specific post IDs (views, likes, comments, shares).
 */
export declare function getPostStats(profile: string, account: string, postIds: string[]): Promise<PostMetrics[]>;
/**
 * List recent posts and their analytics for the connected account.
 */
export declare function listPosts(profile: string, account: string, maxCount?: number, cursor?: number): Promise<{
    videos: PostMetrics[];
    cursor?: number;
    has_more?: boolean;
}>;
