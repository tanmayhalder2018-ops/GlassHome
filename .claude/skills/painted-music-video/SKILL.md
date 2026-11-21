---
name: painted-music-video
description: Make a painted-style music video of up to 40 seconds of a song's chorus from chained 8-second Google Flow clips (Claude in Chrome), each starting on a sung line and ending on a frame that hides the cut, edited with ffmpeg, with framed 16:9/9:16 reels and WhatsApp copies. Use when the user types /painted-music-video with a song, lyrics and the song cover.
argument-hint: "<song.mp3|mp4> + lyrics + cover.jpg"
---

# Painted music video

You plan, make the clips in Google Flow in the user's Chrome (Claude in Chrome), and edit.

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.**
- Flow: tell the total credits before spending any, approve one clip at a time, **never upgrade**, **ask before downloading**. Load `anthropic-skills:chrome-browser` first; use the user's open Flow tab only for Flow.
- **Keep the AI watermark visible.** Never crop or hide it.
- Handle: `@yourhandle`.
- Work in `work/painted-music-video/<slug>/`, outputs in `out/painted-music-video/<slug>/`.

## Step 1 — Pick the part

- Up to 40 s of the main chorus, starting and ending on a sung line.

## Step 2 — Explain

- Explain every line in plain words and what the part is about. **Wait for OK.**

## Step 3 — Timing

- Demucs vocals; force-align with `torchaudio.pipelines.MMS_FA` (`uroman` for non-Latin); librosa beats. `words.json`, `lines.json`, `beats.json`.

## Step 4 — Story

- Three story ideas that act out the words, at most two characters, in a painted (not realistic) style. Recommend one. **Wait for the pick.**

## Step 5 — Clip plan

- One 8-second clip per lyric moment. Each clip starts on a sung line and ends on a frame that hides the cut: a veil across the lens, a push into a rose, wings filling the frame.
- Table: clip | line | start time | action | ending frame. **Wait.**

## Step 6 — Prompts

- One prompt per clip. The same `STYLE`, `CHARACTERS` and `RULES` blocks repeated word for word in every prompt. RULES: no text or letters, quiet ambience only, no music, no voices, 16:9.
- Tell the user the total credits for all clips before spending any.

## Step 7 — Make the clips

- Make Clip 1 in the open Flow tab and show the user.
- Make each next clip from the last frame of the one before (export the last frame with `ffmpeg -sseof -0.05 -i clipN.mp4 -frames:v 1 lastN.png` and use it as the first frame). Check each with the user. One at a time.
- Ask before each download.

## Step 8 — Edit with ffmpeg

- The song is the only audio.
- Each clip trimmed so it begins on its line start.
- Soft dissolves (`xfade=fade` or a luma mask) on the planned hiding frames.
- One colour finish on all clips (shared curves/eq chain or one LUT).
- A soft ending that fades out before the next line would be sung.

## Step 9 — Watermark

- Check the final frames: the Flow watermark is still visible on every clip.

## Step 10 — Export

- `film_1920x1080.mp4`: 30 fps, H.264 CRF 18, AAC 256k.
- 16:9 reel (1920x1080) and 9:16 reel (1080x1920): the film in a window on a page coloured from the film (dominant colours via k-means), the song cover "x" Claude on top, the song credit (title — artist) and `@yourhandle`.
- WhatsApp copies under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify sizes.
