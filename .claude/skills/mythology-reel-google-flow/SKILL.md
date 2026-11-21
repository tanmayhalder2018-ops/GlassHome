---
name: mythology-reel-google-flow
description: Make a 60-90 second 9:16 Hindi devotional story reel on a mythology topic — Hindi script with source noted, a free Hindi neural voice, one devotional painting per line made in Google Flow (Claude in Chrome), a few animated clips, gold word-by-word captions and soft sound. Use when the user types /mythology-reel-google-flow with a topic, e.g. why sindoor is offered to Hanuman ji.
argument-hint: "<topic>"
---

# Painted mythology reel

## Ground rules

- **Ask before overwriting any file.**
- Write the story in your own words; say where it comes from (a Purana, the Ramayana, the Mahabharata) or call it a folk belief when there is no clear text. Treat the subject with respect.
- Flow: read the credit price before each clip, approve one at a time, **never upgrade**, **ask before downloading**. Load `anthropic-skills:chrome-browser` before using Claude in Chrome; work in a new tab.
- Handle: `@yourhandle`; corner label "AI art + AI voice".
- Work in `work/mythology-reel/<slug>/`, outputs in `out/mythology-reel/<slug>/`.

## Step 1 — Script

- 12 to 16 short Hindi lines (Devanagari): an opening question, the story, the custom today, the lesson, and a last line inviting comments.
- Note the source under the script.
- Show it and **wait for the user's OK**.

## Step 2 — Narration

- Narrate with a free Hindi neural voice: `edge-tts --voice hi-IN-MadhurNeural` (or `hi-IN-SwaraNeural`), one line per file or one file with the word-boundary events.
- Save each line's start and end (and word boundaries) in `lines.json`. If word boundaries are missing, force-align with `torchaudio.pipelines.MMS_FA` + `uroman`.
- Give each line a 2-4 word caption (Devanagari) taken from the line.

## Step 3 — Picture prompts

One prompt per line, all in a single rich devotional style:
- soft golden light, a glowing halo behind each deity, gold jewellery and silk, saffron, vermilion and royal blue, painterly detail;
- 9:16 vertical, a calm, uncluttered bottom quarter (for captions), **no text** in the image;
- every character described the same way every time (save a `characters.md` block and paste it verbatim).

## Step 4 — Make them in Flow

- Make the first picture alone and show it; adjust the style if needed.
- Then 3-4 pictures per message in the same style.
- Turn 3 or 4 key pictures into 8-second clips with gentle motion and no speech (frames-to-video from the picture). Read the credit price before each clip, approve one at a time.
- Ask before downloading.

## Step 5 — Edit

1080x1920, 30 fps:
- One shot per line, timed to the narration line.
- Slow zooms and pans on stills (Ken Burns), the clips where they fit.
- Soft dissolves, a golden flash on each cut, falling petals overlay (drawn in code).
- Gold Hindi captions word by word on word times, in the calm bottom quarter but above the bottom 420 px.
- A big title on the first shot, a comment button on the last.
- `@yourhandle` and "AI art + AI voice" small in a corner.
- Soft sounds (temple bell, soft drone) generated or user-supplied, kept 15+ dB under the voice.

## Step 6 — Review and render

- One still per shot in `contact_sheet.png`; **wait**.
- `reel_1080x1920.mp4`: H.264 CRF 18, AAC 192k.
- `reel_whatsapp.mp4` under 20 MB (720x1280, video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify size.
