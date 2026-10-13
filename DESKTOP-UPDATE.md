# Desktop browser redesign — app.kmcgugak.org

This archive is the complete website, based on your uploaded app.kmcgugak-main.zip. The existing text, section order, Firebase configuration, collection schema, and domain are preserved. No Flutter project files were changed.

## Install

1. Extract this ZIP.
2. Upload its CONTENTS to the root of your existing app.kmcgugak.org GitHub repository, replacing matching files. Keep js/ and assets/ as folders. Do not place the whole extracted folder inside the repository.
3. Commit the update and wait for GitHub Pages deployment.
4. Reload app.kmcgugak.org. Close other open app tabs/windows and reopen an installed web app if it still shows an earlier version. A Mac browser hard refresh is Command+Shift+R.

No Firebase rule changes, account recreation, package install, or build command are needed for this layout update.

## Layout behavior

At 960px and wider, a left navigation rail replaces the floating bottom tabs. Home has aligned schedule rows, compact horizontal Next Up cards, and a recent-performance grid. Profile uses an identity header and the same recent cards. Content has deliberate gutters and a readable maximum width on very large monitors.

Chat uses an inbox beside the open conversation. Selecting another thread replaces the current thread; navigating to another tab closes the conversation and preserves its existing text-draft behavior. Desktop conversations are accessible nonmodal regions, so the inbox and navigation remain keyboard-accessible. Member selection, settings, and message actions use centered dialogs.

Performance details use a centered desktop window, a full photo viewer, and a gallery window that fits small collections or scrolls for larger ones. The card grid responds to available space and the captions grow without a fixed height limit. The bottom navigation inset is disabled when navigation is at the side.

Below 960px, the familiar bottom navigation and mobile conversation view remain. Performance dialogs respond to the iframe's available width. Browser resizing updates performance insets and conversation accessibility roles.

## Verification

Browser checks covered 390px mobile, 1024px laptop, 1440px desktop, and 1920px wide-monitor layouts; no horizontal page overflow was found in the checked views. Larger text, local preview login, Team Chat-to-DM switching, sending a local preview message, navigation cleanup, settings, real public performance details/gallery/full-photo navigation, and sequential overlay closing were checked. The six existing model checks and JavaScript syntax checks pass.

Private production chat/authentication were not exercised with real credentials. The unchanged Firebase backend retains its existing deployment requirements and push-notification limitations described in README.md.
