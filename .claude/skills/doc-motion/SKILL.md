---
name: doc-motion
description: Make a narrated 8-20 minute YouTube business/biography documentary in Hindi or English (16:9) with restrained Apple-style typography, real footage and article props, sources highlighted on screen, built as a HyperFrames project, plus a 9:16 teaser and a YouTube pack. Use when the user types /doc-motion with a topic and research (links, notes, articles).
argument-hint: "<topic> + research links/notes"
---

# Documentary motion design

## Ground rules

- **Ask before overwriting any file.**
- Real footage and article props, not AI pictures. **Label nothing as AI when it is not**, and label anything that is.
- Whenever a number or claim is said, the source is on screen: a screenshot/prop of the real article with a yellow marker sweep over the real sentence.
- Contested figures are marked on screen and in the script as "estimate" or "company claim".
- Use only footage the user may use (their own, press kits, Creative Commons with attribution, public-domain, or what the user supplies). Keep `footage_log.csv` with source and licence.
- Work in `work/doc-motion/<slug>/`, outputs in `out/doc-motion/<slug>/`.

## Step 1 — Cold open structure

- Open cold in the lowest or most dramatic moment, flash forward, then rewind to the beginning.
- The title lands between 35 and 60 s — never first.

## Step 2 — Story spine

Chapters:
1. The world before.
2. The founders.
3. How it works — two or three named rules (give each a short name that appears on screen).
4. The brand moment.
5. The crisis.
6. The numbers — myth versus filing (what people say vs what filings/annual reports show).
7. The moat.
8. Three lessons that call back to the cold open.

Every chapter ends with a question the next chapter answers.

## Step 3 — Script in beats

- Short beats of 1-3 sentences.
- Hindi: Devanagari with English business terms in Latin letters (revenue, valuation, IPO). English: plain, spoken.
- Numbers spelled out in words for the TTS ("बारह सौ करोड़", "twelve hundred crore"), with the digit form noted for the screen.
- Every factual beat carries its source URL.
- Save `beat_sheet.md` (beat no., chapter, text, on-screen idea, source) and **wait for the user's OK**.

## Step 4 — Visual grammar

- One visual idea per clause: about 3.4 s per shot on average; long holds only for emotion and numbers.
- When the narrator names a place, a role, a number or a concept, that word appears on screen (clean sans, e.g. Inter/SF-like, white/near-black, generous spacing).
- Date stamps and maps at every jump in time or place.
- A pattern interrupt every 20-40 s: a stat slam, a diagram on black, a newspaper prop, a logo reveal.
- Source shots: the article rendered as a paper/screen prop, a yellow marker sweep across the exact sentence on the word it's said.

## Step 5 — Voice, footage, build

1. Voiceover: use the user's recording if given; otherwise a TTS voice (e.g. edge-tts `hi-IN-MadhurNeural` / `en-US-AndrewNeural`) with word-boundary timings saved to `words.json`. Note in the description that the voice is synthetic.
2. Collect footage the user may use; log it.
3. Build the film as a **HyperFrames** project (HTML compositions rendered to video; check the CLI with `npx hyperframes --help`): one composition per chapter, each element timed to word times from `words.json`.

## Step 6 — Review and render

- Render the key frames for each chapter (contact sheet per chapter) and **wait for the user's OK** before the long render.
- Render `doc_1920x1080.mp4` (30 fps, H.264 CRF 18, AAC 192k, -14 LUFS).
- `teaser_9x16.mp4` (1080x1920, 30-60 s from the strongest beats, text out of the top 250 px / bottom 420 px).
- YouTube pack in `youtube/`: `title.txt` (3 options), `description.md` (summary, sources list, footage credits, synthetic-voice note if used), `chapters.txt` (timestamps from the render), `thumbnail.png` (1280x720).
