<p align="center"><img src="docs/assets/hero.svg" alt="Lesheng Universe — stories, music and connections" width="100%" /></p>

# Lesheng Universe

**Turn your story into a character. Turn a song into a connection.**

[简体中文](README.md) · [Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Contributing](CONTRIBUTING.md)

A local-first character-generation and music-social prototype. Bring a photo, a voice clip, a story, your self-reported MBTI, a representative song and a goal. Create an explainable 2D music character, visit a constellation-inspired plaza, and connect through song gifts, postcards and shared-listening memories.

This is an independent hackathon prototype, not an official QQ Music product or an authorized commercial music catalog.

![Music plaza with generated characters and a central music screen](docs/assets/plaza.png)

## What makes it different

- **Explainable characters.** Local MediaPipe face detection, color sampling, weighted story traits, stable seeds and an SVG renderer. No paid generative-AI API key is required.
- **A social space built around music.** A central plaza screen, character interactions, community mood bubbles, discovery, events and a demo marketplace.
- **Songs as a social language.** Send a song with a message, make a music postcard, and retain interaction memories.
- **Real audio playback.** Full credited SoundHelix example tracks, seeking, repeat modes, a persistent player and local audio imports.
- **A complete local stack.** React 18, Vite 6, Three.js, Express 4, WebSocket and automatically initialized JSON-file storage.

The engine combines local analysis and weighted rules; it is **not** a diffusion model, voice cloning service, identity replica or personality inference system. Raw photos are not uploaded by the current app. Shared-listening room records exist, but low-latency cross-device synchronized playback remains roadmap work.

## Run locally

Prerequisites: Git, Node.js **22.12+** (24 LTS recommended), npm.

```bash
git clone https://github.com/1828703450qqcom-ux/lesheng-universe.git
cd lesheng-universe
npm run install:all
npm run dev
```

Open <http://localhost:5173>. API health: <http://localhost:4000/api/health>.

Register a disposable local account, create a character, then visit the plaza. No real email delivery is implemented. Use fictional stories and a throwaway password, not personal secrets. Microphone capture requires localhost or HTTPS and permission. Bundled vision assets and audio are included; dependencies need an initial download and online fonts have system-font fallbacks.

```bash
npm test
npm run build
npm run test:smoke
npm run check:publication
```

The smoke test creates its own temporary server copy and data directory. Existing local accounts are not modified. See [deployment](docs/deployment.md) for production routing and licensed audio-provider setup. GitHub Pages alone does not run the backend.

## Honest boundaries

The included playable recordings are **SoundHelix Song 1 / 2 by T. Schürger**, not commercial Chinese songs mentioned in character stories. Unavailable catalog songs are not substituted or illegally resolved. Keep all [third-party credits](THIRD_PARTY_NOTICES.md).

JSON-file persistence is for a small prototype, not concurrent production workloads. Mobile onboarding/layout polish, browser-specific codec behavior, room isolation and deployment hardening need further work. UI counters are illustrative. Screenshots use local seed characters and a fictional demo account, not production user data.

## Contribute

We especially welcome character styles, mobile accessibility, database adapters, licensed audio integrations and cross-device listening improvements. Read [CONTRIBUTING](CONTRIBUTING.md), open an [issue](https://github.com/1828703450qqcom-ux/lesheng-universe/issues), or send a focused PR. Security reports: [SECURITY](SECURITY.md).

Original code is [MIT-licensed](LICENSE). Third-party assets and trademarks retain their original terms.
