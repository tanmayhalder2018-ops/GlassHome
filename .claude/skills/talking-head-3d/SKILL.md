---
name: talking-head-3d
description: Turn the user's 9:16 talking-head clip into a 3D science-Shorts-style explainer — Blender (bpy, EEVEE) shots with whip-in camera moves cut on the exact word that starts each idea, tightened pauses, yellow hook bar, Hinglish word captions, glowing labels, music bed and SFX. Use when the user types /talking-head-3d with a clip and optionally a reference Short link.
argument-hint: "<talking-head.mp4> [reference-short-url]"
---

# Talking head to 3D explainer

## Ground rules

- **Ask before overwriting any file.**
- **The user's content stays theirs**: words and message do not change. From a reference take only the editing language (pacing, motion, transitions, sound), never its pictures or text. If the link can't be opened, tell the user before going on.
- Every shot start, label and keyword is placed on a word time.
- 3D text in English only; Hindi lives in the captions.
- No text within 250 px of the top or 420 px of the bottom.
- Render in Blender on the user's laptop when available (attach their computer); otherwise here if Blender runs.
- Work in `work/talking-head-3d/<slug>/`, outputs in `out/talking-head-3d/<slug>/`.

## Step 1 — Reference

- If a link is given, fetch it (yt-dlp if allowed) and note: average shot length, camera moves, transitions, sound design. Write `reference_notes.md`. Do not copy its visuals or text.

## Step 2 — Transcribe and tighten

- faster-whisper word timestamps, refined with MMS_FA. Tighten pauses > 0.3 s down to ~0.12 s; re-map word times (`words_cut.json`).

## Step 3 — Shot list

- One idea per 3D shot, every 1.5-7 s, each cut on the word that starts the idea. One or two personal beats where the face comes back.
- Table: shot | start word/time | 3D scene | camera move | glowing label | SFX. Show it.

## Step 4 — Build the shots in Blender

- `blender -b -P shots/<shot>.py -- --frames N --out frames/<shot>`; reusable modules in `shots/lib/`.
- EEVEE (`BLENDER_EEVEE_NEXT`), 1080x1920, 30 fps, motion blur on, bloom via compositor Glare node.
- Camera: a fast whip-in (8-10 frames, ease-out) that settles into a slow orbit or push.
- Glowing English labels (emission text) on each shot.

## Step 5 — Stills

- One still per shot → `contact_sheet.png`. **Wait for "go".**

## Step 6 — Edit and render

- The narration with tightened pauses; 3D shots on their words; a whoosh on every cut; face back for the personal beats.
- Yellow hook title bar at the start.
- Word-by-word Hinglish captions: spoken word in yellow, key words in orange.
- Quiet music bed from the YouTube Audio Library — ask the user to download the track they choose (it can't be fetched automatically) — at -24 to -28 LUFS under the voice; small SFX on the 3D moments.
- `reel_1080x1920.mp4`: 30 fps, H.264 CRF 18, AAC 192k.
- `reel_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
