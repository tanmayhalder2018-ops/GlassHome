---
name: 3d-explainer
description: Turn a voiceover MP3 (plus 2-3 optional article links) into a 9:16 3D animated news explainer reel built in Blender (bpy, EEVEE headless) with force-aligned captions, number pops, whooshes and a postable framed version. Use when the user types /3d-explainer or asks for a 3D news explainer from their voiceover.
argument-hint: "<voiceover.mp3> [article-url ...]"
---

# 3D news explainer

Input: the user's voiceover MP3 (required) and 0-3 article links about the topic.
Output: a 1080x1920 reel, a 720p WhatsApp copy under 20 MB, and a postable 9:16 framed version.

## Ground rules (apply to every step)

- **Never overwrite a file without asking.** Before writing any output, check whether the path exists; if it does, ask the user (AskUserQuestion) whether to overwrite, rename (`_v2`) or skip.
- **Never guess a timing.** Every cut, caption, number pop and sound sits on a force-aligned word time.
- **Never invent or round a number.** Every on-screen figure is copied exactly as written in one of the user's links (keep "₹1,234.56 crore", "3.7%", "about 40" as written). If the voice says a number that no link backs, ask the user before showing it. Keep a `sources.json` mapping each number to its URL and the exact sentence.
- Handle: `@yourhandle` (the user's handle; change it here if they give a new one).
- Work in `work/3d-explainer/<slug>/`; final files in `out/3d-explainer/<slug>/`.

## Tools

- Python 3 with `faster-whisper`, `torch`, `torchaudio` (MMS_FA), `uroman` for non-Latin text, `Pillow`, `numpy`.
- Blender 4.2+ run headless: `blender -b -P shots/<shot>.py -- --out frames/<shot> --start N --end M`.
- ffmpeg for edit, audio mix and encodes.
- Install missing pieces with pip/apt; if Blender can't run here, tell the user and offer to run it on their computer.

## Step 1 — Transcribe, then force-align every word

1. Transcribe with faster-whisper (`large-v3`, `word_timestamps=True`, language auto or as the user says). Save `transcript.txt`. Show it to the user if anything looks unsure (names, numbers) and let them correct it.
2. Force-align the corrected text to the audio with `torchaudio.pipelines.MMS_FA` (romanise Hindi/Devanagari with `uroman` first, keep the original spelling for display). Save `words.json`: `[{"w": "...", "start": s, "end": s}]`.
3. Sanity check: no word shorter than 40 ms or longer than 2 s, starts monotonic. Re-align a window if not.

## Step 2 — Plan 6-9 shots, one idea each

- Split the script into 6-9 ideas. Each shot **starts on the first word of its idea** (cut time = that word's `start`, snapped to the nearest frame at 30 fps).
- For each shot record: id, shot type, the words it covers, start/end, camera move (slow push or orbit), the glowing element, any number pop, and the key words for orange captions.
- Save `shots.json` and show it to the user as a table before building.

### Shot library (`shots/lib/`)

Each shot type is one Python module with `build(scene, params)` so it can be reused. Start with:

| Type | What it is |
|---|---|
| `globe_routes` | Earth sphere (procedural ocean/land from a Natural Earth texture), glowing arcs between lat/lon pairs that draw on over time |
| `india_pins` | Extruded map of India with glowing pins that drop in on their words |
| `phone_message` | Rounded phone body, screen emission, chat bubble that slides up with a glow trail |
| `seafloor_cable` | Dark sea floor with caustics light, a cable with pulses of light travelling along it |
| `bar_chart` | Bars that grow on their words, values as 3D text, soft reflective floor |
| `calendar` | Desk calendar whose pages flip to a date, the date glowing |
| `title_card` | Bevelled 3D headline text with a light sweep |

When a topic needs something new (a ship, a satellite, a factory), write a new module in the same pattern and add it to this table in a comment at the top of `shots/lib/__init__.py`.

### India map rule

Use an official India point-of-view boundary only: the Natural Earth **India point-of-view** admin-0 file (`ne_10m_admin_0_countries_ind`) or the Survey of India boundary, which show all of Jammu & Kashmir and Ladakh as part of India. Never the default de-facto world boundary. Convert to a curve/mesh with `shapely` + bpy and extrude.

## Step 3 — Big numbers pop in front of the camera

- For each number in a shot, find the word (or first word of the number phrase) in `words.json`. The 3D number text scales from 0 to 1.1 to 1.0 over 8 frames starting on that word's `start`, placed between camera and subject, with emission + bloom.
- Text is copied character-for-character from `sources.json`. No rounding, no "~".

## Look (every shot)

- EEVEE (`BLENDER_EEVEE_NEXT`), 1080x1920, 30 fps, filmic/AgX view, soft studio light (big area key, rim light, low fill), dark gradient world.
- Slow camera: push-in of 5-10% or an orbit of 10-25° across the shot, ease in/out.
- Bloom: in Blender 4.2+ add a compositor Glare node (Bloom/Fog Glow) — not the old EEVEE bloom checkbox.
- Motion blur on. Render to PNG sequences (`frames/<shot>/%04d.png`).

## Step 4 — Captions word by word

- Burned in at the edit stage (Pillow frames or ASS subtitles): one to three words visible, each word appears on its `start`, bold white with dark outline, **key words in orange (#FF8A00)**.
- Safe zone: no text within 250 px of the top or 420 px of the bottom.

## Step 5 — Sound

- The user's voice as the main track, untouched in pitch and timing.
- A short whoosh on every cut (start 0.15 s before the cut), a low rumble under the 1-3 biggest moments (number pops, the headline). Use sounds generated in code (filtered noise sweeps, sine sub-bass) or files the user gives; never download unlicensed sound.
- Mix: voice at -14 LUFS integrated, effects 10-14 dB under the voice; `loudnorm` on the final mix.

## Step 6 — Contact sheet, then wait

- Render one still per shot (the frame at its number pop or mid-shot), tile them with labels (shot id, start time, words) into `contact_sheet.png`, send it to the user and **stop until they say "go"**. Apply any changes they ask for and show again.

## Step 7 — Render

1. Render all shot frames, then concatenate on the cut times with ffmpeg, add captions and number overlays, mix audio:
   `out/.../reel_1080x1920.mp4` — H.264 CRF 18, yuv420p, 30 fps, AAC 192k.
2. WhatsApp copy, 720x1280, under 20 MB: video bitrate = `floor(19 * 8192 / duration_s) - 128` kbps, two-pass libx264, AAC 128k. Check the size; lower the bitrate and redo if over.
3. Postable 9:16: the reel scaled to ~86% inside a glowing rounded frame on a dark backdrop, "Made with Claude Code" on top, `@yourhandle` below, a thin progress bar that fills over the runtime, and a 2-second end card (title + handle). Same encode settings.

Report the paths, durations and sizes at the end.
