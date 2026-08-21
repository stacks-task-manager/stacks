# `@stacks/mobile`

The Stacks mobile client. An [Expo](https://expo.dev/) + React Native app using Expo Router for navigation and Gluestack UI for components. Talks to the same API as the web app.

## Table of Contents

- [Environment](#environment)
- [Development](#development)
- [Overview](#overview)
- [Building](#building)
- [Related](#related)

## Environment

This package does not check in a `.env.example`. The server URL the app connects to is stored on-device and managed at runtime — see [`src/config/server.ts`](../../packages/mobile/src/config/server.ts).

## Development

```bash
yarn dev:mobile           # expo start (interactive CLI)
```

Inside the Expo CLI:

- press **`i`** to launch the iOS simulator (requires Xcode on macOS)
- press **`a`** to launch the Android emulator (requires Android Studio)
- press **`w`** to open the web preview
- scan the displayed **QR code** with [Expo Go](https://expo.dev/client) on a physical device

For a physical device, make sure your phone is on the same Wi-Fi as your dev machine. If you need to point the app at a server that isn't on `localhost`, set the server URL via the in-app server-config screen rather than hard-coding it.

## Overview

- `app/` — file-based routes (Expo Router)
- `src/components/` — UI components
- `src/api/` — typed API client (axios), shared with the web app where possible
- `src/config/server.ts` — server URL configuration and persistence
- `src/state/` — app state
- `assets/` — fonts, icons, images
- `scripts/generate-icons.js` — regenerates app icons (`yarn workspace @stacks/mobile icons:generate`)

## Building

This repo does not currently include an EAS build configuration. For development the Expo Go workflow is sufficient. To produce standalone iOS / Android binaries, configure EAS Build per [the Expo docs](https://docs.expo.dev/build/introduction/).

## Related

- [`@stacks/server`](server.md) — API
- [`@stacks/types`](types.md) — shared data shapes
