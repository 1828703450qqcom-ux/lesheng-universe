# Third-party notices

The MIT license applies to this project's original source code, not automatically to bundled third-party assets, software dependencies, music, names or trademarks.

## MediaPipe / Google AI Edge

- Runtime package: `@mediapipe/tasks-vision`, version pinned by `client/package-lock.json`.
- Upstream: https://github.com/google-ai-edge/mediapipe
- License: Apache-2.0. A copy is included at `client/public/vision/Apache-2.0.txt`.
- Bundled files: the two `vision_wasm*_internal.js/.wasm` runtime variants and `blaze_face_short_range.tflite` in `client/public/vision/`.
- Model origin: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Copyright belongs to the respective Google/MediaPipe contributors. Preserve upstream notices and review upstream model terms for your intended use.
- Runtime files are redistributed without intentional modification; the app loads them locally for face detection, not identity recognition.

## SoundHelix example recordings

- “SoundHelix Song 1” and “SoundHelix Song 2”, by **T. Schürger**, created using **SoundHelix**.
- Source and usage terms: https://www.soundhelix.com/audio-examples
- MP3 sources: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3 and https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3
- Retain credit to SoundHelix and the artist. Audio is not relicensed under this repository's MIT license.
- The included `*-indexed.mp3` files have an MP3 seek index added with FFmpeg, using audio packet copy without re-encoding.
- These are full example recordings, not recordings of the commercial Chinese titles included as catalog/story metadata.
- Additional credits: `client/public/music/ATTRIBUTION.md`.

## Application dependencies

React, React Router, Vite, Express, Three.js, ws, Lucide, MediaPipe and the other npm dependencies retain their respective licenses. Exact versions are recorded in the root, client and server lockfiles. Their upstream license files are distributed by npm when dependencies are installed. Preserve required notices when shipping a compiled bundle.

The page requests Google Fonts with system-font fallbacks. Font families retain their upstream terms; no font binaries are bundled in this repository.

## Names and trademarks

QQ Music, Tencent Music, artist names, song names and other third-party names are used for prototype context or catalog metadata. No affiliation, endorsement, commercial music license, official API access or rights to any trademark are granted or implied.
