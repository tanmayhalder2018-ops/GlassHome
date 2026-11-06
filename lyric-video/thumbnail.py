#!/usr/bin/env python3
"""Make a 1280x720 YouTube thumbnail: python3 thumbnail.py song.mp3 out.jpg"""
import json, os, sys
from PIL import Image, ImageFont
import render as R

audio, out = sys.argv[1], sys.argv[2]
cfg = json.load(open(os.path.join(R.HERE, "lyrics.json"), encoding="utf-8"))
import subprocess
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                     "-of", "csv=p=0", audio]).strip())
fps = 30
feats = R.load_audio_features(audio, fps, dur)
sc = R.Scene(cfg, dur, fps, feats)
sc._text = lambda img, t: None  # background only
img = sc.render(int(105 * fps)).convert("RGBA")  # dusk with birds, no lyrics yet
big = ImageFont.truetype(R.FONT_SERIF_BOLD, 200, layout_engine=ImageFont.Layout.RAQM)
spr = R.text_sprite(cfg["title"], big, glow_r=30)
img.alpha_composite(spr[0], (int(R.W / 2 - spr[0].width / 2), int(390 - spr[0].height / 2)))
sub = ImageFont.truetype(R.FONT_LATIN_LIGHT, 64)
s2 = R.text_sprite(cfg.get("artist", "Tanmay Halder"), sub, glow_r=12)
img.alpha_composite(s2[0], (int(R.W / 2 - s2[0].width / 2), int(590 - s2[0].height / 2)))
img.convert("RGB").resize((1280, 720), Image.LANCZOS).save(out, quality=93)
print("wrote", out)
