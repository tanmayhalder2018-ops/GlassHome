---
name: ai-music-video
description: Plan, storyboard and edit a 30-60 second AI music video in which Google Flow clips act out the lyrics a few words at a time, with masked joins and beat-cut edits. Use when the user types /ai-music-video with a song (MP3, WAV or MP4) and its lyrics, one sung line per row.
argument-hint: "<song.mp3|wav|mp4> + lyrics pasted one line per row"
---

# Storyboarded AI music video

The user is the director: they choose the song, the story, the style and the takes. You plan, write prompts, review and edit.

## Ground rules

- **Ask before overwriting any file** (check the path first; offer overwrite / new name / skip).
- **Never guess a timing.** Every cut lands on an aligned word or a detected beat.
- **Keep the AI watermark visible.** Never crop, blur, scale away or cover it.
- The song is the only audio in the final film.
- Wait at every gate marked **WAIT**.
- Work in `work/ai-music-video/<slug>/`, outputs in `out/ai-music-video/<slug>/`.

## Step 1 — Pick the section with the user

- Default to the hook/chorus, or the part the user names. Aim for 30-60 s that starts and ends on a sung line.
- Explain every line in plain words, then what the whole part is about (feeling, who is speaking to whom).
- **WAIT** for the user's OK on the section.

## Step 2 — Time everything

1. If MP4, extract audio: `ffmpeg -i in.mp4 -vn -ac 2 -ar 44100 song.wav`.
2. Separate vocals: `python -m demucs --two-stems=vocals -n htdemucs song.wav`.
3. Force-align the user's lyrics to the vocal stem with `torchaudio.pipelines.MMS_FA` (romanise non-Latin scripts with `uroman`, display the original). Save `words.json` and `lines.json` (line start = first word start, line end = last word end).
4. Beats with librosa on the full mix: `librosa.beat.beat_track(y, sr, units="time")`, plus onset strength for downbeats. Save `beats.json`.
5. Sanity-check alignment by listening points: print a table of line, start, end; flag any word under 40 ms.

## Step 3 — Story and look

- Offer **three story ideas** that act the words out literally (at most two characters) and **three non-realistic looks** (e.g. painted gouache, claymation, paper cut-out, ink wash, cel anime). One sentence each on why it fits.
- Recommend one of each. **WAIT** for the user's pick.

## Step 4 — Literal storyboard

One shot per lyric moment (a few words), a new picture every 1.5-3 s. For each shot:

| # | Time (from line start) | Lyric words | In the frame | Camera move | Handoff frame (end) |
|---|---|---|---|---|---|

- The handoff frame hides the join: a hand over the lens, a door closing, a cloud filling the frame, a wing sweeping past, a push into darkness. The next shot opens out of the same thing.
- Save `storyboard.md`. Show it.

## Step 5 — Master prompt for Google Flow

Write one paste-ready document, `flow_prompt.md`:

- A `STYLE` block, a `CHARACTERS` block (every character described identically: age, hair, clothes, colours) and a `RULES` block (no text, no letters, no logos in the picture; quiet ambience only, no music, no speech; 16:9; one continuous shot).
- Then one block per clip: `CLIP n — <lyric words>`, followed by STYLE, CHARACTERS and RULES **repeated word for word**, then the shot action, camera move and the ending handoff frame.
- Tell the user how many clips there are. Then **stop and WAIT** for their clips.

## Step 6 — Review the clips

When clips are attached:

1. Extract frames (`ffmpeg -i clip.mp4 -vf fps=4 review/clip%02d_%04d.png`) and make a per-clip strip.
2. Check each against the storyboard: right action, characters consistent, no text, handoff frame present, no warped faces/hands.
3. For each bad clip give: the exact first frame and last frame to use (describe them, and export them as PNGs from neighbouring clips for Flow's frames-to-video), plus a repair prompt (same STYLE/CHARACTERS/RULES blocks, fixed action).
4. Never crop the watermark while reviewing or editing.

## Step 7 — Edit with ffmpeg

- Cut each clip so its first frame lands on its line/word start, nudged to the nearest beat when within 80 ms.
- Masked transitions on the handoff frames: use an `xfade` (`fadeblack`, `circleclose`, `radial`, or a luma mask from the handoff frame itself) of 6-12 frames.
- One colour finish on all clips (a shared `eq`/`curves`/`colorbalance` chain or one `.cube` LUT via `lut3d`).
- Audio: the song section only (`atrim` + 0.3 s fade-in/out), nothing else.

## Step 8 — Export

- `film_1920x1080.mp4`: 1920x1080, 30 fps, H.264 CRF 18, yuv420p, AAC 256k.
- `film_720p_whatsapp.mp4`: under 20 MB — video kbps = `floor(19*8192/duration) - 128`, two-pass, AAC 128k; verify size.
- Only if the user asks: lyric captions (word-timed from `words.json`) and a 9:16 reframe (blurred-fill background or centred crop that keeps the watermark in frame).

Report paths, durations and sizes.
