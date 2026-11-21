---
name: zach-style
description: Make a 60-second 9:16 3D fact short in the style of 3D fact channels — an x-ray body filling with blue water, glowing organs, cells and droplets on a dark studio background, built in Blender (bpy, EEVEE) from a reusable shot library, with an original script, AI voice, word captions and sound. Use when the user types /zach-style with a question, or a reel whose topic to retell in fresh words.
argument-hint: "<question> | <reel.mp4>"
---

# 3D fact short

## Ground rules

- **Ask before overwriting any file.**
- **Never reuse another creator's script or voice.** From an attached reel take only the topic; write fresh words.
- Plain facts only, checked against reliable sources; a gentle safety line on any health topic ("talk to a doctor if…").
- Never guess a timing: take every word time from the voice itself.
- Handle: `@yourhandle` small in a corner.
- Work in `work/zach-style/<slug>/`, outputs in `out/zach-style/<slug>/`.

## Step 1 — Script

- A hook question and 10-14 short lines, one idea each, in Hinglish or English (as the user wants).
- **Wait for OK.**

## Step 2 — Voice

- A free AI voice (edge-tts, e.g. `en-US-GuyNeural` or `hi-IN-MadhurNeural` for Hinglish), word boundaries saved to `words.json`.

## Step 3 — Shot plan

- One 3D shot per idea, cut on the word that starts it, with a short English label per shot.

### Shot library (`shots/lib/`, add more when needed)

| Type | What |
|---|---|
| `xray_body` | standing translucent x-ray human (fresnel glass shader, skeleton hints) that fills and drains with blue water (animated clipping plane + liquid material) |
| `organ` | glowing brain / heart (beating) / kidneys / liver, emission + subsurface |
| `cells` | floating cells with membranes, depth of field |
| `droplets` | water droplets falling / merging, refraction |
| `title` | 3D hook question text |

- Dark studio background, rim lights, slow camera pushes. EEVEE (`BLENDER_EEVEE_NEXT`), 1080x1920, 30 fps, bloom via compositor Glare.
- Render with `blender -b -P` (on the user's laptop when attached, otherwise here).

## Step 4 — Stills

- One still per shot on a sheet → **wait for "go"**.

## Step 5 — Edit

- Word-by-word captions with key words coloured; a title on the first shot; a whoosh on every cut; small SFX; a soft music bed (user-supplied or generated pad) well under the voice.
- No text within 250 px of the top or 420 px of the bottom.

## Step 6 — Render

- `short_1080x1920.mp4`: 30 fps, H.264 CRF 18, AAC 192k.
- `short_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass). Verify.
