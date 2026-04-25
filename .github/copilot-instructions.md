# ClickApp (Frontend - Quasar.js)

## Tech Stack

- **Framework:** Quasar CLI v2 / Vue 3 (Composition API `<script setup>`)
- **State:** Pinia + `pinia-plugin-persistedstate`
- **HTTP:** Axios → ClickFire API at `https://fire.rftuning.id`
- **Realtime:** Firebase Realtime Database (signaling only)
- **Encryption:** CryptoJS AES (client-side media encrypt/decrypt)
- **Package Manager:** npm

## 🌐 ENVIRONMENT: REMOTE SERVER (ORION)

- **Development:** Local (Windows) — source code is edited locally.
- **Production:**:
  - Remote Server `Orion` (Ubuntu 22 LTS) — execution is 100% remote.
  - path: /var/www/app.rftuning.id
  - nginx conf: /etc/nginx/sites-available/app.rftuning.id
- **Sync Status:** Source code is edited locally (Windows) but **EXECUTION IS 100% REMOTE**.
- **Docs:** Read `docs/` first for walkthroughs and architecture notes.
- **Tools:** Treat `tools/` as non-production helpers, maintenance scripts, and generated logs.

# Error Handling & Debugging Instructions

- **DO NOT** execute `quasar build` to diagnose or find errors. It is strictly prohibited and wastes resources.
- Assume the development server is already actively running via `quasar dev` in the integrated VS Code terminal.
- To investigate an issue, simply capture and analyze the logs, HMR errors, or stack traces directly from the active terminal output where `quasar dev` is running.
- Focus on fixing the specific file causing the runtime/compile error based on the terminal capture.

## Project Structure

```
src/
├── App.vue                # Root — idle detection (30s auto-logout)
├── layouts/
│   └── MainLayout.vue     # Header + left drawer (Private/Work/Testing/Media)
├── pages/
│   ├── LoginPage.vue      # Login, "Welcome back" badge, PING effects
│   ├── PrivateChat.vue    # Private DM (wraps ChatBox)
│   ├── WorkChat.vue       # Work DM (wraps ChatBox)
│   ├── TestingChat.vue    # Testing DM (wraps ChatBox)
│   ├── MediaViewer.vue    # Media gallery (placeholder)
│   └── ErrorNotFound.vue  # 404 page
├── components/
│   └── ChatBox.vue        # Core chat: infinite scroll, send, PING, ticks
├── stores/
│   ├── index.js           # Pinia factory
│   └── auth.js            # Auth store (login/logout, persisted)
├── router/
│   ├── index.js           # Router factory + requiresAuth guard
│   └── routes.js          # Route definitions
├── utils/
│   ├── crypto.js          # CryptoJS AES encrypt/decrypt blobs
│   └── fcm.js             # Firebase RTDB sendSignal/listenForSignal
├── docs/
├── tools/
└── css/
    ├── app.scss
    └── quasar.variables.scss
```

## Features & Rules

1. **Auth & Security:**
   - Hardcoded users: `mici`/`mi123` & `fufu`/`fu123`.
   - **Idle Detection:** 30s auto-logout on no mouse/keyboard interaction (`App.vue`).
   - Auth guard on all routes except `/login`.
2. **Layout:**
   - Left drawer: Private, Work, Testing, Media.
   - Private/Work/Testing: DM UI with Infinite Scroll (reverse, DESC from API).
   - Media: Image/Video viewer (placeholder).
3. **Chat Features:**
   - PING button sends `"PING!"` content + Firebase signal `isPing: true`.
   - Receiver gets: vibration, shake animation, tab title blink.
   - Message status: `check` (sent), `done_all` grey (received), `done_all` blue (read).
4. **Firebase Realtime Database:**
   - Signaling ONLY — writes to `signals/{userId}`. No message body in payload.
   - On signal trigger, frontend fetches latest messages from API.
5. **Media Storage (Client-Side Encryption):**
   - CryptoJS AES to encrypt media before uploading to backend.
   - Decrypt only via frontend viewer. Backend must never see raw files or keys.
6. **Run command:** `quasar dev` (Quasar dev server, opens browser automatically)
