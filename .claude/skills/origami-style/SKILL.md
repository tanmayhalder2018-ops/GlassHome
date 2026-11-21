---
name: origami-style
description: Make a 30-60 second origami music video in a folded-paper world — figures, a crane, a rose, moon, stars and paper buildings built from lit flat polygons with creases, folding like a pop-up book at 12 fps stop-motion — drawn in HTML canvas, with 16:9 film, framed 9:16 reel and WhatsApp copies. Use when the user types /origami-style with a song and lyrics.
argument-hint: "<song.mp3|mp4> + lyrics one line per row"
---

# Origami music video

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.**
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg). No stock footage, photos or image generators.
- Handle: `@yourhandle`.
- Work in `work/origami-style/<slug>/`, outputs in `out/origami-style/<slug>/`.

## Paper rendering model

- Every piece is a set of flat 3D triangles/quads (vertices in 3D, projected with a simple perspective camera).
- Each face is lit by its own normal (Lambert + small ambient, one warm key light), giving the faceted folded look.
- A thin dark crease line (1-1.5 px, 30% black) along shared edges.
- Matte paper grain texture multiplied over every face (procedural noise, seeded).
- A soft shadow under every piece (projected silhouette, blurred).
- **A fold is a face rotating about its crease edge** (Rodrigues rotation of the face's vertices around the edge axis).
- **Stop-motion:** compute the scene at 12 fps and hold each pose for two frames of the 24/30 fps output (`t_pose = floor(t*12)/12`).
- Models to build in a library (`lib/`): two origami figures, a crane, a rose, a moon, stars, paper buildings, plus new ones when needed.

## Step 1 — Pick the section

- With the user, choose the section (hook/chorus, or as named). Explain every line in plain words. **Wait for OK.**

## Step 2 — Timing

- Demucs vocals, force-align every word with `torchaudio.pipelines.MMS_FA` (`uroman` for non-Latin), librosa beats. `words.json`, `lines.json`, `beats.json`.

## Step 3 — Story

- Offer three stories that act out the words with at most two figures. Recommend one. **Wait for the pick.**

## Step 4 — Storyboard

- A new picture every 1.5-3 s; each shot's main change lands on a beat.
- Joins are real paper moves: a page turn, an unfold, a fold-away, a crane flying past the lens, a paper scatter.
- Table: shot | time | words | picture | main change on beat | join out. Save `storyboard.md`.

## Step 5 — Draw

- `scene.html` with deterministic `renderFrame(t)`, Playwright stepping frames at 30 fps, PNGs piped to ffmpeg.
- Lyrics only if the user wants them: on a paper strip that folds in, each word appearing on its sung time.

## Step 6 — Preview

- Contact sheet with **two stills per shot** (start and main change) and a short moving test (5-8 s, 720p) of one fold-heavy shot. **Wait for "go".**

## Step 7 — Render

- `film_1920x1080.mp4`: 30 fps, H.264 CRF 18, the song section with short fades, AAC 192k.
- `reel_9x16.mp4`: 1080x1920 — the film in the user's framed post format (film in a rounded frame on a paper-textured page, title on top, `@yourhandle`), text out of the top 250 px / bottom 420 px.
- WhatsApp copies of both under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify sizes.
