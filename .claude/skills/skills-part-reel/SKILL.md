---
name: skills-part-reel
description: Make a 40-60 second 9:16 "Part N" reel showing five of the user's Claude video skills — a terminal card typing each command and playing the real finished video, the user's avatar talking with a Hinglish voiceover and word captions, a "bas Claude" payoff, keyword CTA — in Hindi and English, plus the PDF guide the keyword promises. Use when the user types /skills-part-reel with a part number.
argument-hint: "<part-number> [skill names]"
---

# "Part N" skills reel

## Ground rules

- **Ask before overwriting any file.**
- Only say what each skill really does: read its `.claude/skills/<name>/SKILL.md` description first. **No invented numbers.**
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg).
- Handle: `@yourhandle`.
- Work in `work/skills-part-reel/part-<N>/`, outputs in `out/skills-part-reel/part-<N>/`.

## Step 1 — Pick five skills

- List `.claude/skills/*` and find finished videos for each (in `out/<skill>/`, or ask).
- Exclude skills used in earlier parts (read `out/skills-part-reel/part-*/part.json`).
- If the user named skills, use those (still checking they have a finished video).

## Step 2 — Script and voice

- Hinglish script (Hindi in Latin letters mixed with English), 40-60 s: hook, five skills (one or two lines each, true to the description), payoff ("editing apps? ~~X~~ ~~Y~~ … bas Claude"), CTA with the part's keyword, "Part N+1 ke liye follow".
- Also an English version.
- Voice with a TTS voice (e.g. edge-tts `hi-IN-MadhurNeural` for Hinglish, `en-IN-PrabhatNeural` for English) and time every word from the word-boundary events; refine with MMS_FA if needed. `words_hi.json`, `words_en.json`.

## Look

- Plum page background (#3B1636 → #5A2350 gradient, subtle grain).
- A terminal card: dark rounded window with traffic-light dots; it types each skill's command with its attachment chip (e.g. 📎 song.mp3), shows a short "what should I make?" exchange, then the user's real finished video plays inside the card with its own sound low (-18 dB) under the voice.
- The user's avatar picture below, moving with the phrases: a tilt, a nod, a rock, a wagging hand, blinks — **no lip sync**.
- Word-by-word captions under the avatar.
- Payoff: generic editing-app labels (no real logos) struck out one by one, then "bas Claude".
- Ending: comment the keyword, a DM card preview, a Follow pill for the next part.
- Keep text out of the top 250 px and bottom 420 px.

## Step 4 — Review

- Show the skill choices, the script and 4-5 stills. **Wait for go.**

## Step 5 — Render

- `part-<N>_hi_1080x1920.mp4` and `part-<N>_en_1080x1920.mp4`: 30 fps, H.264 CRF 18, AAC 192k.
- 720p copies under 20 MB each (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
- `part-<N>_guide.pdf`: the PDF guide the keyword promises — one page per skill (what it makes, what to attach, the command, the steps), built with reportlab or HTML→PDF in headless Chrome.
- `part.json`: part number, skills used, keyword, outputs.
