# আমায় ডেকো না — Lyric Video

YouTube lyric video generator for **"আমায় ডেকো না"** by Tanmay Halder
(Artist & Music Arrangement: Tanmay Halder).

## Look
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
