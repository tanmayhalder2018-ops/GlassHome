---
name: shadow-puppet
description: Tell a Hindi kids' story from a voiceover and script as a tholu bommalata shadow-puppet show — black cut-out puppets with punched holes and pin joints on an orange backlit cloth screen, lamp flicker, depth moves, and the narration line in Devanagari along the bottom — drawn in HTML canvas with a 20-character, 24-prop library. Use when the user types /shadow-puppet.
argument-hint: "<voiceover.mp3> + script"
---

# Shadow-puppet story

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.**
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg). No stock footage, photos or image generators.
- **The line on screen is the user's script text, word for word.** Never retype from memory or invent; read it from the script file.
- Work in `work/shadow-puppet/<slug>/`, outputs in `out/shadow-puppet/<slug>/`.

## Look

- An orange cloth screen lit from behind: warm hot spot in the centre falling off to the edges, a faint oil-lamp flicker (low-frequency seeded noise on brightness), and the weave of the cloth (fine crossed thread texture).
- Puppets: flat black cut-outs with punched-hole patterns (circles, teardrops, rows of dots letting light through) and pin joints — arms, legs, jaws, tails and wings swing about their pins.
- The puppets wobble as if held on sticks (small rotation/translation noise), and visible thin control sticks.
- Depth: closer to the screen = sharper and smaller; back towards the lamp = softer (blur) and bigger. Use it for emphasis.
- The lamp dips (screen darkens) between scenes.
- Narration along the bottom edge in a clean Devanagari face (e.g. Noto Sans Devanagari / Mukta), the key word coloured red.

## Library (`lib/`)

Characters (20): boy, girl, king, queen, old man, old woman, farmer, sage, crow, monkey, elephant, tiger, lion, deer, fox, rabbit, tortoise, snake, fish, parrot.

Props (24+): tree, hut, palace, temple, well, pot, river, boat, mountains, sun, moon, cart, lamp, cloud, bridge, field, rock, flower, basket, drum, sword, crown, stars, rain.

Each is a JS module: parts as paths with pivot points, hole patterns, and named poses. Add new ones when a story needs them and note them at the top of `lib/index.js`.

## Step 1 — Force-align

- `torchaudio.pipelines.MMS_FA` with `uroman` romanisation of the Devanagari script; display the original. `words.json`, `sentences.json`.

## Step 2 — Scene plan

- From the script: who is on screen, what they do, which prop, and on which word each move happens.
- Table: scene | time | characters | props | moves (word → action) | key red word. **Wait for OK.**

## Step 3 — Draw

- `show.html` with deterministic `renderFrame(t)` and seeded PRNG; Playwright steps frames at 30 fps; PNG pipe to ffmpeg.
- On-screen text comes straight from `sentences.json` (the script text).

## Step 4 — Contact sheet

- One still per scene → `contact_sheet.png`. **Wait for "go".**

## Step 5 — Render

- `story_1920x1080.mp4`: 30 fps, H.264 CRF 18, the original voiceover, AAC 192k.
- `story_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify size.
