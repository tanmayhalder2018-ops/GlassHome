---
name: latent-reel
description: Turn a comedy-show clip of a guest and a host into a flat 2D lip-synced cartoon — guest at a mic on a curtain stage, host at a desk before a glowing letter wall, reactions, HAHAHA screens and stamps on punchlines, 2-4 word captions — drawn in HTML canvas with original caricatures and an original logo. Use when the user types /latent-reel with an MP3 or MP4 clip.
argument-hint: "<clip.mp3|mp4> + traits of each person"
---

# Roast-show cartoon

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.** Lip-sync, captions and punchline hits come from forced alignment.
- Draw both people as **original caricatures** built from traits the user gives (hair, beard, cap, glasses, outfit). Never the real show's logo, name graphics or set design; the corner logo is your own original mark.
- Captions use only words actually said.
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg). No stock footage, photos or image generators.
- Work in `work/latent-reel/<slug>/`, outputs in `out/latent-reel/<slug>/`.

## Step 1 — Separate, transcribe, assign speakers

1. Extract audio if MP4. Separate voices from audience noise/music with Demucs (`--two-stems=vocals`); keep the original mix for the final audio.
2. Transcribe the vocal stem with faster-whisper (language as spoken, e.g. Hindi/Hinglish), with segment times.
3. Mark who says each line (Guest/Host) from what is said (questions/set-ups vs answers, names used), optionally helped by a diarisation pass.
4. Show the lines as `speaker | text` and **stop so the user can correct them**. Also ask for each person's traits if not given.

## Step 2 — Force-align the corrected text

- `torchaudio.pipelines.MMS_FA` on the vocal stem (`uroman` for Devanagari). Save `words.json` with speaker per word, and laughter regions (high crowd energy in the residual stem).

## Step 3 — Characters and set

- Left: the guest standing at a mic on a dark curtain stage (deep red/maroon folds, spotlight cone).
- Right: the host behind a desk in front of a big glowing letter wall (an original word/letters of your choosing, soft neon glow).
- An original small show logo in a corner.
- Lip-sync: mouth shapes (closed, small, open, wide, O, F/V) picked from the phoneme-ish letters of the current word and its energy envelope; closed between words.
- The listener reacts: a smirk, a laugh (shoulders shake), a facepalm, eyebrow raise — on punchlines and laughter regions.
- Punchlines (where the crowd laughs): cut to a black "HAHAHA" screen (bouncing letters) or slam a stamp on the picture (e.g. "ROASTED", "OOF") with a small camera shake.
- Captions 2-4 words, in the language spoken, the currently spoken word in yellow (#FFD400).

## Step 4 — Render engine

- Deterministic `renderFrame(t)` in `scene.html`, seeded PRNG, Playwright stepping frames, PNG pipe to ffmpeg. Two layouts: 16:9 (side by side) and 9:16 (guest top, host bottom or alternating close shots by speaker).

## Step 5 — Contact sheet

- Stills of talking, reacting, a HAHAHA screen and a stamp, both aspect ratios → `contact_sheet.png`. **Wait for "go".**

## Step 6 — Render and remind

- `reel_16x9.mp4` (1920x1080) and `reel_9x16.mp4` (1080x1920), 30 fps, H.264 CRF 18, the original audio, AAC 192k.
- 720p copies under 20 MB each (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
- Remind the user: a clip from a real show can get the reel muted or claimed, and they should credit the show in the caption.
