# FLOXAAP — Phases 1–8 (Next.js + TypeScript + Firebase)

Included: bilingual AR/EN i18n with real RTL/LTR (logical CSS, `dir` on `<html>`, direction-aware story taps/arrows), gold/black theme, splash, email auth (+verification, reset, atomic unique username), home feed (cursor pagination, optimistic like/save with rollback, lazy media), stories (progress, tap/hold pause, seen state), language settings page, Firestore rules.

Phase 2 adds: publishing (photo/video/text posts and 24h stories) with real upload progress — nothing is written until the upload succeeds; threaded comments (replies) with transactional counters; `storage.rules`.

Phase 3 adds 1:1 real-time chat (Firestore listeners): start by username, send/edit/delete/reply, sending→sent→delivered→read statuses, failed+retry, unread counts, RTL/LTR-aware bubbles. Needs a composite index on `conversations` (`members` array-contains + `lastAt` desc) — the console error links to create it. Known limits: "delivered" is set when the recipient's app loads the conversation list; unread counters are client-updated (a member could tamper with them — move to a Cloud Function later); no presence/online status, media, forwarding, reactions, pins, groups, or push yet.

Phase 4 adds: follow/unfollow (transactional counters), Explore (trending posts, Photos/Videos tabs, people search by username prefix, per-device search history), and in-app notifications (follow/like/comment) with an unread dot. Indexes needed: `notifications` (toUid + createdAt desc), `posts` (mediaType + likeCount desc), `users` (username asc is automatic). **Push notifications (FCM/APNs) are NOT built** — they need a Cloud Function to send on notification create. No profile pages yet; hashtag/location discovery and suggested accounts not built. Calls (WebRTC) are the next phase.

Phase 5 adds 1:1 voice and video calls: WebRTC media between devices, Firestore signaling (`calls` + candidate subcollections), incoming/outgoing/active screens, mute, camera on/off and switch, duration, 45 s ring timeout with a missed-call notification, decline/end, permission errors. **Requirements:** HTTPS (or localhost) for camera/mic. STUN defaults to Google's public server; calls across strict NATs/mobile networks need a TURN server — set `NEXT_PUBLIC_TURN_URL/USER/PASS` (static TURN credentials in client code are visible to users; use short-lived credentials from a Cloud Function for production). **Not built:** background/closed-tab ringing (needs push + native/PWA), ringtone, speakerphone routing, voice→video upgrade mid-call, ICE-restart network recovery (relies on the browser's own reconnection, then ends on failure), group calls, busy signal (a second call is ignored and times out as missed).

Phase 6 adds profiles (`/profile`, `/profile/[uid]`): cover, avatar, name, username, verified badge, bio, website (http/https only), post/follower/following counts, Posts and Saved tabs, Follow/Message/Share, edit profile with avatar and cover upload, sign out. Rules now stop users from setting their own `verified`, `username` or counters beyond ±1. Index needed: `posts` (authorId + createdAt desc). **Limits:** private accounts are NOT enforced yet (needs server-side rules on posts); highlighted stories not built; posts keep the author name/avatar they were published with (a Cloud Function should fan out profile changes); `verified` can only be set from the Admin SDK/console until the admin dashboard exists.

Phase 7 adds: Short videos (`/shorts`, reachable from the 🎬 icon on Home): full-screen vertical snap feed of video posts, one video plays at a time, neighbors preloaded and far ones unloaded, tap to pause, mute toggle, progress bar, like/comment/share/save/follow, pagination. Index: `posts` (mediaType + createdAt desc). Settings center (`/settings`): email, password-reset link, **account deletion with re-authentication** (deletes profile + username; posts/media/messages need a Cloud Function to purge), privacy toggles (stored; NOT yet enforced server-side), notification toggles (applied to the in-app list), reduce-motion, language.

**Still not built, and why:** *Live streaming* needs a streaming provider (LiveKit, Agora, Mux or Cloudflare Stream) and server-issued tokens. *Premium* needs a payment provider (Stripe/RevenueCat) and a webhook Cloud Function that writes `subscriptions` — never from the client. *FLOXAAP AI* needs a Cloud Function holding the model API key (never in the browser). *Admin dashboard* needs role custom claims set via the Admin SDK, plus moderation Cloud Functions. *Groups*, session/device management, push (FCM) and blocked accounts are also pending.

Phase 8 adds group chats (stored as `conversations` with `isGroup`): create with up to 50 members by username, group messages with sender names and per-member unread counts, group info (members, admins, add/remove, promote, rename, leave, report). Leaving as the sole admin promotes the next member. Reports are written to `reports` (readable only via Admin SDK/console until the admin dashboard exists). Not yet: group photos, per-message read receipts per member, file sharing, mentions, muting.

## Quick start (Firebase project `floxaap-d7a1a`)
`.env.local` is pre-filled. In the Firebase console enable **Authentication → Email/Password**, create **Firestore** and **Storage**, then: `npm i -g firebase-tools && firebase login && firebase use floxaap-d7a1a && firebase deploy --only firestore,storage` (deploys rules + all indexes), then `npm install && npm run dev`.

## Setup
1. `npm install`
2. Create a Firebase project: enable Email/Password auth + Firestore. Copy `.env.example` to `.env.local` and fill in the web config.
3. Enable Storage; deploy `firestore.rules` and `storage.rules` (`firebase deploy --only firestore:rules,storage`). Create composite index for stories (`expiresAt` desc) if the console asks.
4. `npm run dev`

## Not yet built (later phases)
Google/Apple sign-in, account deletion, follows, report flow, hashtag/mention parsing, location and audience pickers, video compression, Explore, chat extras, calls, live, notifications, premium, AI, admin. Locale is stored in localStorage; syncing to the user profile is pending. Splash art is a CSS placeholder. Seen-story state is per-device.
## Status
Written without network access: **not yet installed, built, or tested.** Run `npm run lint` and `npm run build` first and report any errors.
