---
name: animated-song
description: Make a 30-second flat 2D festive Indian night animated song video (indigo sky, rooftops, bunting, lanterns, diyas, original cute characters acting out each lyric line) drawn in HTML canvas, plus a framed 9:16 POV reel and WhatsApp copies. Use when the user types /animated-song with a song (MP3/MP4) and its lyrics.
argument-hint: "<song.mp3|mp4> + lyrics [reference.mp4]"
---

# Festive-night animated song

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing**: every word pop and scene change uses aligned word times.
- Everything is drawn in code (HTML canvas in headless Chrome, encoded with ffmpeg). No stock footage, photos or image generators.
- Handle: `@yourhandle`.
- Work in `work/animated-song/<slug>/`, outputs in `out/animated-song/<slug>/`.

## Built-in look (default)

A flat 2D festive Indian night:
- Deep indigo sky gradient (#1B1450 → #2E2A7A) with twinkling stars and a soft glow near the horizon.
- Colourful rooftops (terracotta, mustard, teal, pink) with glowing warm windows, a teal ledge in the foreground, triangle bunting strung across, paper lanterns swaying, a row of flickering diyas.
- Original cute characters: a girl in a ghagra holding a sparkler (sparks as particles), a boy in a kurta, a smiling moon with a face, small birds. Round shapes, big eyes, simple 3-4 pose rigs (arms/heads as rotated parts), blinks.

**If the user attaches a reference video:** first sample frames (`ffmpeg -vf fps=1`), look at them, tell the user what you see (palette, shapes, characters, camera, text style), and follow that look instead of the built-in one.

## Step 1 — Timing

1. Extract audio if MP4. Separate vocals with Demucs (`--two-stems=vocals`).
2. If no lyrics were given: transcribe the vocal stem with faster-whisper, show the lyrics, and **wait for the user's corrections**.
3. Force-align the lyrics with `torchaudio.pipelines.MMS_FA` (`uroman` for Hindi/other scripts; display original script). Save `words.json`, `lines.json`. Beats with librosa into `beats.json`.

## Step 2 — Pick 30 seconds and plan

- Pick the best 30 s (the hook/main lines), starting just before a sung line and ending after one.
- One scene per line: which characters, what they do to act out the line, background changes (lanterns lighting, fireworks, moon smiling), camera (slow pan along the rooftops, gentle zoom).
- Show the plan as a table (line, time, scene). Wait for OK.

## Step 3 — Lyrics on screen

- A few words at a time. Small white words; the key word of each line big in **gold (#FFC83D)**, love words (pyaar, dil, ishq, love, heart…) in **pink (#FF5FA2)**.
- Each word pops in on its sung `start` (scale 0.6 → 1.08 → 1.0 over 6 frames with a tiny glow). Line clears 0.2 s after its last word ends.
- Use a Devanagari-capable font (e.g. Baloo 2, Mukta) for Hindi; a rounded display font for Latin.

## Step 4 — Draw in code

- One `scene.html` with a deterministic `renderFrame(t)` (no `requestAnimationFrame`, no `Math.random` without a seeded PRNG).
- Playwright drives Chromium: for each frame call `renderFrame(i/30)`, read `canvas.toDataURL('image/png')` (or screenshot), pipe PNGs into `ffmpeg -f image2pipe -framerate 30 -i - ...`.

## Step 5 — Contact sheet

- One still per scene with time labels, tiled into `contact_sheet.png`. Send it and **wait for "go"**.

## Step 6 — Render

1. `song_16x9.mp4`: 1920x1080, 30 fps, 30 s, H.264 CRF 18, AAC 192k with the song section (short fades).
2. `reel_9x16.mp4` (1080x1920): the video in a rounded window (radius ~36 px, soft shadow) on a cream patterned page (subtle rangoli/paisley pattern drawn in code). On top: a song tile (title + artist) "x" a Claude tile. A red "POV" tag, a yellow "Comment" pill, `@yourhandle`. Keep text out of the top 250 px and bottom 420 px.
3. WhatsApp copies of both under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass, AAC 128k, 1280x720 / 720x1280). Verify sizes.

Report paths and sizes.
