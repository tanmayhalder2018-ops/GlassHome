---
name: kids-story
description: Make a bright Hindi kids' story video from a voiceover MP3 and its script — a sunny rounded flat world, cute big-eyed characters with poses, Hindi speech bubbles, feeling icons, a reacting companion in a corner circle and a moral card — drawn in HTML canvas, plus WhatsApp and framed 9:16 versions. Use when the user types /kids-story.
argument-hint: "<voiceover.mp3> + script"
---

# Hindi kids' story

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing**: every pose change, bubble and icon is placed on an aligned word.
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg). No stock footage, photos or image generators.
- Speech bubbles and on-screen text use the user's script words exactly.
- Handle: `@yourhandle`.
- Work in `work/kids-story/<slug>/`, outputs in `out/kids-story/<slug>/`.

## Look

- Sunny, rounded world: green rolling hills, a big smiling sun, puffy clouds, simple props (tree, house, well, school, basket), soft flat colours with dark outlines (#2B2B2B, 4-6 px, round joins).
- Cute simple characters: big eyes, round shapes, each with 3-4 poses (stand, talk with arm up, surprised, sad/thinking), blinks and a small bounce while talking.
- Hindi speech bubbles for dialogue (Devanagari font such as Baloo 2), tail pointing at the speaker.
- Feelings: question marks, sparkles, hearts, sweat drops, popping near the character.
- A little original companion (e.g. a round bird or star friend) in a corner circle who reacts: wow, worried, laughing — changing on story beats.
- A moral card at the end (big friendly letters, decorated border).

## Step 1 — Force-align

- Force-align the script to the voiceover with `torchaudio.pipelines.MMS_FA` (romanise with `uroman`, keep Devanagari for display). Save `words.json` and `sentences.json`. Mark speakers from the script (quotes / names).

## Step 2 — Key moments

- Mark the problem, the idea, the solution and the moral with their word times; these drive the companion's reactions and bigger visual beats.
- Plan scenes (who, where, which poses on which words) and show the table to the user.

## Step 3 — Draw in code

- `story.html` with deterministic `renderFrame(t)` and seeded PRNG. Playwright steps frames at 30 fps; PNGs piped to ffmpeg.

## Step 4 — Contact sheet

- One still per scene with labels → `contact_sheet.png`. **Wait for "go".**

## Step 5 — Render

1. `story_16x9.mp4`: 1920x1080, 30 fps, H.264 CRF 18, original voiceover, AAC 192k.
2. `story_720p_whatsapp.mp4`: under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
3. `story_9x16.mp4`: 1080x1920 — the story inside a storybook frame (open-book border, page texture), "Made with Claude" at the top, `@yourhandle`, a progress bar along the bottom, and a 2-3 s end card. Text out of the top 250 px and bottom 420 px.

Report paths and sizes.
