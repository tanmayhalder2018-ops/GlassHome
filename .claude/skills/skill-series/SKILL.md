---
name: skill-series
description: Package one episode of the user's daily series — a 9:16 video with a hook (about a hundred tool chips and a counter collapsing into one "Claude" chip), a four-step HOW box, the untouched result video with its own audio, and an end card — plus a numbered grid cover, the caption and episode.json, in the Build Manual look. Use when the user types /skill-series with a day number and a finished result video.
argument-hint: "<day-number> <result.mp4> [original.mp4]"
---

# Series episode packager

## Ground rules

- **Ask before overwriting any file.**
- **Never re-grade or trim the result.** It plays untouched with its own audio. The episode is the result plus about 13 seconds.
- Show only what the free skill does; anything extra goes in a separate "ask" line.
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg).
- Handle: `@yourhandle`.
- Work in `work/skill-series/day-<N>/`, outputs in `out/skill-series/day-<N>/`.

## Build Manual look

- Navy background (#0E1A3A), pink (#FF4F9A) and blue (#3DA5FF) accents.
- Arial for text, Consolas for commands.
- Coloured left-bar boxes (a 10 px coloured bar on the left of each info box).
- The watermark (`@yourhandle`) small in a corner throughout.

## Step 1 — Gather

- From the user or the project's own files (the skill's SKILL.md, README, earlier `episode.json`): the hook line, the command (e.g. `/sketch-music-video`), the files to give, the comment keyword, the skill author's credit.
- Confirm the list with the user.

## Episode structure (1080x1920, 30 fps)

1. **Hook (~4 s):** about a hundred generic tool chips (plain rounded labels like "Editor", "Captions app", "Stock site" — no real product names or logos) crowd in while a counter climbs to 100, then spiral into one "Claude" chip as the counter flips to 1. Hook line on top.
2. **HOW box (~6 s):** four numbered steps in left-bar boxes:
   1. What you give (the files).
   2. The one command, typed character by character into a copy box (Consolas, a copy icon).
   3. Check the stills.
   4. Render it.
   Plus the "ask" line, if any.
3. **The result**, untouched, with its own audio, fitted into the 9:16 frame (letterboxed on navy if not 9:16; never cropped or re-coloured).
4. **End card (~3 s):** the comment keyword, `@yourhandle`, the credit for the skill's author, "Follow for the next day".

## Step 3 — Preview

- A preview (stills of hook, HOW box, result frame, end card, and a low-res full preview MP4) and the cover. **Wait for "go".**

## Step 4 — Render and files

- `day-<N>_1080x1920.mp4`: H.264 CRF 18; the result segment stream-copied if its format matches, else re-encoded at high quality without filters.
- `day-<N>_720p.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
- `cover.png`: numbered grid cover (1080x1920 or 1080x1350) with "DAY <N>" and the hook.
- `caption.txt`: hook, the steps, keyword CTA, credit.
- `episode.json`: day, hook, command, files, keyword, credit, durations, output paths.
