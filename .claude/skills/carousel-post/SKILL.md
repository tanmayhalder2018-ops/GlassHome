---
name: carousel-post
description: Build a 1080x1350 Instagram carousel that shows off one or two finished films and teaches how they were made, in the user's paper design (cream grain, black hard-shadow cards, serif headlines, yellow marker, red handwritten notes) with a continuous film strip of real frames, a receipt slide and a fill-in prompt. Use when the user types /carousel-post with a film and optionally a reference post or angle.
argument-hint: "<film.mp4> [film2.mp4] [reference post or angle]"
---

# Carousel post

## Ground rules

- **Ask before overwriting any file.**
- Build slides with **Pillow only**.
- No face cutouts, no real logos, no statistics the user did not give, nothing quoted from the lyrics.
- Work in `work/carousel-post/<slug>/`, outputs in `out/carousel-post/<slug>/`.

## Design system

- Canvas 1080x1350. Cream paper (#F3ECDD) with procedural grain (noise + faint fibres).
- Black cards (#111) with a hard offset shadow (12 px, no blur).
- Serif headlines (e.g. DM Serif Display / Playfair), body in a clean sans.
- Yellow marker highlight (#FFE14D, rough edges, slight angle) behind key words.
- Handwritten red notes (#D7263D, Caveat or similar) with arrows.
- **Signature 1 — the film strip:** real frames from the film placed on one long strip (sprocket holes, frame gaps) that runs unbroken across every slide at the same height, so swiping feels like scrubbing. Build it as one wide image (N × 1080 px) and slice it.
- **Signature 2 — the receipt:** a torn-paper receipt slide (zig-zag torn edges, monospace) listing runtime, frames and file size read from the real file, and a total line "1 TOOL".
- **Signature 3 — the prompt:** a fill-in-the-blanks prompt with the blanks in yellow marker.
- Any slide can instead be a short video (MP4, 1080x1350, 4-8 s, e.g. the strip scrolling or the receipt printing) if the user wants.

## Step 1 — Read the project

- Use `ffprobe` for runtime, fps, frame count (`nb_frames` or `-count_frames`), resolution, file size, codecs.
- Read credits and the command from the project's files (README, episode.json, SKILL.md) if present.
- Ask the user only for what can't be read (angle, comment keyword list, handle).

## Step 2 — Contact sheet for frame picks

- `ffmpeg -vf "fps=1/2,scale=320:-1,drawtext=text='%{pts\:hms}'..." ` then tile into `contact_sheet.png` with timestamps. Send it.
- Pre-pick frames with **no lyric text** (check with OCR, e.g. pytesseract, or by eye on the sheet). If a frame must carry text, Gaussian-blur the text region.
- Let the user confirm or swap picks.

## Step 3 — Build the slides

In order:
1. Cover — big serif hook, marker on one word, the strip starts.
2. One or two film slides — large frames in black cards with numbered pins (1, 2, 3) and red handwritten notes explaining what's happening.
3. The receipt.
4. The kit — what you give (files) and the one tool.
5. The setup lines — the exact steps/command in a black card, monospace.
6. The prompt — fill in the blanks.
7. Call to action in three steps, ending with the comment keyword.

## Step 4 — Check every slide

Automate a check script that verifies:
- No text box crosses the side margins (64 px) or overlaps the film strip band.
- Every glyph exists in its font (`font.getmask` / fontTools cmap check) — no tofu boxes.
- The comment keyword matches the user's keyword list exactly.
Fix and re-check until clean.

## Step 5 — Caption and review

- Write `caption.txt` (hook line, 3-5 short lines, the CTA with the keyword, a few hashtags).
- Show the slides (a strip preview of all slides side by side) and the caption. **Wait for the user's OK** before calling it final.
