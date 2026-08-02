# minimal-newtab Minimal New Tab

[中文](README.md) | English

A minimal new tab page extension (Chrome, MV3): big clock, date, search (follows your browser's default engine), synced todos (Markdown subset + auto-detected links), toolbar popup + uncompleted badge. Fully local and offline.

## Features

- New tab: clock / date / search box / collapsible todo panel
- Toolbar popup: the same todo list, real-time two-way sync
- Todos: synced across devices via `chrome.storage.sync`; **bold** `code` ~~strikethrough~~ [links](url), auto-detected URLs
- Red toolbar badge: number of uncompleted todos
- Dark mode: follows the system
- i18n: UI follows the browser language (Chinese / English)
- Version check: banner on the new tab page when a new version is available

## Installation

- **Chrome**: `chrome://extensions` → Developer mode → Load unpacked → select this directory

## Development

```bash
npm ci            # install dependencies
npm run check     # biome lint
npm run build     # build dist/minimal-newtab-{version}-chrome.zip
```
