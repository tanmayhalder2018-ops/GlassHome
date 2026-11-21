---
name: storybook-motion
description: Make an original 8-9 minute read-along storybook video for ages 3-7 in 16:9 — pastel meadow world, rigged SVG animal characters, the spoken sentence on screen with a drop cap and words lighting up as read, join-in prompts, TTS voices — built as a HyperFrames project and safe for a Made-for-Kids channel. Use when the user types /storybook-motion with a story idea or a finished script.
argument-hint: "<story idea | script>"
---

# Read-along storybook

## Ground rules

- **Ask before overwriting any file.**
- **Original stories only**, never a retelling of a published book. Search the web for the title and premise first, so the title is not already taken; report what you found.
- Made-for-Kids safe: no subscribe or comment asks, no end-screen dead end, a note that the voice is synthetic, healthy habits inside the story.
- Work in `work/storybook-motion/<slug>/`, outputs in `out/storybook-motion/<slug>/`.

## Step 1 — Write the story

- Grade 1-2 sentences, 300-350 different words (count them with a script), one chantable refrain said at least four times, 30-40% dialogue, and a moral that a character says before the narrator does.
- If the user gave a finished script, check it against these rules and report.

## Step 2 — Story spine

- Hook in the first 8 s, title by 20 s, first join-in by 30 s.
- The hero's trait ruins things twice; three comic tries to hide it; a low point; the small friend in danger; three helpers who fail; the trait saves the day; thanks, an apology, a payoff montage, The End, and 25 s of real facts about the animal (from reliable sources, cited in the description).

## Step 3 — Join-in prompts

- 8-10 prompts (predict, feel, count along, repeat the refrain), each followed by a 2-4 s gap for the answer and a pulsing "Your turn!" pill.

## Step 4 — Voices and timing

- TTS voices per character (e.g. edge-tts voices with different pitch/rate), word timings from the TTS word-boundary events so the read-along text matches within 0.1 s. `words.json` per line.
- Every named action happens on screen within a third of a second of its word.

## Step 5 — Characters and world

- Pastel meadow: rolling hills, flowers, a pond, soft clouds.
- Chunky cute animals as **rigged SVG characters** (grouped parts with pivots), so every character looks identical in every shot.
- Idle life always: breathing, blinks, a lip flap on its own lines, small sways. A visual beat every 3-8 s.
- On screen: the spoken sentence with a drop cap, each word lighting up as it is read.

## Step 6 — Build

- Build it as a **HyperFrames** project (HTML/SVG compositions rendered to video; check the CLI with `npx hyperframes --help`), one composition per scene, elements timed from `words.json`.

## Step 7 — Review and render

- Storyboard (scene list with times) and stills → **wait for OK**.
- Render `story_1920x1080.mp4` at 30 fps, H.264 CRF 18, AAC 192k.
- Write `description.txt` with the synthetic-voice note and the animal-fact sources.
