---
description: 'Use when working on ClickApp frontend files, docs, tools, Quasar/Vue components, Pinia stores, Firebase signaling, media encryption, auth flow, or Orion deployment.'
name: 'ClickApp Project Instructions'
applyTo:
  - 'src/**'
  - 'public/**'
  - 'docs/**'
  - 'tools/**'
  - '**/*.js'
  - '**/*.vue'
  - '**/*.scss'
  - '**/*.json'
  - '**/*.md'
  - 'quasar.config.js'
  - 'postcss.config.js'
  - 'eslint.config.js'
  - 'index.html'
---

# ClickApp Context

- ClickApp is the frontend SPA built with Quasar CLI v2 and Vue 3 using the Composition API and `<script setup>`.
- The app is edited locally on Windows, but execution happens on the Orion Ubuntu host. Use `ssh orion` for Linux host access.
- Local saves are synced to the remote container through the configured SFTP extension, so do not rely on `scp`.
- Restarting the relevant container on Orion after file changes is allowed when needed for validation.
- The frontend talks to ClickFire at `https://fire.rftuning.id` through Axios.
- Firebase Realtime Database is used for signaling only. Do not place message bodies or secrets in the signal payload.
- Media encryption and decryption must stay client-side with CryptoJS AES.
- For photos and videos, encrypt the actual file bytes locally before upload; only encrypted blobs may be sent or stored.
- Keep the existing structure intact: auth is persisted with Pinia, private/work/testing chats use the shared chat flow, and `/media` is the viewer route.
- Hardcoded app users are `mici/mi123` and `fufu/fu123`; idle logout is handled in `src/App.vue`.
- Do not use `quasar build` to diagnose problems. Inspect the running `quasar dev` logs, HMR output, or stack traces instead.
- Prefer small targeted changes that preserve the current UX, message flow, and status tick behavior.
