---
name: breakup-chat-lyrics
description: Make a 40-60 second breakup-chat lyric video — a tilted red frosted-glass music card with a phone chat, karaoke lyrics, a shattering card, night scenes, pink-neon chorus on a wet floor and a fire title — drawn in HTML canvas at 1920x1080. Use when the user types /breakup-chat-lyrics with a song, lyrics, cover image, 2-4 chat lines and optional clips/photos.
argument-hint: "<song.mp3|mp4> + lyrics + cover.jpg + chat lines [clips/photos]"
---

# Breakup-chat lyric video

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a time.** Words, beats and section starts come from Demucs + MMS_FA + librosa.
- Draw on an HTML canvas in headless Chrome and encode with ffmpeg.
- Handle: `@yourhandle`, small in a corner.
- Work in `work/breakup-chat-lyrics/<slug>/`, outputs in `out/breakup-chat-lyrics/<slug>/`.

## Step 1 — Timing

1. Extract audio if MP4. `python -m demucs --two-stems=vocals song.wav`.
2. No lyrics given? Transcribe the vocal stem (faster-whisper), show them and **wait for corrections**.
3. Force-align with `torchaudio.pipelines.MMS_FA` (`uroman` for non-Latin scripts). Save `words.json`, `lines.json`.
4. librosa beats and onset strength → `beats.json`; find instrumental breaks (long gaps with no aligned words).

## Step 2 — Pick the part and plan

- Choose 40-60 s that **begins in the instrumental intro** (so the chat can play first) and includes a chorus and, if possible, an instrumental break.
- Table: line, time, which part (intro card / karaoke / shatter / night scene / chorus neon / fire title), which scene or clip.
- **Wait for the user's OK.**

## Step 3 — Intro: frosted-glass card with the chat

- A dark red frosted-glass music card (blurred backdrop of the cover, rgba red tint, thin light border, inner glow), tilted ~6° in 3D with a slow drift. Cover art, title, artist.
- The user's chat plays inside it like a phone: their red bubbles pop in one by one, then "Read" appears, then typing dots, then the grey reply bubble. Time it so the reply lands **about 2 s before the first sung word**.

## Step 4 — Karaoke card

- The card turns into karaoke: the current line's words brighten from 40% to 100% white as each is sung (fill sweep across the word over its duration). The next line waits below, blurred. Huge dim red words from the lyrics scroll slowly behind the card.

## Step 5 — Shatter into night scenes

- Thin light cracks run across the card (animated polyline growth from an impact point), then it bursts into shards that fly toward the camera (scale + rotation + perspective) with a red glow flash.
- Then full-screen night scenes with a slow push-in (Ken Burns 1.00 → 1.06). Use the user's clips/photos; with none, draw the scenes in code (city at night, empty street, window with rain, a lone bench).
- Lyrics sit in the empty sky, **never on a face** (if photos have faces, detect them with OpenCV Haar/DNN and keep text out of those boxes). Layout: a small row, a big bold row, and the last word handwritten in pink.

## Step 6 — Chorus in pink neon

- Scenes take a pink grade; words drop in from above, flicker like neon, and land on a wet floor that mirrors them (flipped, blurred, faded reflection with ripple distortion), light rain streaks over everything.

## Step 7 — Instrumental break: fire title

- On an instrumental break, the song title appears in giant letters with fire burning inside them (procedural flame noise clipped to the letter shapes), the band/artist name above. The letters grow until the flames fill the screen, leading into the next part.

## Step 8 — Finish and render

- Film grain, a soft vignette, short white/red flashes between parts, `@yourhandle` small in a corner.
- Deterministic `renderFrame(t)` + seeded PRNG; Playwright steps frames at 30 fps, PNG pipe into ffmpeg.
- Show the user stills (one per part) in `contact_sheet.png` and **wait**.
- Render `video_1920x1080.mp4`: 1920x1080, 30 fps, H.264 CRF 18, the song section with fade-in and fade-out, AAC 192k.
- `video_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify size.
