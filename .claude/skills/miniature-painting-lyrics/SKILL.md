---
name: miniature-painting-lyrics
description: Make a ~40 second Rajasthani-Mughal miniature painting lyric video — 2x2 painting sheets and first/last-frame clips made in Google Flow via Claude in Chrome, Devanagari lyrics drawn in code with one effect per line, title card, 16:9 and 9:16 renders. Use when the user types /miniature-painting-lyrics with a song, Devanagari lyrics, title and artist.
argument-hint: "<song.mp3|mp4> + Devanagari lyrics + title + artist"
---

# Miniature painting lyric video

You plan, make the images and clips in Google Flow in the user's Chrome (Claude in Chrome), and edit.

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.**
- Flow credits: tell the user the credit cost before each generation, approve one at a time, **never upgrade** a plan or buy credits, **ask before downloading**.
- **Keep the AI watermark visible.** Never crop or cover it.
- Handle: `@yourhandle`.
- Load the `anthropic-skills:chrome-browser` skill before using Claude in Chrome. Work in a new tab; never touch the user's other tabs.
- Work in `work/miniature-painting-lyrics/<slug>/`, outputs in `out/miniature-painting-lyrics/<slug>/`.

## Step 1 — Time the song

1. Demucs vocals (`--two-stems=vocals`).
2. Force-align each sung word with `torchaudio.pipelines.MMS_FA` (romanise Devanagari with `uroman`, display Devanagari). `words.json`, `lines.json`.
3. Beats from librosa → `beats.json`.

## Step 2 — Pick ~40 s and plan

- About 40 s that starts and ends on a sung line.
- Table: line | time | picture (frame letter A-L or clip) | lyric effect. Show it and **wait**.

## Step 3 — Three painting sheets

- Three 16:9 images, each a **2x2 grid of four paintings split by thin black lines**, all in one style: Rajasthani-Mughal miniature, gouache on handmade paper, ultramarine, rose pink and marigold, fine borders, flat perspective.
  - Sheet 1: the people — every person described identically in every prompt (age, face, clothes, jewellery, colours).
  - Sheet 2: full-frame textures (sky with stars, palace wall, lotus pond, garden).
  - Sheet 3: objects (diya, veena, peacock, letter, rose…).
- No text anywhere in the images.
- Download (after asking), detect the black dividing lines (column/row darkness profile), cut into 12 frames **A to L**, each upscaled/fitted to 1920x1080 (Lanczos; pad with painted-paper colour rather than stretching).

## Step 4 — Clips from first and last frames

- Each clip in Flow from a FIRST frame and a LAST frame chosen from A-L.
- Any clip with a person must **start or end on that person's painted frame**, so the face stays the same.
- Before each clip: show the prompt, the frames, and the credit cost; wait for approval. One at a time.

## Step 5 — Review clips

- Extract at 2 fps (`ffmpeg -vf fps=2`) and look at every frame.
- Keep the good parts; drop any part where a face changes. Fill gaps with the painted frames and a slow push (1.00 → 1.05).
- Hide every join with a soft dissolve through light (white bloom), a flame, or a paint wash (luma-mask `xfade`).

## Step 6 — Lyrics in code

- Draw the lyrics on a transparent layer (HTML canvas in headless Chrome, PNG sequence with alpha or ProRes 4444), each word appearing on its sung time.
- Fonts: **Tiro Devanagari Hindi** or **Kalam**.
- Give every line one effect that matches its meaning (e.g. "दीप" glows like a flame, "हवा" drifts, "आँसू" drips, "दिल" pulses).
- Put a torn paper slip (deckled edge, paper texture) behind words when the picture is busy (measure local contrast/variance under the text box).

## Step 7 — Title

- Title in **Caladea** with the artist below, on the opening picture; fully gone before the first sung line.

## Step 8 — Review and render

- Contact sheet of stills (one per line) and **wait**.
- `film_1920x1080.mp4`: 30 fps, H.264 CRF 18, the song section with short fades, AAC 256k.
- `reel_9x16.mp4`: 1080x1920 — the film framed on a painted-paper page with `@yourhandle`; watermark kept visible.
- WhatsApp copies of both under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify sizes.
