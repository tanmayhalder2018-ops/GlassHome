#!/usr/bin/env python3
"""Cinematic 1280x720 YouTube thumbnail: python3 thumbnail2.py song.mp3 out.jpg [time]"""
import json, os, subprocess, sys
from PIL import Image, ImageFont
import render as V1
import render2 as R

audio, out = sys.argv[1], sys.argv[2]
t = float(sys.argv[3]) if len(sys.argv) > 3 else 39.5
cfg = json.load(open(os.path.join(R.HERE, "lyrics.json"), encoding="utf-8"))
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                     "-of", "csv=p=0", audio]).strip())
feats = V1.load_audio_features(audio, 30, dur)
film = R.Film(cfg, dur, 30, feats)
film.text.draw = lambda img, t: None  # background only
img = film.render(int(t * 30)).convert("RGBA")
big = ImageFont.truetype(V1.FONT_SERIF_BOLD, 190, layout_engine=ImageFont.Layout.RAQM)
spr = V1.text_sprite(cfg["title"], big, glow_r=30)
img.alpha_composite(spr[0], (int(R.W * 0.62 - spr[0].width / 2), int(250 - spr[0].height / 2)))
sub = ImageFont.truetype(V1.FONT_LATIN_LIGHT, 66)
s2 = V1.text_sprite(cfg.get("artist", ""), sub, glow_r=12)
img.alpha_composite(s2[0], (int(R.W * 0.62 - s2[0].width / 2), int(420 - s2[0].height / 2)))
img.convert("RGB").resize((1280, 720), Image.LANCZOS).save(out, quality=93)
print("wrote", out)
