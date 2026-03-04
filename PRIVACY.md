# Privacy Policy

**ReThread — Chrome Extension**

Last updated: March 4, 2026

## Overview

ReThread is a browser extension that helps users bookmark and organize their AI chat conversations. This privacy policy explains what data the extension accesses and how it is handled.

## Data Collection

**ReThread does not collect, transmit, or share any user data.**

The extension stores the following information locally in your browser using `chrome.storage.local`:

- Chat URLs (links to your AI conversations)
- Page titles (the title of the chat as shown in the browser tab)
- User-created notes, folder assignments, and pin status
- Extension settings (theme preference, sort order)

This data never leaves your browser. There is no server, no database, no analytics, and no tracking of any kind.

## Data Access

The extension has access to four specific websites:

- claude.ai
- chatgpt.com
- gemini.google.com
- grok.com

On these sites, the extension reads only two things:

1. The page URL (to identify the chat)
2. The document title (to display a readable name)

**The extension does not read, store, or transmit:**

- Chat message content
- Authentication tokens or session cookies
- Personal information (name, email, etc.)
- Browsing history outside of the four supported sites
- Any data from other websites or browser tabs

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save bookmarks locally in the browser |
| `sidePanel` | Display the bookmark management panel |
| `host_permissions` | Inject Save button on four supported AI chat sites |

No additional permissions are requested.

## Third-Party Services

ReThread does not use any third-party services, APIs, SDKs, or analytics tools. There are no network requests made by the extension.

## Data Storage and Security

All data is stored in `chrome.storage.local`, which is sandboxed to the extension and inaccessible to other extensions or websites. Data persists until the user manually deletes it or uninstalls the extension.

## Children's Privacy

ReThread does not knowingly collect any data from children under the age of 13.

## Changes to This Policy

If this privacy policy is updated, the changes will be posted here with an updated revision date.

## Contact

If you have questions about this privacy policy, please open an issue on GitHub:

https://github.com/ogxsz/rethread/issues

## Open Source

ReThread is fully open source. You can inspect all code at:

https://github.com/ogxsz/rethread
