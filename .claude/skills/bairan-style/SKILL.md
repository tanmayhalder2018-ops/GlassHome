---
name: bairan-style
description: Make a 30-second romantic watercolour-sticker lyric reel of a song's hook — a painted boy and girl cut out like paper stickers acting out each line, props popping on sung words, captions fading word by word — drawn in HTML canvas. Use when the user types /bairan-style with a song MP3 and lyrics (one sung line per row), optionally the official video.
argument-hint: "<song.mp3> + lyrics [official-video.mp4]"
---

# Watercolour sticker lyric video

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.** All motion that follows words uses forced-alignment times.
- Paint everything in code (HTML canvas in headless Chrome, ffmpeg encode). No stock footage, photos or image generators.
- Handle: `@yourhandle`.
- Work in `work/bairan-style/<slug>/`, outputs in `out/bairan-style/<slug>/`.

## Step 1 — Separate and align

1. Demucs: `python -m demucs --two-stems=vocals song.mp3`.
2. Force-align the user's lyrics to the vocal stem with `torchaudio.pipelines.MMS_FA` (`uroman` for Devanagari; keep original script for display). Save `words.json`, `lines.json`.
3. Beats with librosa (`beats.json`) for small pulses.

## Step 2 — Pick the hook

- Choose the strongest 30 s from the timed words (the repeated hook, highest vocal energy), starting and ending on line boundaries.

## Step 3 — Story and scenes

- Read the lyrics, tell the user the story in 3-4 sentences, and list one scene per line, choosing from:
  - face close-up of the boy or girl (eyes looking around, blinking),
  - a thinking pose with a thought cloud,
  - an extreme eye close-up,
  - polaroids pinned or falling,
  - torn paper strips with the scene behind,
  - two-shot, with a small prop.
- For each: which prop pops on which word (a sunflower, a beating heart, stars, a letter), and the painted wall colour.
- **Wait for the user's OK.**

## Look

- Watercolour painting in code: layered translucent blobs with noise-displaced edges, pigment pooling at edges (darker rim), paper texture overlay (procedural grain), soft bleeds.
- Characters cut out like paper stickers: a white border (offset path ~10 px), soft drop shadow, slight lift/tilt wobble.
- Eyes: pupils move to look around on a smooth path, blink every 2.5-5 s (seeded random), blink on key words.
- Props pop on their sung words (scale 0 → 1.15 → 1 with a small sticker shake); a heart beats on the beat.
- The painted wall behind changes colour/pattern each scene.
- The song title in gold (shimmer gradient) at the start.
- A glass-shatter moment near the end: the frame cracks (radial crack lines) then breaks into shards that fall with rotation, revealing the next scene.
- Captions: each word fades up (opacity + 6 px rise, 8 frames) on its sung `start`, a soft handwritten-style font (Devanagari-capable if Hindi).

## Step 4 — Render engine

- `scene.html` with deterministic `renderFrame(t)` and a seeded PRNG. Playwright steps frames at 30 fps; PNGs piped to ffmpeg.

## Step 5 — Contact sheet

- One still per scene, labelled, `contact_sheet.png`. **Wait for "go".**

## Step 6 — Render

- `reel_1920x1080.mp4`: 1920x1080, 30 fps, H.264 CRF 18, the song's original audio for the 30 s (short fades), AAC 192k.
- `reel_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify size.

## Step 7 — If the user attached the official video

1. Sample its frames and extract a palette (k-means on pixels); use those colours for the walls and the characters' clothes, and re-render.
2. Sync by audio: cross-correlate the official video's audio with the song (e.g. `scipy.signal.correlate` on onset envelopes) to find the offset.
3. Make a 9:16 reel (1080x1920): your film on top labelled **"Claude Opus 5.5"**, the official video below labelled **"Original Video"**, both in sync, song audio, `@yourhandle`. Plus its WhatsApp copy under 20 MB.

Report all paths and sizes.
