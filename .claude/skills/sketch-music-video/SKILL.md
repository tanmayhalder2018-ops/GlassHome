---
name: sketch-music-video
description: Make a sketchbook lyric video — small grey pencil drawings that draw themselves line by line with light cross-hatching, each lyric hand-lettered letter by letter while it is sung, earlier pages fading as the camera moves on, ending on the full page — drawn in HTML canvas, optionally with a side-by-side 9:16 comparison with the official video. Use when the user types /sketch-music-video with a song MP3 and lyrics.
argument-hint: "<song.mp3> + lyrics (blank row between verses) [official-video.mp4]"
---

# Pencil-sketch lyric video

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.**
- Draw every picture in code (pencil strokes on an HTML canvas in headless Chrome, ffmpeg). No stock footage, photos or image generators.
- Handle: `@yourhandle`.
- Work in `work/sketch-music-video/<slug>/`, outputs in `out/sketch-music-video/<slug>/`.

## Step 1 — Separate and align

- Demucs vocals; force-align every lyric word with `torchaudio.pipelines.MMS_FA` (`uroman` for non-Latin). Also per-letter times: spread each word's duration over its letters (proportional to glyph width) so lettering happens exactly while it is sung. `words.json`, `lines.json`; verses split on blank rows.

## Step 2 — Story and drawing plan

- Read the lyrics, tell the user the story, and plan one drawing per verse (what it shows, where it sits on the page).
- **Wait for OK** before drawing.

## Look

- Paper: off-white sketchbook page with tooth texture, faint spiral binding or gutter.
- Pencil: grey graphite strokes with pressure variation (width/opacity along the stroke), slight jitter, double strokes on contours; light cross-hatching in the shadows; only rare soft colour (a single watercolour-pencil accent).
- Drawings draw themselves line by line (stroke-dash reveal in drawing order) across their verse.
- Each lyric line is hand-lettered beside its drawing, letter by letter, exactly while it is sung (handwriting font such as Caveat/Kalam, revealed by a pen-tip mask).
- Earlier drawings and lines stay on the page, faded to ~60%, as the camera pans/zooms on to the next spot. The end pulls back to show the full page.

## Step 3 — Render engine

- `sketch.html` with deterministic `renderFrame(t)`, seeded PRNG; Playwright stepping frames at 30 fps; PNG pipe to ffmpeg.

## Step 4 — Contact sheet

- One still per drawing plus the final full page → `contact_sheet.png`. **Wait for "go".**

## Step 5 — Render

- `video_1920x1080.mp4`: 30 fps, H.264 CRF 18, the song's original audio, AAC 192k.
- `video_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify size.

## Step 6 — If the official video is attached: 9:16 comparison reel

- Sync by audio: cross-correlate onset envelopes of the official video's audio and the song to get the offset.
- 1080x1920: your video on top labelled **"Claude Opus 5.5"**, the official video below labelled **"Original Video"**, in sync, on an aesthetic sketchbook background (paper, doodles in margins), `@yourhandle`. Plus a WhatsApp copy under 20 MB.

## Step 7 — If the official video is attached: match its colours

- Sample its frames; extract the palette (k-means) and texture traits (grain level, scratches).
- Set the paper, pencil, lyric and accent colours from it, and add matching film grain and scratches — in both the film and the 9:16 reel. Re-render.
