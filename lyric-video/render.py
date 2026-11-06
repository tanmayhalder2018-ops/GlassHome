#!/usr/bin/env python3
"""Lyric video renderer for "আমায় ডেকো না" (Tanmay Halder).

Usage:
    python3 render.py song.mp3 out.mp4 [--preview START END] [--fps 30]

Lyrics and timings come from lyrics.json (next to this script). Edit the
start/end seconds there and re-run to fix any line timing.

Look: a sunset that slowly sinks into night over the length of the song,
silhouetted hills, flocks of birds flying away toward the horizon, drifting
fireflies and stars, and an audio-reactive glow. Lyrics fade in line by line
with a golden progress underline; the next line is previewed below.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import wave
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/noto/NotoSerifBengali-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/noto/NotoSerifBengali-Regular.ttf"
FONT_LATIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_LATIN_LIGHT = "/usr/share/fonts/opentype/inter/Inter-Light.otf"

HORIZON = 820
SUN_X = 1380

# Sky palettes (top, middle, horizon) for golden hour -> dusk -> night.
SKIES = [
    ((28, 30, 78), (150, 72, 110), (255, 170, 95)),
    ((16, 18, 56), (88, 46, 104), (230, 112, 78)),
    ((6, 8, 28), (26, 24, 66), (92, 52, 86)),
]


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- audio
def load_audio_features(path, fps, duration):
    tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"lv_{os.getpid()}.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1",
                    "-ar", "22050", tmp], check=True)
    with wave.open(tmp) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    os.remove(tmp)
    n = int(duration * fps) + 1
    win = 2048
    fr = np.fft.rfftfreq(win, 1 / sr)
    edges = np.geomspace(40, 8000, 49)
    bands = np.zeros((n, 48), np.float32)
    level = np.zeros(n, np.float32)
    bass = np.zeros(n, np.float32)
    hann = np.hanning(win)
    for i in range(n):
        c = int(i / fps * sr)
        seg = x[max(0, c - win // 2): c + win // 2]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        s = np.abs(np.fft.rfft(seg * hann))
        level[i] = np.sqrt(np.mean(seg ** 2))
        bass[i] = s[(fr > 40) & (fr < 160)].mean()
        for b in range(48):
            m = (fr >= edges[b]) & (fr < edges[b + 1])
            bands[i, b] = s[m].mean() if m.any() else 0
    bands = np.log1p(bands * 4)
    bands /= np.percentile(bands, 98) + 1e-6
    level /= np.percentile(level, 98) + 1e-6
    bass /= np.percentile(bass, 98) + 1e-6
    # temporal smoothing (attack fast, release slow)
    for arr in (bands, level, bass):
        for i in range(1, n):
            arr[i] = np.maximum(arr[i], arr[i - 1] * 0.86)
    return np.clip(bands, 0, 1.2), np.clip(level, 0, 1.2), np.clip(bass, 0, 1.2)


# ---------------------------------------------------------------- static layers
def make_sky(pal):
    top, mid, hor = [np.array(c, np.float32) for c in pal]
    y = np.linspace(0, 1, HORIZON)[:, None]
    t1 = np.clip(y / 0.6, 0, 1)
    t2 = np.clip((y - 0.6) / 0.4, 0, 1)
    col = np.where(y < 0.6, top + (mid - top) * t1 ** 1.2, mid + (hor - mid) * t2 ** 0.8)
    sky = np.zeros((H, W, 3), np.float32)
    sky[:HORIZON] = col[:, None, :]
    sky[HORIZON:] = hor
    return sky


def hill_layer(seed, base, amp, color, blur=0):
    rng = np.random.default_rng(seed)
    xs = np.arange(W + 1)
    ys = np.full(W + 1, float(base))
    for k in range(6):
        f = rng.uniform(0.6, 4.0) * (k + 1) / W * math.pi
        ys -= amp / (k + 1) ** 0.9 * np.sin(xs * f + rng.uniform(0, 6.28))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(0, H)] + list(zip(xs.tolist(), ys.tolist())) + [(W, H)], fill=color)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    return img


def make_trees():
    """A lone tree on the near hill, bottom-left, plus tall grass."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(7)
    col = (8, 6, 18, 255)

    def branch(x, y, ang, length, width, depth):
        x2 = x + math.cos(ang) * length
        y2 = y - math.sin(ang) * length
        d.line([(x, y), (x2, y2)], fill=col, width=max(1, int(width)))
        if depth == 0:
            for _ in range(5):
                r = rng.uniform(6, 16)
                ox, oy = rng.normal(0, 14, 2)
                d.ellipse([x2 + ox - r, y2 + oy - r, x2 + ox + r, y2 + oy + r], fill=col)
            return
        for da in (-0.42, 0.38) if depth % 2 else (-0.35, 0.05, 0.45):
            branch(x2, y2, ang + da + rng.normal(0, 0.12), length * rng.uniform(0.66, 0.78),
                   width * 0.68, depth - 1)

    branch(260, 1000, math.pi / 2 + 0.05, 150, 22, 6)
    for gx in range(0, W, 7):
        gh = rng.uniform(8, 34)
        lean = rng.normal(0, 5)
        d.line([(gx, H), (gx + lean, H - 70 - gh)], fill=col, width=2)
    return img


def make_vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((x - W / 2) / (W * 0.62)) ** 2 + ((y - H / 2) / (H * 0.62)) ** 2)
    v = np.clip(1.15 - r ** 2 * 0.55, 0.35, 1.0)
    return v[..., None]


def make_glow(radius, color):
    size = radius * 2
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    r = np.sqrt((x - radius) ** 2 + (y - radius) ** 2) / radius
    a = np.clip(1 - r, 0, 1) ** 2.2
    arr = np.zeros((size, size, 3), np.float32)
    arr[:] = np.array(color, np.float32)
    return arr, a[..., None]


# ---------------------------------------------------------------- text
def fit_font(text, path, size, max_w):
    while size > 30:
        f = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
        if f.getlength(text) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)


def text_sprite(text, font, fill=(255, 246, 232), glow=(255, 170, 90), glow_r=16,
                shadow=True):
    """Pre-render text with glow + soft shadow into an RGBA image."""
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = glow_r * 3 + 10
    size = (tw + pad * 2, th + pad * 2)
    pos = (pad - bbox[0], pad - bbox[1])
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((pos[0] + 3, pos[1] + 5), text, font=font, fill=(0, 0, 10, 190))
        out = Image.alpha_composite(out, sh.filter(ImageFilter.GaussianBlur(7)))
    if glow:
        g = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(g).text(pos, text, font=font, fill=glow + (150,))
        out = Image.alpha_composite(out, g.filter(ImageFilter.GaussianBlur(glow_r)))
    t = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(t).text(pos, text, font=font, fill=fill + (255,))
    out = Image.alpha_composite(out, t)
    return out, pad, tw, th


def with_alpha(img, a):
    if a >= 0.999:
        return img
    arr = np.array(img)
    arr[..., 3] = (arr[..., 3].astype(np.float32) * a).astype(np.uint8)
    return Image.fromarray(arr)


# ---------------------------------------------------------------- scene state
class Scene:
    def __init__(self, cfg, duration, fps, feats):
        self.cfg, self.duration, self.fps = cfg, duration, fps
        self.bands, self.level, self.bass = feats
        self.skies = [make_sky(p) for p in SKIES]
        self.far = hill_layer(3, HORIZON + 10, 38, (60, 36, 78, 255), blur=2)
        self.mid = hill_layer(11, HORIZON + 80, 55, (30, 18, 48, 255), blur=1)
        self.near = hill_layer(19, HORIZON + 170, 60, (12, 8, 24, 255))
        self.trees = make_trees()
        self.vignette = make_vignette()
        self.sun_rgb, self.sun_a = make_glow(420, (255, 190, 120))
        self.core_rgb, self.core_a = make_glow(95, (255, 236, 200))
        rng = np.random.default_rng(42)
        self.stars = np.c_[rng.uniform(0, W, 260), rng.uniform(0, HORIZON - 60, 260) ** 1.0,
                           rng.uniform(0.6, 2.2, 260), rng.uniform(0, 6.28, 260),
                           rng.uniform(0.5, 2.0, 260)]
        self.flies = np.c_[rng.uniform(0, W, 70), rng.uniform(HORIZON - 120, H, 70),
                           rng.uniform(0, 6.28, 70), rng.uniform(0.2, 0.7, 70),
                           rng.uniform(1.5, 3.5, 70)]
        # Bird flocks: (spawn time, start x, start y, size, n birds, seed)
        self.flocks = []
        t = 1.0
        while t < duration:
            self.flocks.append((t, rng.uniform(-200, 500), rng.uniform(620, 900),
                                rng.uniform(16, 26), int(rng.integers(3, 8)), int(rng.integers(1e6))))
            t += rng.uniform(5.5, 9.0)
        self._build_text()

    def _build_text(self):
        lines = self.cfg["lines"]
        self.line_sprites = []
        for ln in lines:
            big = fit_font(ln["text"], FONT_SERIF_BOLD, 88, 1640)
            small = fit_font(ln["text"], FONT_SERIF, 46, 1400)
            self.line_sprites.append((text_sprite(ln["text"], big),
                                      text_sprite(ln["text"], small, fill=(235, 220, 230),
                                                  glow=None, shadow=True)))
        tf = ImageFont.truetype(FONT_SERIF_BOLD, 150, layout_engine=ImageFont.Layout.RAQM)
        self.title = text_sprite(self.cfg["title"], tf, glow_r=26)
        cf = ImageFont.truetype(FONT_LATIN_LIGHT, 40)
        self.credit_sprites = [text_sprite(c, cf, fill=(250, 235, 225), glow=(255, 160, 110),
                                           glow_r=10) for c in self.cfg["credits"]]
        wf = ImageFont.truetype(FONT_SERIF, 30, layout_engine=ImageFont.Layout.RAQM)
        wl = ImageFont.truetype(FONT_LATIN_LIGHT, 27)
        self.watermark = [text_sprite(self.cfg["title"], wf, fill=(255, 240, 230), glow=None),
                          text_sprite("·  " + self.cfg.get("artist", "Tanmay Halder"), wl,
                                      fill=(255, 240, 230), glow=None)]
        nf = ImageFont.truetype(FONT_LATIN, 64)
        self.note = text_sprite("♪", nf, fill=(255, 225, 190), glow=(255, 160, 90), glow_r=12)
        mf = ImageFont.truetype(FONT_LATIN_LIGHT, 34)
        self.music_lbl = text_sprite("— music —", mf, fill=(250, 230, 220), glow=None)

    # --------------------------------------------------------- per frame
    def render(self, fi):
        t = fi / self.fps
        p = t / self.duration
        lv = float(self.level[fi])
        bs = float(self.bass[fi])

        # sky: blend palettes over the song
        if p < 0.5:
            sky = self.skies[0] + (self.skies[1] - self.skies[0]) * smooth(p / 0.5)
        else:
            sky = self.skies[1] + (self.skies[2] - self.skies[1]) * smooth((p - 0.5) / 0.5)
        frame = sky.copy()

        # sun sinks toward and behind the hills
        sun_y = int(lerp(520, HORIZON + 60, smooth(p ** 0.9)))
        glow_strength = lerp(0.75, 0.35, p) * (1 + 0.25 * bs)
        self._add_glow(frame, self.sun_rgb, self.sun_a, SUN_X, sun_y, glow_strength)
        self._add_glow(frame, self.core_rgb, self.core_a, SUN_X, sun_y, lerp(1.0, 0.6, p) * 1.4)

        # stars fade in with the night
        star_vis = smooth((p - 0.25) / 0.6)
        img = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).convert("RGBA")
        over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(over)
        if star_vis > 0:
            for sx, sy, sr, ph, sp in self.stars:
                tw = 0.55 + 0.45 * math.sin(t * sp + ph)
                a = int(255 * star_vis * tw * (1 - sy / HORIZON * 0.6))
                if a > 8:
                    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 250, 235, a))
        img = Image.alpha_composite(img, over)

        # hills
        img = Image.alpha_composite(img, self._spectrum_layer(fi, sun_y))
        img = Image.alpha_composite(img, self.far)
        img = Image.alpha_composite(img, self.mid)
        img = Image.alpha_composite(img, self._birds_layer(t))
        img = Image.alpha_composite(img, self.near)
        img = Image.alpha_composite(img, self.trees)
        img = Image.alpha_composite(img, self._fireflies_layer(t, lv, p))

        # vignette
        arr = np.asarray(img.convert("RGB")).astype(np.float32) * self.vignette
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")

        self._text(img, t)
        return img.convert("RGB")

    def _add_glow(self, frame, rgb, a, cx, cy, strength):
        r = rgb.shape[0] // 2
        x0, y0, x1, y1 = cx - r, cy - r, cx + r, cy + r
        sx0, sy0 = max(0, -x0), max(0, -y0)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        if x1 <= x0 or y1 <= y0:
            return
        h, w = y1 - y0, x1 - x0
        al = a[sy0:sy0 + h, sx0:sx0 + w] * strength
        region = frame[y0:y1, x0:x1]
        # screen blend
        region[:] = 255 - (255 - region) * (1 - al * rgb[sy0:sy0 + h, sx0:sx0 + w] / 255)

    def _spectrum_layer(self, fi, sun_y):
        """Soft audio-reactive light bars rising from behind the far hills."""
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        b = self.bands[fi]
        n = len(b)
        bw = W / (n * 2)
        for i in range(n):
            v = float(b[i])
            hgt = 18 + v * 150
            for side in (-1, 1):
                cx = W / 2 + side * (i + 0.5) * bw
                a = int(40 + 70 * v)
                d.rounded_rectangle([cx - bw * 0.32, HORIZON + 30 - hgt, cx + bw * 0.32, HORIZON + 40],
                                    radius=int(bw * 0.3), fill=(255, 200, 150, a))
        return layer.filter(ImageFilter.GaussianBlur(3))

    def _birds_layer(self, t):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        life = 16.0
        for (t0, x0, y0, size, n, seed) in self.flocks:
            u = (t - t0) / life
            if u < 0 or u > 1:
                continue
            rng = np.random.default_rng(seed)
            # fly away from viewer toward the setting sun, shrinking with distance
            k = smooth(u) * 0.4 + u * 0.6
            fx = lerp(x0, SUN_X + rng.uniform(-260, 260), k)
            fy = lerp(y0, 470 + rng.uniform(-120, 60), k) - math.sin(u * math.pi) * 90
            sc = size * (1 - 0.85 * k)
            fade = min(1, u * 6) * min(1, (1 - u) * 4)
            for j in range(n):
                row = (j + 1) // 2
                sgn = -1 if j % 2 else 1
                bx = fx - row * sc * 3.4 + rng.normal(0, sc * 0.6)
                by = fy + sgn * row * sc * 2.2 + rng.normal(0, sc * 0.6)
                ph = t * rng.uniform(7, 10) + rng.uniform(0, 6.28)
                self._bird(d, bx, by, sc, ph, int(235 * fade))
        return layer

    @staticmethod
    def _bird(d, x, y, s, ph, a):
        flap = math.sin(ph)
        tip = -flap * s * 0.75
        elbow = -flap * s * 0.25 - s * 0.12
        col = (14, 8, 22, a)
        pts_l = [(x - s * 1.1, y + tip), (x - s * 0.5, y + elbow), (x, y)]
        pts_r = [(x, y), (x + s * 0.5, y + elbow), (x + s * 1.1, y + tip)]
        wdt = max(1, int(s * 0.22))
        d.line(pts_l, fill=col, width=wdt, joint="curve")
        d.line(pts_r, fill=col, width=wdt, joint="curve")
        d.ellipse([x - s * 0.16, y - s * 0.1, x + s * 0.16, y + s * 0.2], fill=col)

    def _fireflies_layer(self, t, lv, p):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        vis = 0.35 + 0.65 * smooth((p - 0.15) / 0.5)
        for fx, fy, ph, sp, r in self.flies:
            x = (fx + math.sin(t * sp + ph) * 60 + t * 6) % W
            y = fy + math.cos(t * sp * 0.8 + ph) * 30 - (t * 4 % 40)
            pulse = 0.5 + 0.5 * math.sin(t * 1.7 + ph * 3)
            a = int(255 * vis * pulse * (0.5 + 0.5 * min(1, lv)))
            rr = r * (1.4 + 0.6 * pulse)
            d.ellipse([x - rr * 3, y - rr * 3, x + rr * 3, y + rr * 3], fill=(255, 210, 120, a // 5))
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 235, 170, a))
        return layer.filter(ImageFilter.GaussianBlur(1.2))

    # --------------------------------------------------------- text
    def _paste(self, img, sprite_info, cx, cy, alpha):
        if alpha <= 0.01:
            return
        spr, pad, tw, th = sprite_info
        spr = with_alpha(spr, alpha)
        img.alpha_composite(spr, (int(cx - spr.width / 2), int(cy - spr.height / 2)))

    def _text(self, img, t):
        lines = self.cfg["lines"]
        first = lines[0]["start"]
        last_end = lines[-1]["end"]

        # ---- title card (intro)
        if t < first - 0.5:
            a_title = smooth((t - 1.5) / 2.5) * (1 - smooth((t - (first - 4)) / 2.5))
            rise = (1 - smooth((t - 1.5) / 3)) * 30
            self._paste(img, self.title, W / 2, 400 + rise, a_title)
            for k, cs in enumerate(self.credit_sprites):
                a = smooth((t - 4.5 - k * 1.2) / 2) * (1 - smooth((t - (first - 4)) / 2.5))
                self._paste(img, cs, W / 2, 560 + k * 62, a)

        # ---- end card
        if t > last_end + 0.3:
            a = smooth((t - last_end - 0.3) / 1.5)
            self._paste(img, self.title, W / 2, 420, a)
            for k, cs in enumerate(self.credit_sprites):
                self._paste(img, cs, W / 2, 570 + k * 62, a)

        # ---- watermark during the song
        wm_a = 0.55 * smooth((t - first + 1) / 2) * (1 - smooth((t - last_end) / 1.5))
        if wm_a > 0.01:
            (s1, p1, w1, h1), (s2, p2, w2, h2) = self.watermark
            img.alpha_composite(with_alpha(s1, wm_a), (60 - p1, 48 - p1))
            img.alpha_composite(with_alpha(s2, wm_a), (60 + w1 + 16 - p2, 48 + h1 - h2 + 5 - p2))

        # ---- instrumental breaks: credits + music note
        for i in range(len(lines) - 1):
            g0, g1 = lines[i]["end"] + 1.5, lines[i + 1]["start"] - 1.5
            if g1 - g0 > 12 and g0 < t < g1:
                a = smooth((t - g0) / 2) * (1 - smooth((t - (g1 - 2)) / 2))
                bob = math.sin(t * 2.2) * 8
                self._paste(img, self.note, W / 2, 360 + bob, a)
                self._paste(img, self.music_lbl, W / 2, 440, a * 0.8)
                for k, cs in enumerate(self.credit_sprites):
                    self._paste(img, cs, W / 2, 520 + k * 62, a * 0.9)

        # ---- lyric lines
        CY = 430
        for i, ln in enumerate(lines):
            s, e = ln["start"], ln["end"]
            nxt = lines[i + 1]["start"] if i + 1 < len(lines) else e + 3
            hold_end = min(nxt - 0.15, e + 2.5)
            fin, fout = 0.55, 0.5
            if not (s - fin <= t <= hold_end + 0.05):
                continue
            a = smooth((t - (s - fin)) / fin) * (1 - smooth((t - (hold_end - fout)) / fout))
            rise = (1 - smooth((t - (s - fin)) / (fin + 0.3))) * 26
            big, small = self.line_sprites[i]
            self._paste(img, big, W / 2, CY + rise, a)
            # golden progress underline
            prog = smooth((t - s) / max(0.1, e - s))
            spr, pad, tw, th = big
            uw = tw * prog
            if uw > 2 and a > 0.02:
                y = CY + th / 2 + 28 + rise
                ul = Image.new("RGBA", (W, 40), (0, 0, 0, 0))
                dd = ImageDraw.Draw(ul)
                x0 = W / 2 - tw / 2
                dd.rounded_rectangle([x0, 16, x0 + uw, 21], radius=3,
                                     fill=(255, 196, 110, int(230 * a)))
                dd.ellipse([x0 + uw - 6, 12, x0 + uw + 6, 25], fill=(255, 236, 190, int(255 * a)))
                glow = ul.filter(ImageFilter.GaussianBlur(5))
                img.alpha_composite(glow, (0, int(y - 18)))
                img.alpha_composite(ul, (0, int(y - 18)))
            # preview next line (same section only)
            if i + 1 < len(lines) and nxt - e < 6:
                na = a * 0.42 * (1 - smooth((t - (nxt - 0.6)) / 0.4))
                self._paste(img, self.line_sprites[i + 1][1], W / 2, CY + 150, na)


# ---------------------------------------------------------------- driver
_scene = None


def _init(cfg, duration, fps, feats):
    global _scene
    _scene = Scene(cfg, duration, fps, feats)


def _render_chunk(args):
    idx, f0, f1, fps, outdir = args
    out = os.path.join(outdir, f"chunk_{idx:03d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "libx264",
                          "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out],
                         stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(_scene.render(fi).tobytes())
        if (fi - f0) % 300 == 0:
            print(f"  chunk {idx}: {fi - f0}/{f1 - f0}", flush=True)
    p.stdin.close()
    p.wait()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--preview", nargs=2, type=float, metavar=("START", "END"))
    ap.add_argument("--still", type=float, nargs="*", help="save PNG stills at these seconds")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    a = ap.parse_args()

    cfg = json.load(open(os.path.join(HERE, "lyrics.json"), encoding="utf-8"))
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", a.audio]).strip())
    print(f"duration {dur:.2f}s; analysing audio…", flush=True)
    feats = load_audio_features(a.audio, a.fps, dur)

    if a.still is not None:
        _init(cfg, dur, a.fps, feats)
        base = os.path.splitext(a.out)[0]
        for s in a.still:
            _scene.render(int(s * a.fps)).save(f"{base}_{s:06.1f}.png")
        return

    start, end = (a.preview if a.preview else (0, dur))
    f_start, f_end = int(start * a.fps), min(int(end * a.fps), int(dur * a.fps))
    outdir = os.path.splitext(a.out)[0] + "_chunks"
    os.makedirs(outdir, exist_ok=True)
    n = max(1, a.jobs)
    per = math.ceil((f_end - f_start) / (n * 3))
    jobs = [(i, f, min(f + per, f_end), a.fps, outdir)
            for i, f in enumerate(range(f_start, f_end, per))]
    with Pool(n, initializer=_init, initargs=(cfg, dur, a.fps, feats)) as pool:
        chunks = pool.map(_render_chunk, jobs, chunksize=1)
    lst = os.path.join(outdir, "list.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.abspath(c)}'\n" for c in chunks)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-ss", str(start), "-t", str(end - start), "-i", a.audio,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
                    "-movflags", "+faststart", "-shortest", a.out], check=True)
    for c in chunks:
        os.remove(c)
    os.remove(lst)
    os.rmdir(outdir)
    print("wrote", a.out)


if __name__ == "__main__":
    sys.exit(main())
