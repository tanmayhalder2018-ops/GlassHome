---
name: spotify-particle-lyrics
description: Make a royal-blue 16:9 lyric video switching between four looks — a tilted Spotify-style lyrics card, a 20,000-dot particle portrait that swirls into a second picture, gold motion-graphics words with a moon and word cylinder, and a rain-on-glass player ending — drawn in HTML canvas, plus 9:16 and 16:9 "Made with Claude" reels. Use when the user types /spotify-particle-lyrics with a song, lyrics, artist photo and Spotify logo.
argument-hint: "<song.mp3|mp4> + lyrics + artists.jpg + spotify-logo.png"
---

# Particle lyric reel

## Ground rules

- **Ask before overwriting any file.**
- **Never guess a timing.** Separate vocals, force-align every word, find the beat.
- Draw everything in code (HTML canvas in headless Chrome, ffmpeg). No stock footage or image generators; the only images are the files the user attached.
- Royal blue palette everywhere (#0B1F6B, #1E3FBF, #4C7DFF, white, soft gold accents only in look 3).
- 1920x1080, 30 fps.
- Handle: `@yourhandle`.
- Work in `work/spotify-particle-lyrics/<slug>/`, outputs in `out/spotify-particle-lyrics/<slug>/`.

## Timing

- Demucs vocals; `torchaudio.pipelines.MMS_FA` alignment (`uroman` for non-Latin); librosa beat and onset strength.
- Propose the sections (which look for which lines) and tell the user which lines are sung and which are rapped (rapped = high syllable rate, low pitch variance). Wait for OK.

## Look 1 — Spotify card

- A deep royal-blue lyrics card with the cover, title, artists and the logo the user attached, tilted in 3D (CSS-like perspective transform done in canvas) with a slow drift.
- Each word fades from dark to white as it is sung, with a soft glow, a burst of sparks and a small light running along it.
- Lines far from the sung one are blurred.

## Look 2 — Particle portrait

- Cut the photo out (`rembg` or a simple matte), then redraw it as 20,000+ white dots on deep navy (sample by luminance).
- Dots breathe on the beat; blue and white embers drift up.
- On one chosen word every dot swirls into a second picture (a second photo, or the song title drawn in its own script) with a flash ring.
- **No names shown.**
- Lyrics pop in on the right: white bold caps rows and light-blue italic serif rows, bouncing on the beat; each block blurs out before the next.

## Look 3 — Gold motion graphics

- Gold serif words changing fast with a motion blur, a moon on a starfield, a word wall that turns like a cylinder.
- Each lyric shown only once.

## Look 4 — Rain ending

- A black-and-white music player seen through a wet window: every drop refracts the picture behind it (sample a flipped, magnified patch), drops run down; grain and a vignette.

## Transitions

- White flash or a blur between looks.

## Review

- Contact sheet of stills (several per look) → **wait for "go".**

## Render

- `video_1920x1080.mp4`: H.264 CRF 18, the song, AAC 192k.
- `video_720p_whatsapp.mp4` under 20 MB (video kbps = `floor(19*8192/duration) - 128`, two-pass).
- `reel_9x16.mp4` (1080x1920): "Made with Claude" reel of the best 30 s with `@yourhandle`.
- `reel_16x9.mp4`: a 16:9 version of that reel.
- Behind both reels: the song's lyrics as a faint tilted wall that scrolls, with the sung line lit on time.
- Verify all sizes.
