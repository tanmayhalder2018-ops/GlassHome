---
name: song-motion-graphics
description: Make an anime motion-graphics reel of a song part — one cel-shaded anime picture per phrase made in Google Flow (Claude in Chrome), stickers cut out with paper edges, animated in code on the beat — plus a 9:16 laptop-over-spiral reel. Use when the user types /song-motion-graphics with a song and either the part they want or a reference reel to match.
argument-hint: "<song.mp3|mp4> [part | reference-reel.mp4]"
---

# Anime motion graphics reel

You make the pictures in Google Flow in the user's Chrome (Claude in Chrome) and animate them in code.

## Ground rules

- **Ask before overwriting any file.**
- Every cut lands on a beat; each picture lands on the phrase it shows. Never guess a timing.
- Flow: tell the cost before making the images; **ask before downloading**; never upgrade. Load `anthropic-skills:chrome-browser` first.
- Song is the only audio. Label the film "AI images · Google Flow".
- Handle: `@yourhandle`.
- Work in `work/song-motion-graphics/<slug>/`, outputs in `out/song-motion-graphics/<slug>/`.

## Step 1 — Find the part

- With a reference reel: extract its audio and find the same part in the song. It may be sped up or pitched: search over speed factors (0.85-1.35, step 0.01) by resampling the reference's chroma/onset features and cross-correlating against the song; report the best offset and speed.
- Otherwise use the part the user names.

## Step 2 — Beats and phrases

- librosa beats; Demucs vocals + `torchaudio.pipelines.MMS_FA` alignment for phrase times (or vocal onset segmentation if no lyrics). `beats.json`, `phrases.json`.

## Step 3 — Shot plan

- One anime shot per phrase: soft cel shading, the same girl and boy in every prompt (identical description block). Act out the words literally: seasons, a glance, a heart, a flower, a moon behind a cloud.
- Show the plan.

## Step 4 — Flow image prompts

- One prompt per picture. Stickers on a pure flat white background; glowing things on black; backgrounds as full frames. No text.
- Tell the user the total cost before making them.

## Step 5 — Download and cut out

- Ask before downloading.
- Stickers: remove the white background (flood-fill from edges with tolerance, or `rembg` if available), then add a white paper edge (dilated alpha, ~12 px) and a soft shadow.
- Glowing-on-black: use as additive (screen) layers.

## Step 6 — Animate (1920x1080, 30 fps)

- Slow zooms, pops, swaps, slides; a bounce on every beat (scale 1.00 → 1.04 → 1.00 over 5 frames); white flashes on cuts; petals, sparkles and light flares (drawn in code).
- HTML canvas in headless Chrome with deterministic `renderFrame(t)`, PNG pipe to ffmpeg.
- "AI images · Google Flow" label small in a corner.

## Step 7 — Review

- One still per shot → `contact_sheet.png`. **Wait for OK.**

## Step 8 — Render and reel

- `film_1920x1080.mp4`: H.264 CRF 18, song section, AAC 192k.
- `reel_9x16.mp4` (1080x1920): the film on a laptop (a Flow-style laptop with a green-screen display replaced by the film) over a rotating hypnotic spiral with purple light; the song cover "x" Claude on top; a "Free Prompt" pill; `@yourhandle`; a comment keyword (ask the user for it).
- WhatsApp copies of both under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify sizes.
