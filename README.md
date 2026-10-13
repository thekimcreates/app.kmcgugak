# KMC Gugak Members — HTML/CSS/JavaScript web app

This is a static web port of the current Flutter member app. There is no Flutter, Xcode, Node build, or server required for deployment. GitHub Pages serves the files; your existing Firebase project provides authentication, performances, member profiles, conversations, and attachment storage.

## What's included

- Home: member/parent greetings, upcoming text list, Pacific-time practice windows, next performance within 72 hours, completed-performance stats, and three recent performances plus See All. Guests see public recents and no Next Up.
- Performances: the app's complete public performance controller and mobile gallery, bundled locally in `performances.html`. Unified filters, 16:9 cards, details/gallery sheets, swipe dismissal, photo/video viewer, and tab reselect behavior are retained.
- Chat: pinned Team Chat, direct messages, groups, member search, text and photo/file attachments, replies, reactions, unread indicators, loaded-message search, reports, and soft removal by sender/admin. No All/Unread filter buttons.
- Profile/settings: member-ID sign-in, display name, account photo, password change, sign out, notification preferences/testing, larger text, and installation help.
- Responsive layout, glass-effect tab bar, dark mode, reduced-motion support, accessible labels, and Home Screen installation through the included manifest/service worker.

The glass appearance is CSS; browsers cannot render Apple's native UIKit Liquid Glass controls. Browser pinch zoom is suppressed in the performance frame, while the rest of the website retains accessibility zoom. Device text scaling differs between browsers; the explicit Settings → Text size control also updates Performances.

## 1. Preview on your Mac

Unzip this archive. Open Terminal inside the extracted `kmc-gugak-web` folder:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000/`. Do not double-click index.html: JavaScript modules and authentication require HTTP/HTTPS.

For a safe account/chat preview, visit `http://localhost:8000/?demo=1`. Sign in as `19kimj`, `21kiml`, or `22kangp` with any nonempty passcode. Preview account/chat changes stay in memory and do not write to Firebase. Home uses fictional performances; the Performances tab independently reads the real PUBLIC feed. Fictional Home performance IDs cannot open real details. Reload discards preview conversations. Browser preferences and text drafts may persist locally until sign out.

## 2. Upload to GitHub Pages

1. Create a new repository such as `kmc-gugak-members-web`. Use a separate repository from your current public website.
2. Upload the CONTENTS of this folder to the repository root. `index.html`, `style.css`, `performances.html`, and `js/` must be directly at the root, rather than inside another `kmc-gugak-web` folder. Keep `.nojekyll` (Finder may hide it).
3. Commit the files to `main`.
4. Open repository **Settings → Pages**.
5. Under Build and deployment, choose **Deploy from a branch**, then **main** and **/(root)**. Save.
6. Wait for GitHub's deployment, then open its displayed URL, usually `https://YOUR-USERNAME.github.io/kmc-gugak-members-web/`.
7. Keep HTTPS enabled. Use that URL on your iPhone/Android phone.

No npm install or compilation is needed. Relative asset paths support GitHub project subdirectories. Do not upload real account passwords, service-account JSON, private keys, user exports, or device tokens. The Firebase web configuration already in `js/config.js` is public client configuration; access is enforced by Firebase rules.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 3. Connect the existing member accounts

The included configuration points to `kmc-samulnori`, matching the app. Existing accounts are reused; this web app does not create or reset accounts or distribute a shared default password.

1. Open Firebase Console → your project → Authentication → Settings → Authorized domains. Add your actual GitHub hostname, such as `YOUR-USERNAME.github.io` (no `https://` or repository path). Add your custom domain too if using one.
2. Confirm Authentication → Sign-in method → Email/Password is enabled, as required by the existing app.
3. A member signs in with their roster ID; the client maps it to `MEMBER-ID@members.kmcgugak.org`. Auth UID and custom claim `memberId` must both equal that ID. Existing native-app provisioning sets these; entering a Firestore member document alone does not create a valid login.
4. In Google Cloud Console, if the project's browser API key has HTTP referrer restrictions, add the deployed site referrer. Preserve existing website/app restrictions. The embedded map's browser Maps API key may need the new referrer too; external Directions links do not depend on the embedded map key.
5. Test a real member login yourself on the deployed site. Verify their Home assignments, profile, and private chats. Live private-account behavior was not tested using your credentials during development.

## 4. Check existing security rules

The web port uses the same collection schema and deterministic DM IDs as the native app. If your current app's rules already support groups, attachments, member profiles, and notification preferences, keep them.

Reference files are in `rules/`:

- `chat-firestore-snippet.rules`: chat helper functions and collection match blocks, including group creation. Merge INSIDE the existing Firestore documents block, retaining website/admin rules.
- `group-chat-firestore-addition.rules`: alternative addition for an older chat installation. Do NOT paste it alongside the full new chat snippet.
- `member-profiles-snippet.rules`: owner-only account-photo access.
- `chat-storage-snippet.rules`: merge with existing Storage rules.
- `chat-storage-complete-example.rules`: reference example, not a command to replace a bucket's existing rules.

Do not replace the project's complete rules blindly or add `allow read, write: if true`. Admin access follows existing `chatAdmin`/`admin` custom claims or an active `/admins/MEMBER-ID` document; ordinary clients cannot grant themselves admin privileges. Chat is protected by rules but is not end-to-end encrypted.

## 5. Enable attachment reads from the new website

The app fetches private attachments using the signed-in Firebase SDK rather than exposing long-lived download links. Browser downloads require bucket CORS configuration. If text chat works but photos/files fail with a CORS error:

1. Copy `cors.example.json` to `cors.json`.
2. Replace its example hostname with your actual site ORIGIN, e.g. `https://YOUR-USERNAME.github.io`. Origins have no repository path. Add your custom-domain origin if needed.
3. Have the bucket administrator inspect the existing CORS configuration and merge these origins into it. Preserve origins needed by the current website.
4. From Google Cloud Shell or an authenticated Google Cloud CLI, apply the reviewed configuration:

```sh
gcloud storage buckets update gs://kmc-samulnori.firebasestorage.app --cors-file=cors.json
```

This step changes bucket configuration and should be done by your administrator. CORS does not replace authentication/security rules. Uploads are limited to four attachments and 10 MB per file; failed sends retain the composed text/attachments in the open conversation for retry. Only text drafts persist across browser reloads. Files uploaded before an abandoned send can remain in Storage and need a retention/cleanup policy.

Official references: https://firebase.google.com/docs/storage/web/download-files and https://cloud.google.com/storage/docs/configuring-cors

## 6. Add to Home Screen

- iPhone/iPad: open the deployed HTTPS site in Safari → Share → Add to Home Screen → Add.
- Android: open it in Chrome → menu → Install app / Add to Home screen (wording varies).

This creates an installed web app, not an Apple App Store/Google Play Store listing. Offline caching covers public interface files only; fresh Firebase data, sign-in, private chat, attachments, and public media require a connection.

Notification preferences and a LOCAL notification test are included. Automatic background chat/performance push delivery is NOT included. A static GitHub Pages site needs a trusted backend and Web Push delivery setup for that feature. iPhone browser notification support requires a supported installed Home Screen web app; the UI explains unavailable permissions.

## 7. Optional custom domain

You can use `app.kmcgugak.org` without moving the existing website. Configure that custom domain in this repository's Pages settings and create its CNAME DNS record pointing to `YOUR-USERNAME.github.io`. Keep the existing root-domain website records. Update Firebase authorized domains, API-key referrers, and bucket CORS origins to match. GitHub creates the repository CNAME file when configured; no domain is preselected in this ZIP.

## Before inviting members

- Review `privacy.html`, retention/contact details, and the account-removal process for your actual organization. The included page is a starter notice, not a reviewed organizational policy.
- Test two actual member accounts: one sends a Team Chat message, starts a DM and group, uploads a photo/file, replies/reacts, and signs out. Confirm nonparticipants cannot access a private conversation through Firebase rules.
- Verify a real performance with multiple photos/videos on both iPhone and Android, including swipe dismissal, tab close, and text scaling.
- Check display-name, password, and photo edits with your own account. Back up/retain existing Firebase rules before any rule merge.
- Keep Firebase usage/limits and Storage billing eligibility in mind; GitHub hosting does not cover Firebase service usage.

## Deep links and updates

Use `https://YOUR-SITE/PATH/#performance/PERFORMANCE-ID` to open a specific performance. Existing `https://kmcgugak.org/performances/#ID` links encountered inside the performance interface open its in-app detail view. Opening an old website link from another app/browser still goes to the existing website unless that website redirects users to this new portal; a static web app cannot claim native universal links automatically.

Upload updated files to the same repository. The public shell cache uses network refresh; after substantial shell changes, increment the cache version in `sw.js`. No private Firebase responses or chat attachments are cached by that service worker. Browser Firebase Auth persists login until sign out; use a private window on a shared device.

## Development checks

With a recent Node.js installation, `npm test` runs the six pure model checks (practice boundaries, daylight saving time, TBD dates, native-compatible DM IDs, participants, titles). No dependencies are needed. Mobile browser preview checks covered local member login, groups, messaging, reactions, profile edits, sign-out cleanup, and real public performance/gallery navigation. These checks do not certify deployed Firebase permissions or background push delivery.
