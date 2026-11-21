---
name: personal-short-form-reels
description: Edit the user's 9:16 talking-head clip into a fast personal reel — silences and fillers cut, B-roll from their own folders every 2-3 seconds, 2-3 word colour-changing captions, punch-in zooms, a live document or a staged screen recording with step chips and zooms — all placed on word times. Use when the user types /personal-short-form-reels with a talking-head clip and optional screen recording, PDF or sheet.
argument-hint: "<talking-head.mp4> [screen-recording.mp4] [doc.pdf|sheet]"
---

# Fast personal reel

## Ground rules

- **Ask before overwriting any file.**
- Every caption word, cutaway, zoom, highlight and click is placed on a word's start time, never by eye.
- Keep the user's original audio otherwise untouched: no music, no sound effects, no loudness change unless they ask.
- B-roll only from the user's own folders. No stock sites, no AI generation.
- Never re-grade, filter or retouch their face.
- No text within 250 px of the top edge or 420 px of the bottom edge.
- **Do not invent a call to action.** If they say "comment" without a keyword, ask which keyword before rendering.
- Work in `work/personal-reels/<slug>/`, outputs in `out/personal-reels/<slug>/`.

## Step 1 — Transcribe with word timings

- faster-whisper (`word_timestamps=True`), then refine with `torchaudio.pipelines.MMS_FA` force-alignment on the corrected transcript. Save `words.json`.

## Step 2 — Cut silences and fillers

- Remove silences > 0.35 s (keep 0.08 s padding) and filler words (um, uh, matlab, basically, like — only when used as fillers; show the list of cuts).
- Cut with ffmpeg `select`/`aselect` or a concat list, with 10 ms audio crossfades to avoid clicks. Re-map all word times to the new timeline (`words_cut.json`).

## Step 3 — Cutaways

- Ask for (or find) the user's B-roll folders. Index each clip: filename, folder name, duration, and a short description (sample 3 frames and describe them).
- Every 2-3 s, a matching clip cuts in full screen, picked by what is being said (keyword ↔ description match). Cut in and out on word starts. Audio stays the talking head.

## Captions and zooms

- 2-3 words at a time, no background box; white bold with a soft shadow; the currently spoken word changes colour (e.g. yellow).
- Punch-in zooms (1.0 → 1.12 in 4 frames) land on key words, back out on a later word.

## Document "live" (if a PDF/sheet is attached)

- Render pages to images (`pdftoppm` / sheet → HTML table screenshot via headless Chrome).
- On screen it scrolls, a column lights up, a cursor moves and clicks a link — each action on the word that names it.

## Screen recording (if attached)

- Each step on a clean pastel stage (soft gradient background, rounded device frame) with a numbered step chip ("1", "2"…).
- The recording is retimed to the user's words (speed-ramped segments so each tap lands on its word).
- The camera zooms to every button tapped (detect taps by frame differencing/touch indicators, or ask).
- An animated cut to the prompt, with a line-by-line yellow highlight synced to the words.

## Step 6 — Snapshots

- Three stills: a face-and-caption beat, a cutaway beat, a document/prompt beat. **Wait for OK.**

## Step 7 — Render

- `reel_1080x1920.mp4`: 30 fps, H.264 CRF 18, yuv420p, the original audio (copied/re-encoded at 192k AAC without filters).
