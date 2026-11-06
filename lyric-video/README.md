# আমায় ডেকো না — Lyric Video

YouTube lyric video generator for **"আমায় ডেকো না"** by Tanmay Halder
(Artist & Music Arrangement: Tanmay Halder).

## Versions
- `render.py`: v1, simple sunset scene with a light-bar visualiser
- `render2.py`: **v2, cinematic**. Each lyric line gets its own scene that shows what the line means:

| Time | Lyric | Scene |
|---|---|---|
| 0:00 | (intro) | golden-hour river, boat, birds, title |
| 0:34 / 2:10 / 3:29 | আমায় ডেকো না ... | a baul walks away along the riverbank / village road |
| 0:42 / 2:18 / 3:37 | ফেরারী পাখিরা ... কূলায় ফেরেনা | empty nest on a branch, birds flying away |
| 1:07 | (music) | time-lapse sunset, lantern boat at twilight |
| 1:44 | বিবাগী এ মন ... | the baul with his ektara on a long village road |
| 2:01 | যায়না বাঁধা ... পিছুটানের মায়ায় | a boat's rope slips off its post; the boat drifts away |
| 2:26 | (music) | moonlit river, mist, fireflies, shooting stars |
| 3:04 | শেষ হোক এই খেলা ... | floating diyas drift away, leaves falling |
| 3:20 | মিনতি করি ... বিদায় জানাও | a woman on the ghat waves goodbye to a lantern boat |

Day turns to a moonlit night across the song. Water reflections, ripples, drifting
clouds, mist, bloom, film grain and slow camera moves are all procedural (numpy + Pillow).
Shots are defined in `build_timeline()` in `render2.py`.

## Look (v1)
- A sunset that slowly sinks into a starry night over the length of the song
- Silhouetted hills and a lone tree, with flocks of birds flying away toward the horizon
- Fireflies and a soft light-bar visualiser that react to the music
- Lyrics fade in line by line (Noto Serif Bengali), with a golden progress
  underline and the next line previewed below
- Title card in the intro, credits during instrumental breaks, and an end card

## Requirements
- Python 3 with `numpy` and `Pillow` (built with libraqm for Bengali shaping)
- `ffmpeg` / `ffprobe`
- Fonts: `fonts-noto-core` (Noto Serif Bengali) and `fonts-inter`

## Usage
```bash
# v2 cinematic video and thumbnail
python3 render2.py song.mp3 Amay_Deko_Na_Cinematic.mp4
python3 thumbnail2.py song.mp3 thumbnail.jpg

# full 1920x1080 / 30fps video with the song's audio (AAC 320k)
python3 render.py song.mp3 Amay_Deko_Na_Lyric_Video.mp4

# quick preview of part of the song (seconds)
python3 render.py song.mp3 preview.mp4 --preview 100 140

# still frames to check the look
python3 render.py song.mp3 still.png --still 38 128

# 1280x720 YouTube thumbnail
python3 thumbnail.py song.mp3 thumbnail.jpg
```

## Fixing lyric timing
All lyrics and their `start` / `end` times (in seconds) are in `lyrics.json`.
If a line appears a little early or late, edit its numbers and re-render.
