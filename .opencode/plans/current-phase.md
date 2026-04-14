# Current Phase

Status: complete
Release: v0.7.0
Phase file: docs/releases/phase-07-pwa-install-and-offline-shell.md

## Goal

Make the client feel installable and resilient as a mobile web app.

## Why this phase is next

Once the core interaction surfaces work, the app should feel more persistent and app-like on iPhone.

## In scope

- install-ready app behavior
- app icon and app-shell polish
- explicit online/offline state
- basic offline-aware shell messaging
- stable relaunch behavior

## Out of scope

- full offline command execution
- background sync guarantees
- push notifications
- native wrapper work

## Primary files

- app manifest-related files
- app icon assets
- install guidance UX files
- offline-state UX files

## Expected max files changed

9

## Acceptance criteria

- app can be used as an install-oriented mobile web app
- online/offline messaging is honest and clear
- relaunch feels stable
- release improves daily-driver viability

## Validation

Status: PASS

Evidence:
- `index.html`, `public/manifest.webmanifest`, and the generated `public/icon-192.png` / `public/icon-512.png` add the expected install metadata and app icon assets for an install-oriented mobile web app shell.
- `src/main.js` adds explicit online/offline shell state, install guidance, and last-screen persistence, which aligns with the phase goal and stays within scope.
- `npm run build` passes, so the current changes produce a working production bundle.
- `public/sw.js` now fetches `/index.html` during install, extracts same-origin `/assets/...` references, and pre-caches the built bundle files required to boot the app offline.
- Built output confirms the relaunch-critical assets exist and are covered: `dist/index.html` references `/assets/index-rsKhARMr.js` and `/assets/index-D8eQ7LEE.css`, and the service worker's install path caches those alongside `/`, `/index.html`, the manifest, and icons.
- Reviewed changes remain within scope: they add install-ready behavior, shell messaging, icons, and offline-aware relaunch support without introducing offline command execution, background sync, push notifications, or native wrapper work.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Added install-ready shell metadata, app icons, and in-app install guidance for mobile use.
- Added explicit online/offline shell messaging and offline relaunch support by caching the built app bundle.

## Completion summary

Phase 07 made the client feel more app-like on iPhone by adding installable PWA shell behavior, clear connection state, and a reliable offline relaunch path.
