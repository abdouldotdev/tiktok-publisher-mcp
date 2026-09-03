# tiktok-publisher-mcp

Universal, reusable MCP server for automated TikTok operations:
- **Profiles & Credentials**: Multi-tenant isolation (`project_name`).
- **Authentication**: Official OAuth v2 with persistent token store & automatic refresh.
- **Publishing**: Official Content Posting API v2 for photo carousels (`PULL_FROM_URL`) and videos, with draft (`MEDIA_UPLOAD`) or direct (`DIRECT_POST`) options.
- **Analytics & Stats**: Real-time creator permissions, account metrics, and post performance stats.

---

## 🛠️ Tools Summary

| Category | Tool | Description |
|---|---|---|
| **Profiles** | `tiktok_profile_set` | Configure Client Key, Client Secret & Redirect URI for a profile |
| | `tiktok_profile_get` | Inspect profile configuration (secrets redacted) |
| | `tiktok_profile_list` | List all profiles and connected accounts |
| | `tiktok_profile_delete` | Delete a profile and its stored accounts |
| **Auth** | `tiktok_auth_start` | Generate TikTok OAuth authorization URL with PKCE & QR code |
| | `tiktok_auth_wait` | Wait for user mobile scan & auto-complete authentication |
| | `tiktok_auth_complete` | Complete OAuth with redirect URL, exchange code & save tokens |
| | `tiktok_accounts_list` | List connected accounts for a profile and check token validity |
| | `tiktok_account_refresh`| Manually trigger token refresh for an account |
| | `tiktok_account_remove` | Disconnect an account from a profile |
| **Publishing** | `tiktok_publish_post` | Publish a post (photo carousel or video) via Content Posting API v2 |
| | `tiktok_publish_status`| Query post processing & publishing status by `publish_id` |
| | `tiktok_publish_photos`| Convenience alias to publish a photo carousel |
| | `tiktok_publish_video` | Convenience alias to publish a video |
| **Analytics** | `tiktok_creator_info` | Query creator account capabilities & limits |
| | `tiktok_account_stats` | Retrieve follower count, following count, likes, post count |
| | `tiktok_post_stats` | Query views, likes, comments, shares for specific post IDs |
| | `tiktok_posts_list` | List recent posts and analytics for an account |

---

## 🚀 Setup & Installation

```bash
cd /Users/abdoul/development/internal-tools/tiktok-publisher-mcp
npm install
npm run build
```

### Registration in Claude Desktop / Antigravity

Add to your `mcpServers` configuration:

```json
{
  "mcpServers": {
    "tiktok-publisher": {
      "command": "node",
      "args": [
        "/Users/abdoul/development/internal-tools/tiktok-publisher-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## 📖 Usage Flow

### 1. Configure a profile for an app
```json
{
  "profile": "project_name",
  "clientKey": "YOUR_TIKTOK_CLIENT_KEY",
  "clientSecret": "YOUR_TIKTOK_CLIENT_SECRET",
  "redirectUri": "https://auto-viral.com/auth/tiktok/callback"
}
```

### 2. Connect an account
1. Call `tiktok_auth_start`:
   ```json
   { "profile": "project_name", "account": "my_account" }
   ```
2. Scan the returned QR code with your phone camera and approve.
3. Call `tiktok_auth_wait` (or pass the redirected URL to `tiktok_auth_complete`):
   ```json
   {
     "profile": "project_name",
     "account": "my_account",
     "state": "STATE_FROM_AUTH_START"
   }
   ```

### 3. Publish a post from any app
Your app generates the images or video and uploads them to R2/CDN, then calls `tiktok_publish_post`:

```json
// Example: Photo carousel post (slideshow)
{
  "profile": "project_name",
  "account": "my_account",
  "photo_images": [
    "https://cdn.example.com/01.jpg",
    "https://cdn.example.com/02.jpg"
  ],
  "title": "Post Title ✨",
  "description": "Caption with hashtags #viral #trending",
  "post_mode": "MEDIA_UPLOAD",
  "privacy_level": "PUBLIC_TO_EVERYONE"
}
```

```json
// Example: Video post
{
  "profile": "project_name",
  "account": "my_account",
  "video_url": "https://cdn.example.com/video.mp4",
  "title": "Video Title 🎬",
  "description": "Watch until the end! #fyp #viral",
  "post_mode": "MEDIA_UPLOAD",
  "privacy_level": "PUBLIC_TO_EVERYONE"
}
```
