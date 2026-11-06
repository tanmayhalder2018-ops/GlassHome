#!/usr/bin/env python3
"""Cinematic lyric video v2 for "আমায় ডেকো না" (Tanmay Halder).

Every lyric line gets its own scene that illustrates its meaning:
  আমায় ডেকো না ...            a wandering baul walks away along the riverbank
  ফেরারী পাখিরা ... কূলায় ফেরেনা  an empty nest on a branch, birds flying away
  বিবাগী এ মন ...              the baul with his ektara on a long village road
  যায়না বাঁধা ... পিছুটানের মায়ায়   a boat's rope slips off its post, the boat drifts
  শেষ হোক এই খেলা ...          floating diyas drift away, leaves fall at night
  মিনতি করি ... বিদায় জানাও      someone on the ghat waves goodbye to a lantern boat

The day slowly turns from golden hour to a moonlit night across the song.
All graphics are procedural (numpy + Pillow); audio via ffmpeg.

Usage:
    python3 render2.py song.mp3 out.mp4 [--preview START END] [--still T ...]
"""
import argparse
import json
import math
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import render as V1

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
F32 = np.float32


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ palettes
# time-of-day 0 golden, 1 sunset, 2 twilight, 3 night
PAL_KEYS = ["top", "mid", "hor", "sun", "cdark", "clit", "water", "haze", "ink"]
PALS = [
    dict(top=(50, 74, 146), mid=(214, 136, 118), hor=(250, 188, 124), sun=(255, 212, 160),
         cdark=(122, 88, 118), clit=(255, 214, 176), water=(70, 78, 120), haze=(206, 150, 140),
         ink=(30, 20, 34)),
    dict(top=(30, 34, 96), mid=(192, 86, 106), hor=(255, 146, 74), sun=(255, 178, 96),
         cdark=(72, 42, 84), clit=(255, 156, 96), water=(46, 42, 84), haze=(156, 84, 104),
         ink=(20, 12, 26)),
    dict(top=(14, 18, 60), mid=(62, 52, 114), hor=(176, 94, 112), sun=(226, 128, 104),
         cdark=(36, 32, 68), clit=(184, 106, 126), water=(24, 26, 60), haze=(84, 62, 104),
         ink=(12, 9, 22)),
    dict(top=(4, 7, 22), mid=(12, 22, 52), hor=(42, 56, 96), sun=(214, 222, 255),
         cdark=(16, 20, 38), clit=(100, 112, 150), water=(8, 14, 32), haze=(36, 44, 74),
         ink=(5, 6, 14)),
]


def palette(tod):
    tod = min(3.0, max(0.0, tod))
    i = min(2, int(tod))
    f = tod - i
    return {k: np.array(PALS[i][k], F32) * (1 - f) + np.array(PALS[i + 1][k], F32) * f
            for k in PAL_KEYS}


# ------------------------------------------------------------------ noise helpers
def fbm(w, h, seed, octaves=6, base=3.0, aspect=1.0):
    rng = np.random.default_rng(abs(int(seed)))
    acc = np.zeros((h, w), F32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh = int(base * 2 ** o) + 2
        gw = int(base * 2 ** o * w / h / aspect) + 2
        g = rng.random((gh, gw)).astype(F32)
        acc += np.asarray(Image.fromarray(g).resize((w, h), Image.BICUBIC)) * amp
        tot += amp
        amp *= 0.5
    acc /= tot
    acc -= acc.min()
    acc /= acc.max()
    return acc


def ridge(seed, n, base, amp, nfreq=7, rough=0.0):
    rng = np.random.default_rng(abs(int(seed)))
    xs = np.arange(n, dtype=F32)
    ys = np.full(n, base, F32)
    for k in range(nfreq):
        f = rng.uniform(0.5, 3.0) * (k + 1) / 1920 * math.pi
        ys -= amp / (k + 1) ** 1.1 * np.sin(xs * f + rng.uniform(0, 6.28))
    if rough:
        ys += np.convolve(rng.normal(0, rough, n), np.ones(5) / 5, "same").astype(F32)
    return ys


# ------------------------------------------------------------------ glow sprites
@lru_cache(maxsize=256)
def glow_kernel(r, aspect=1.0):
    ry = max(2, int(r * aspect))
    y, x = np.mgrid[-ry:ry + 1, -r:r + 1].astype(F32)
    d2 = (x / r) ** 2 + (y / ry) ** 2
    return np.exp(-d2 * 4.0).astype(F32)


def add_glow(F, x, y, r, color, strength, aspect=1.0):
    r = max(2, int(r))
    k = glow_kernel(r, round(aspect, 2))
    kh, kw = k.shape
    x0, y0 = int(x) - kw // 2, int(y) - kh // 2
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(F.shape[1], x0 + kw), min(F.shape[0], y0 + kh)
    if xb <= xa or yb <= ya:
        return
    kk = k[ya - y0:yb - y0, xa - x0:xb - x0, None] * strength
    reg = F[ya:yb, xa:xb]
    reg += kk * np.asarray(color, F32)


# ------------------------------------------------------------------ figures (PIL)
def rot(points, cx, cy, ang):
    c, s = math.cos(ang), math.sin(ang)
    return [(cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c)
            for px, py in points]


def draw_wanderer(d, x, yf, h, phase, ink, ektara=True):
    """Back view of a walking baul with ektara and jhola bag."""
    s = math.sin(phase)
    bob = abs(s) * 0.012 * h
    yb = yf - bob
    lw = lambda k: max(1, int(k * h))
    # legs
    for side, ph in ((-1, phase), (1, phase + math.pi)):
        lift = 0.035 * h * max(0.0, math.sin(ph))
        d.line([(x + side * 0.05 * h, yb - 0.34 * h), (x + side * 0.06 * h, yf - lift)],
               fill=ink, width=lw(0.065))
        d.ellipse([x + side * 0.06 * h - 0.04 * h, yf - lift - 0.025 * h,
                   x + side * 0.06 * h + 0.04 * h, yf - lift + 0.01 * h], fill=ink)
    # robe
    d.polygon([(x - 0.12 * h, yb - 0.78 * h), (x + 0.12 * h, yb - 0.78 * h),
               (x + 0.17 * h, yb - 0.30 * h), (x - 0.17 * h, yb - 0.30 * h)], fill=ink)
    d.ellipse([x - 0.14 * h, yb - 0.84 * h, x + 0.14 * h, yb - 0.70 * h], fill=ink)
    # arms
    sw = s * 0.03 * h
    d.line([(x - 0.13 * h, yb - 0.76 * h), (x - 0.17 * h, yb - 0.50 * h + sw)], fill=ink, width=lw(0.05))
    d.line([(x + 0.13 * h, yb - 0.76 * h), (x + 0.17 * h, yb - 0.52 * h - sw)], fill=ink, width=lw(0.05))
    # head + bun
    d.ellipse([x - 0.068 * h, yb - 0.97 * h, x + 0.068 * h, yb - 0.83 * h], fill=ink)
    d.ellipse([x - 0.03 * h, yb - 1.01 * h, x + 0.03 * h, yb - 0.95 * h], fill=ink)
    # jhola bag
    d.line([(x + 0.10 * h, yb - 0.80 * h), (x - 0.16 * h, yb - 0.50 * h)], fill=ink, width=lw(0.015))
    d.polygon([(x - 0.24 * h, yb - 0.52 * h), (x - 0.13 * h, yb - 0.52 * h),
               (x - 0.14 * h, yb - 0.36 * h), (x - 0.23 * h, yb - 0.37 * h)], fill=ink)
    if ektara:
        d.line([(x + 0.05 * h, yb - 1.12 * h), (x + 0.21 * h, yb - 0.60 * h)], fill=ink, width=lw(0.02))
        d.ellipse([x + 0.16 * h, yb - 0.66 * h, x + 0.27 * h, yb - 0.52 * h], fill=ink)
        d.line([(x + 0.02 * h, yb - 1.12 * h), (x + 0.08 * h, yb - 1.12 * h)], fill=ink, width=lw(0.012))


def draw_waver(d, x, yf, h, t, ink):
    """Side view of a woman in a saree on the ghat, waving goodbye."""
    lw = lambda k: max(1, int(k * h))
    d.polygon([(x - 0.07 * h, yf - 0.78 * h), (x + 0.07 * h, yf - 0.78 * h),
               (x + 0.16 * h, yf), (x - 0.13 * h, yf)], fill=ink)
    d.ellipse([x - 0.065 * h, yf - 0.83 * h, x + 0.075 * h, yf - 0.70 * h], fill=ink)
    d.ellipse([x - 0.06 * h, yf - 0.97 * h, x + 0.06 * h, yf - 0.84 * h], fill=ink)
    d.ellipse([x - 0.10 * h, yf - 0.95 * h, x - 0.03 * h, yf - 0.87 * h], fill=ink)  # khopa
    # pallu flowing in breeze
    fl = math.sin(t * 1.7) * 0.03 * h
    d.polygon([(x - 0.06 * h, yf - 0.80 * h), (x - 0.22 * h + fl, yf - 0.45 * h),
               (x - 0.15 * h + fl, yf - 0.42 * h), (x - 0.04 * h, yf - 0.62 * h)], fill=ink)
    # waving arm: shoulder -> elbow -> hand
    a = -1.1 + 0.35 * math.sin(t * 5.0)
    sx, sy = x + 0.05 * h, yf - 0.76 * h
    ex, ey = sx + 0.13 * h, sy - 0.12 * h
    hx, hy = ex + math.cos(a) * 0.15 * h, ey + math.sin(a) * 0.15 * h
    d.line([(sx, sy), (ex, ey), (hx, hy)], fill=ink, width=lw(0.04), joint="curve")
    d.ellipse([hx - 0.025 * h, hy - 0.03 * h, hx + 0.025 * h, hy + 0.03 * h], fill=ink)
    d.line([(x - 0.02 * h, yf - 0.74 * h), (x + 0.02 * h, yf - 0.45 * h)], fill=ink, width=lw(0.04))


def boat_shapes(x, yw, L, t, boatman=True, lantern=False, seed=0):
    """Return list of (kind, points/args) for a Bengali country boat (nouka)."""
    ang = 0.018 * math.sin(t * 1.1 + seed)
    bob = math.sin(t * 1.3 + seed) * L * 0.006
    yw = yw + bob
    top, bot = [], []
    for i in range(25):
        u = i / 24
        xx = x - L / 2 + u * L
        # sheer line rises to bow (left) and stern (right)
        rise = 0.19 * L * (1 - u) ** 3.0 + 0.13 * L * u ** 3.2
        top.append((xx, yw - 0.028 * L - rise))
        depth = 0.05 * L * math.sin(math.pi * u) ** 0.6
        bot.append((xx, yw + depth - rise * 0.88))
    hull = top + bot[::-1]
    shapes = [("poly", rot(hull, x, yw, ang))]
    # chhoi (bamboo hood)
    hood = []
    for i in range(21):
        a = math.pi * i / 20
        hood.append((x - 0.03 * L - math.cos(a) * 0.17 * L, yw - 0.05 * L - math.sin(a) * 0.14 * L))
    shapes.append(("poly", rot(hood, x, yw, ang)))
    if boatman:
        bx, by = x + 0.33 * L, yw - 0.06 * L
        hh = 0.36 * L
        shapes.append(("man", rot([(bx, by)], x, yw, ang)[0], hh))
        pole = [(bx - 0.05 * hh, by - 0.85 * hh), (bx + 0.55 * hh, by + 0.45 * hh)]
        shapes.append(("line", rot(pole, x, yw, ang), max(1, int(0.03 * hh))))
    if lantern:
        lx, ly = rot([(x - 0.21 * L, yw - 0.10 * L)], x, yw, ang)[0]
        shapes.append(("lantern", (lx, ly), L))
    return shapes, yw


def draw_boat(d, shapes, ink, mirror_y=None, fill=None):
    col = fill or ink

    def M(p):
        return p if mirror_y is None else (p[0], 2 * mirror_y - p[1])

    for sh in shapes:
        if sh[0] == "poly":
            d.polygon([M(p) for p in sh[1]], fill=col)
        elif sh[0] == "line":
            d.line([M(p) for p in sh[1]], fill=col, width=sh[2])
        elif sh[0] == "man":
            (bx, by), hh = sh[1], sh[2]
            pts = [(bx - 0.08 * hh, by), (bx + 0.08 * hh, by), (bx + 0.06 * hh, by - 0.75 * hh),
                   (bx - 0.07 * hh, by - 0.75 * hh)]
            d.polygon([M(p) for p in pts], fill=col)
            c = M((bx, by - 0.84 * hh))
            r = 0.08 * hh
            d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=col)
            arm = [(bx, by - 0.65 * hh), (bx + 0.12 * hh, by - 0.55 * hh)]
            d.line([M(p) for p in arm], fill=col, width=max(1, int(0.05 * hh)))
            hat = [(bx - 0.14 * hh, by - 0.86 * hh), (bx, by - 0.98 * hh), (bx + 0.14 * hh, by - 0.86 * hh)]
            d.polygon([M(p) for p in hat], fill=col)


def draw_bird(d, x, y, s, ph, col):
    flap = math.sin(ph)
    tip = -flap * s * 0.75
    elbow = -flap * s * 0.25 - s * 0.12
    wdt = max(1, int(s * 0.24))
    d.line([(x - s * 1.1, y + tip), (x - s * 0.5, y + elbow), (x, y)], fill=col, width=wdt, joint="curve")
    d.line([(x, y), (x + s * 0.5, y + elbow), (x + s * 1.1, y + tip)], fill=col, width=wdt, joint="curve")
    d.ellipse([x - s * 0.17, y - s * 0.1, x + s * 0.17, y + s * 0.22], fill=col)


def draw_palm(d, x, yb, h, col, lean=0.0, seed=0):
    rng = np.random.default_rng(abs(int(seed)))
    pts = []
    for i in range(9):
        u = i / 8
        pts.append((x + lean * h * u ** 1.6, yb - h * u))
    d.line(pts, fill=col, width=max(1, int(h * 0.045)), joint="curve")
    tx, ty = pts[-1]
    nf = 11
    for k in range(nf):
        a = -math.pi / 2 + (k - (nf - 1) / 2) * 0.30 + rng.normal(0, 0.07)
        L = h * rng.uniform(0.30, 0.42)
        cl = []
        for j in range(12):
            u = j / 11
            cl.append((tx + math.cos(a) * L * u, ty + math.sin(a) * L * u + (u ** 1.8) * L * 0.75 * (0.4 + abs(math.cos(a)))))
        left, right = [], []
        for j in range(12):
            u = j / 11
            j2 = min(11, j + 1)
            j1 = max(0, j - 1)
            dx, dy = cl[j2][0] - cl[j1][0], cl[j2][1] - cl[j1][1]
            n = math.hypot(dx, dy) + 1e-6
            wv = h * 0.05 * math.sin(math.pi * min(1, u * 1.15)) ** 0.7
            left.append((cl[j][0] - dy / n * wv, cl[j][1] + dx / n * wv))
            right.append((cl[j][0] + dy / n * wv * 0.5, cl[j][1] - dx / n * wv * 0.5))
        d.polygon(left + right[::-1], fill=col)
        for j in range(2, 12, 2):  # drooping leaflets
            px, py = left[j]
            d.line([(px, py), (px + math.cos(a) * h * 0.02, py + h * 0.045)], fill=col, width=1)
    d.ellipse([tx - h * 0.03, ty - h * 0.02, tx + h * 0.03, ty + h * 0.04], fill=col)


def draw_round_tree(d, x, yb, h, col, seed=0):
    rng = np.random.default_rng(abs(int(seed)))
    d.line([(x, yb), (x + rng.normal(0, h * 0.03), yb - h * 0.45)], fill=col, width=max(1, int(h * 0.07)))
    for _ in range(14):
        r = h * rng.uniform(0.12, 0.24)
        cx = x + rng.normal(0, h * 0.2)
        cy = yb - h * 0.62 + rng.normal(0, h * 0.13)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)


def draw_hut(d, x, yb, w, col):
    h = w * 0.55
    d.rectangle([x - w * 0.4, yb - h * 0.55, x + w * 0.4, yb], fill=col)
    d.polygon([(x - w * 0.58, yb - h * 0.5), (x, yb - h * 1.15), (x + w * 0.58, yb - h * 0.5)], fill=col)


# ------------------------------------------------------------------ static layers
def treeline_mask(seed, width, band, base, scale=1.0, huts=True, density=1.0):
    """'L' mask of a far riverbank tree line; baseline at y=base inside a band-high image."""
    img = Image.new("L", (width, band), 0)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(abs(int(seed)))
    low = ridge(seed + 1, width, base - 6 * scale, 5 * scale, rough=1.2 * scale)
    d.polygon([(0, band)] + list(zip(range(width), low.tolist())) + [(width, band)], fill=255)
    x = 0.0
    while x < width:
        r = rng.random()
        if r < 0.45:
            draw_palm(d, x, base, rng.uniform(34, 70) * scale, 255, lean=rng.normal(0, 0.12), seed=int(x))
        elif r < 0.85:
            draw_round_tree(d, x, base, rng.uniform(24, 50) * scale, 255, seed=int(x))
        elif huts:
            draw_hut(d, x, base, rng.uniform(26, 40) * scale, 255)
        x += rng.uniform(14, 46) * scale / density
    return np.asarray(img.filter(ImageFilter.GaussianBlur(0.6)), F32) / 255


def ridge_mask(heights, y0, y1):
    yy = np.arange(y0, y1, dtype=F32)[:, None]
    return np.clip(yy - heights[None, :] + 0.5, 0, 1)


def blend(F, y0, mask, color):
    a = mask[..., None]
    reg = F[y0:y0 + mask.shape[0], :mask.shape[1]]
    reg *= (1 - a)
    reg += a * np.asarray(color, F32)


class Assets:
    def __init__(self):
        rng = np.random.default_rng(5)
        self.cloud = fbm(5200, 720, 11, octaves=7, base=2.2, aspect=2.6)
        self.mist = fbm(5200, 220, 23, octaves=5, base=2.0, aspect=5.0)
        st = np.zeros((720, W), F32)
        n = 1400
        xs, ys = rng.integers(0, W, n), (rng.random(n) ** 1.3 * 700).astype(int)
        st[ys, xs] = rng.random(n) ** 3 * 1.0 + 0.15
        big = rng.random(n) > 0.93
        for x, y in zip(xs[big], ys[big]):
            st[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = np.maximum(st[max(0, y - 1):y + 2, max(0, x - 1):x + 2], 0.45)
        self.stars1 = st * (rng.random((720, W)) > 0.5)
        self.stars2 = st - self.stars1
        sp = (rng.random((H, W // 8)) > 0.975).astype(F32) * rng.random((H, W // 8)).astype(F32)
        self.spark = np.asarray(Image.fromarray(sp).resize((W, H), Image.BILINEAR))
        # landscape masks (built for hy=640 river, 600 road)
        self.far_hills = ridge(3, W + 800, 0, 30)  # relative heights
        self.tl_river = treeline_mask(7, W + 800, 140, 120, 1.0)
        self.tl_road = treeline_mask(9, W + 800, 140, 120, 0.8, huts=True, density=1.3)
        self.wedge = self._wedge()
        self.ghat = self._ghat()
        self.branch = self._branch()
        self.bigtree = self._bigtree()
        self.road = self._road()
        self.grain = [rng.normal(0, 5.5, (H // 2, W // 2)).astype(F32) for _ in range(6)]
        y, x = np.mgrid[0:H, 0:W].astype(F32)
        r = np.sqrt(((x - W / 2) / (W * 0.6)) ** 2 + ((y - H / 2) / (H * 0.62)) ** 2)
        self.vig = np.clip(1.12 - r ** 2 * 0.5, 0.3, 1.0)[..., None].astype(F32)
        self.X = np.arange(W, dtype=F32)[None, :]

    def _wedge(self):
        """Left riverbank running toward the horizon, with palms and grass."""
        img = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(img)
        rng = np.random.default_rng(31)
        ye = lambda x: 905 - x / 830 * 257  # top edge of the embankment (path)
        top = [(x, ye(x) + rng.normal(0, 1.2)) for x in range(0, 832, 8)]
        right = [(lerp(830, 1250, u ** 1.3), lerp(648, H, u)) for u in np.linspace(0, 1, 30)]
        d.polygon([(0, H)] + top + right + [(0, H)], fill=255)
        for i in range(520):  # grass along the path edge
            x = rng.uniform(0, 830) ** 1.0
            y = ye(x) + 2
            u = 1 - x / 830
            gh = (3 + 34 * u ** 1.5) * rng.uniform(0.4, 1.1)
            if 120 < x < 820 and rng.random() < 0.7:
                gh *= 0.35  # keep the path itself low
            d.line([(x, y), (x + rng.normal(0, gh * 0.25), y - gh)], fill=255, width=max(1, int(1 + u * 2.5)))
        draw_palm(d, 40, ye(40) + 4, 600, 255, lean=0.10, seed=3)
        draw_palm(d, 520, ye(520) + 2, 150, 255, lean=-0.10, seed=4)
        draw_round_tree(d, 700, ye(700) + 2, 60, 255, seed=8)
        return np.asarray(img, F32) / 255

    def _ghat(self):
        img = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(img)
        top = 870
        for k in range(6):
            y = top + k * 34
            d.rectangle([0, y, 620 + k * 60, y + 34], fill=255)
        d.rectangle([0, 760, 140, H], fill=255)  # side wall
        d.rectangle([150, 680, 168, 870], fill=255)  # lamp post
        d.ellipse([135, 660, 183, 700], fill=255)
        draw_round_tree(d, 60, 770, 420, 255, seed=12)
        return np.asarray(img, F32) / 255

    def _branch(self):
        img = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(img)
        rng = np.random.default_rng(17)
        main = [(W + 40, 690), (1700, 720), (1500, 760), (1300, 772), (1120, 760), (980, 735), (860, 700)]
        d.line(main, fill=255, width=34, joint="curve")
        d.line(main[3:], fill=255, width=22, joint="curve")
        for (bx, by, ang, L) in [(1600, 735, -2.3, 260), (1380, 768, -1.9, 200), (1180, 762, 2.2, 180),
                                 (1000, 740, -2.6, 220), (1450, 765, 1.9, 160), (900, 712, -1.3, 140)]:
            ex, ey = bx + math.cos(ang) * L, by + math.sin(ang) * L
            d.line([(bx, by), ((bx + ex) / 2, (by + ey) / 2 + 12), (ex, ey)], fill=255, width=9, joint="curve")
            for _ in range(12):
                u = rng.uniform(0.3, 1.0)
                lx, ly = lerp(bx, ex, u), lerp(by, ey, u) + 8
                la = ang + rng.normal(0, 0.9)
                ll = rng.uniform(26, 46)
                pts = [(lx, ly), (lx + math.cos(la - 0.4) * ll * 0.5, ly + math.sin(la - 0.4) * ll * 0.5),
                       (lx + math.cos(la) * ll, ly + math.sin(la) * ll),
                       (lx + math.cos(la + 0.4) * ll * 0.5, ly + math.sin(la + 0.4) * ll * 0.5)]
                d.polygon(pts, fill=255)
        # nest (woven bowl) sitting in the fork
        nx, ny, nw = 1290, 742, 250
        d.chord([nx - nw / 2, ny - 70, nx + nw / 2, ny + 60], 0, 180, fill=255)
        for _ in range(220):
            a0 = rng.uniform(0, math.pi)
            r = rng.uniform(0.85, 1.12)
            x0 = nx + math.cos(a0) * nw / 2 * r
            y0 = ny + math.sin(a0) * 60 * r - 4
            x1 = x0 + rng.normal(0, 26)
            y1 = y0 + rng.normal(-6, 10)
            d.line([(x0, y0), (x1, y1)], fill=255, width=int(rng.integers(1, 4)))
        for _ in range(40):  # straggly twigs on the rim
            x0 = nx + rng.uniform(-nw / 2, nw / 2)
            y0 = ny - 2 + rng.normal(0, 4)
            d.line([(x0, y0), (x0 + rng.normal(0, 30), y0 - rng.uniform(4, 22))], fill=255, width=2)
        return np.asarray(img.filter(ImageFilter.GaussianBlur(0.8)), F32) / 255

    def _bigtree(self):
        img = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(img)
        rng = np.random.default_rng(41)
        d.polygon([(0, H), (0, 860)] + [(x, 860 + 40 * math.sin(x / 300) + x * 0.06) for x in range(0, 1100, 20)]
                  + [(1350, H)], fill=255)

        def br(x, y, a, L, w, dep):
            x2, y2 = x + math.cos(a) * L, y - math.sin(a) * L
            d.line([(x, y), (x2, y2)], fill=255, width=max(1, int(w)))
            if dep == 0:
                for _ in range(6):
                    r = rng.uniform(10, 26)
                    ox, oy = rng.normal(0, 20, 2)
                    d.ellipse([x2 + ox - r, y2 + oy - r, x2 + ox + r, y2 + oy + r], fill=255)
                return
            for da in ((-0.45, 0.35) if dep % 2 else (-0.3, 0.1, 0.5)):
                br(x2, y2, a + da + rng.normal(0, 0.12), L * rng.uniform(0.66, 0.8), w * 0.68, dep - 1)

        br(330, 900, math.pi / 2 + 0.12, 230, 36, 6)
        for gx in range(0, 1150, 6):
            d.line([(gx, 900 + gx * 0.06), (gx + rng.normal(0, 4), 870 + gx * 0.06 - rng.uniform(10, 40))],
                   fill=255, width=2)
        return np.asarray(img, F32) / 255

    def _road(self):
        hy, vx = 600, 1000
        yy = np.arange(hy, H, dtype=F32)[:, None]
        xx = np.arange(W, dtype=F32)[None, :]
        z = (yy - hy + 1) / (H - hy)  # 0 at horizon -> 1 at bottom
        half = 3 + z * 520
        cx = vx + (z ** 1.6) * -260
        road = np.clip((half - np.abs(xx - cx)) / (1 + z * 6), 0, 1)
        dist = 1 / (z + 0.02)
        rows = 0.5 + 0.5 * np.sin(np.log(dist) * 26)
        furrow = 0.5 + 0.5 * np.sin((xx - vx) / (z + 0.02) * 0.05)
        pattern = 0.80 + 0.12 * rows * (1 - z * 0.3) + 0.08 * furrow * np.clip(z * 3, 0, 1)
        rng = np.random.default_rng(55)
        trees = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(trees)
        for side in (-1, 1):
            for k in range(14):
                zz = 0.06 + (k / 13) ** 1.8 * 0.9
                y = hy + zz * (H - hy)
                cxx = vx + (zz ** 1.6) * -260 + side * (3 + zz * 520 + 60 + rng.uniform(0, 260) * zz)
                h = 30 + zz * 700
                if rng.random() < 0.55:
                    draw_palm(d, cxx, y, h, 255, lean=side * 0.1 + rng.normal(0, 0.05), seed=k * 7 + side)
                else:
                    draw_round_tree(d, cxx, y, h * 0.7, 255, seed=k * 3 + side)
        return dict(hy=hy, vx=vx, z=z, road=road, pattern=pattern.astype(F32),
                    trees=np.asarray(trees, F32) / 255)


# ------------------------------------------------------------------ world rendering
class World:
    def __init__(self, feats, fps):
        self.A = Assets()
        self.bands, self.level, self.bass = feats
        self.fps = fps

    # ---- sky
    def sky(self, F, pal, hy, sun, cloud_off, cloud_amt, stars, t, moon=None, glow=1.0):
        A = self.A
        f = np.linspace(0, 1, hy, dtype=F32)[:, None]
        lo = np.clip(f / 0.55, 0, 1) ** 1.3
        hi = np.clip((f - 0.55) / 0.45, 0, 1) ** 0.8
        wt = np.where(f < 0.55, 1 - lo, 0)
        wm = np.where(f < 0.55, lo, 1 - hi)
        wh = np.where(f < 0.55, 0, hi)
        col = wt * pal["top"] + wm * pal["mid"] + wh * pal["hor"]
        S = np.broadcast_to(col[:, None, :], (hy, W, 3)).copy()
        Y = np.arange(hy, dtype=F32)[:, None]
        X = A.X
        sx, sy, sr = sun
        dpx = np.sqrt((X - sx) ** 2 + (Y - sy) ** 2)
        d = dpx / W
        g = (0.55 * np.exp(-d * 11) + 0.24 * np.exp(-d * 2.8)) * glow
        band = np.exp(-np.abs(Y - hy) / 60) * np.exp(-np.abs(X - sx) / 600) * 0.40 * glow
        S += (g + band)[..., None] * pal["sun"] * 0.85
        # stars
        if stars > 0.01:
            tw = (0.65 + 0.35 * math.sin(t * 1.3)) * A.stars1[:hy] + (0.65 + 0.35 * math.sin(t * 1.9 + 2)) * A.stars2[:hy]
            S += (tw * stars * 255 * np.clip(1 - f * 1.1, 0, 1))[..., None]
        # sun disk
        if sr > 0:
            disk = np.clip((sr - dpx) / 1.8, 0, 1)
            S = S * (1 - disk[..., None]) + disk[..., None] * np.array([255, 244, 220], F32)
        if moon is not None:
            mx, my, mr = moon
            md = np.sqrt((X - mx) ** 2 + (Y - my) ** 2)
            S += (np.exp(-md / W * 9) * 0.5 + np.exp(-md / W * 2.5) * 0.14)[..., None] * np.array([150, 170, 230], F32)
            disk = np.clip((mr - md) / 1.6, 0, 1)
            tex = 0.88 + 0.12 * A.cloud[:hy, 300:300 + W][..., None]
            S = S * (1 - disk[..., None]) + disk[..., None] * np.array([240, 240, 250], F32) * tex
            sx, sy = mx, my
            dpx = md
            d = md / W
        # clouds
        if cloud_amt > 0:
            c0 = int(cloud_off) % (A.cloud.shape[1] - W)
            n = A.cloud[:hy, c0:c0 + W]
            prof = np.clip(1.25 - f * 1.0, 0.15, 1)
            D = sstep(0.50, 0.74, n) * prof * cloud_amt
            lit = np.clip(1 - d * 1.5, 0, 1) ** 2
            shade = 1 - 0.38 * sstep(0.58, 0.95, n)
            ccol = (pal["cdark"] * (1 - lit[..., None]) + pal["clit"] * lit[..., None]) * shade[..., None]
            ccol = ccol * 0.8 + S * 0.25
            S = S * (1 - D[..., None] * 0.93) + ccol * D[..., None] * 0.93
            S += (np.exp(-d * 14) * 0.3 * glow)[..., None] * pal["sun"]
        F[:hy] = S

    # ---- landscape
    def far_land(self, F, pal, hy, pan, tl, hills=True):
        A = self.A
        off = int(400 + pan * 0.25) % 800
        if hills:
            h = A.far_hills[off:off + W] + hy - 18
            m = ridge_mask(h, int(h.min()) - 1, hy + 4)
            blend(F, int(h.min()) - 1, m, pal["haze"] * 0.85 + pal["hor"] * 0.15)
        off2 = int(400 + pan * 0.5) % 800
        band = tl[:, off2:off2 + W]
        y0 = hy - 120
        col = pal["ink"] * 0.45 + pal["haze"] * 0.55
        blend(F, y0, band[:min(band.shape[0], H - y0)], col)

    def water(self, F, pal, hy, t, glints, rough=1.0):
        A = self.A
        Hw = H - hy
        y = np.arange(Hw, dtype=F32)[:, None]
        rel = y / Hw
        X = A.X
        src_y = hy - 1 - y * 1.35 + np.sin(y * 0.35 + t * 2.2) * (1 + rel * 4) * 0.8 * rough
        dx = (np.sin(X * 0.013 + y * 0.21 + t * 1.3) * (2 + rel * 16) + np.sin(X * 0.031 - t * 2.1 + y * 0.5) * (1 + rel * 7)) * rough
        sy = np.clip(src_y, 0, hy - 1).astype(np.int32)
        sxi = np.clip(X + dx, 0, W - 1).astype(np.int32)
        R = F[np.broadcast_to(sy, (Hw, W)), sxi]
        refl = 0.80 - 0.42 * rel
        Wt = R * refl[..., None] + pal["water"] * (0.20 + 0.30 * rel)[..., None]
        sh = int(t * 22) % H
        sp = A.spark[(np.arange(Hw) + sh) % H][:, (np.arange(W) + int(t * 9)) % W]
        for gx, gstr, gcol in glints:
            wid = 40 + rel * 340
            g = np.exp(-((X - gx) / wid) ** 2) * gstr
            Wt += (g * sp * 2.2 + g * 0.18)[..., None] * gcol
        F[hy:] = Wt

    def mist(self, F, pal, hy, t, amt, speed=8):
        if amt <= 0:
            return
        A = self.A
        o = int(1000 + t * speed) % (A.mist.shape[1] - W)
        y0 = hy - 90
        n = A.mist[:, o:o + W]
        prof = np.exp(-((np.arange(n.shape[0], dtype=F32) - 95) / 55) ** 2)[:, None]
        a = sstep(0.35, 0.85, n) * prof * amt
        blend(F, y0, a, pal["haze"] * 1.15 + 18)

    # ---- object layer compositing
    def comp(self, F, layer, color_fn=None):
        arr = np.asarray(layer, F32)
        a = arr[..., 3:4] / 255
        F *= (1 - a)
        F += a * arr[..., :3]

    def birds(self, d, t, flocks, col):
        for (t0, life, p0, p1, size0, size1, n, seed, arc) in flocks:
            u = (t - t0) / life
            if u < 0 or u > 1:
                continue
            rng = np.random.default_rng(abs(int(seed)))
            k = u
            fx, fy = lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - math.sin(u * math.pi) * arc
            sc = lerp(size0, size1, k)
            fade = min(1, u * 8) * min(1, (1 - u) * 6)
            c = tuple(int(v) for v in col) + (int(240 * fade),)
            for j in range(n):
                row = (j + 1) // 2
                sgn = -1 if j % 2 else 1
                bx = fx - row * sc * 3.2 * (1 if p1[0] > p0[0] else -1) + rng.normal(0, sc * 0.7)
                by = fy + sgn * row * sc * 1.8 + rng.normal(0, sc * 0.7)
                draw_bird(d, bx, by, sc, t * rng.uniform(7, 10) + rng.uniform(0, 6.28), c)

    def fireflies(self, F, t, n, amt, region, seed=3):
        if amt <= 0:
            return
        rng = np.random.default_rng(abs(int(seed)))
        x0, y0, x1, y1 = region
        for i in range(n):
            bx, by = rng.uniform(x0, x1), rng.uniform(y0, y1)
            ph, sp = rng.uniform(0, 6.28), rng.uniform(0.2, 0.6)
            x = bx + math.sin(t * sp + ph) * 50 + math.sin(t * 0.13 + i) * 30
            y = by + math.cos(t * sp * 0.8 + ph) * 25
            pulse = max(0.0, math.sin(t * 1.4 + ph * 3)) ** 2
            add_glow(F, x, y, 16, (255, 220, 120), 0.9 * pulse * amt)
            add_glow(F, x, y, 4, (255, 250, 210), 1.2 * pulse * amt)


# ------------------------------------------------------------------ shots
def tod_at(t):
    keys = [(0, 0.15), (34, 0.55), (67, 1.0), (86, 1.85), (104, 2.05), (146, 2.45), (165, 2.85), (250, 3.0)]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if t <= b:
            return lerp(va, vb, (t - a) / (b - a))
    return 3.0


class Shots:
    """Each shot method returns a float32 HxWx3 frame for global time t, local u in [0,1]."""

    def __init__(self, world):
        self.w = world
        self.A = world.A

    # common river scene with options
    def river(self, t, u, o):
        w, A = self.w, self.A
        hy = 640
        tod = o.get("tod", tod_at(t))
        pal = palette(tod)
        bs = float(w.bass[min(len(w.bass) - 1, int(t * w.fps))])
        F = np.zeros((H, W, 3), F32)
        night = tod > 2.35
        sun_x = o.get("sun_x", 1250)
        sun_y = o.get("sun_y", 520)
        if callable(sun_y):
            sun_y = sun_y(u)
        sr = o.get("sun_r", 30) if (not night and sun_y < hy + 30) else 0
        glow = (1.0 if tod < 1.5 else max(0.25, 1.0 - (tod - 1.5) * 0.6)) * (1 + 0.12 * bs)
        if night:
            glow = 0.0
        moon = None
        if tod > 2.2:
            mx, my = o.get("moon", (1380, 250))
            moon = (mx, my - u * 12, 38)
        pan = o.get("pan", 0) * u + o.get("pan0", 0)
        self.w.sky(F, pal, hy, (sun_x, sun_y, sr), o.get("cloud0", 600) + t * o.get("cloud_speed", 6),
                   o.get("clouds", 0.8), smooth((tod - 1.7) / 1.0), t, moon=moon, glow=glow)
        w.far_land(F, pal, hy, pan, A.tl_river)
        glints = []
        if not night:
            glints.append((sun_x, 1.0 * glow, pal["sun"]))
        if moon is not None:
            glints.append((moon[0], 0.9 * smooth((tod - 2.2) / 0.5), np.array([200, 210, 255], F32)))
        w.water(F, pal, hy, t, glints)
        w.mist(F, pal, hy, t, o.get("mist", 0.4))

        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        ink = tuple(int(v) for v in pal["ink"]) + (255,)
        refl_col = tuple(int(v) for v in (pal["water"] * 0.6 + pal["ink"] * 0.4)) + (150,)
        glows = []
        rlayer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rlayer)
        # boats
        for b in o.get("boats", []):
            bu = smooth(u) * 0.3 + u * 0.7 if b.get("ease") else u
            if "release" in b:
                rt = b["release"]
                bu = 0 if u < rt else ((u - rt) / (1 - rt)) ** 1.6
            x = lerp(b["x"][0], b["x"][1], bu)
            yw = lerp(b["y"][0], b["y"][1], bu)
            L = lerp(b["L"][0], b["L"][1], bu)
            shapes, ywb = boat_shapes(x, yw, L, t, boatman=b.get("man", True), lantern=b.get("lantern", False),
                                      seed=b.get("seed", 0))
            hz = np.clip(1 - (L - 40) / 400, 0, 0.6)  # distant boats get hazy
            bink = tuple(int(v) for v in (pal["ink"] * (1 - hz) + pal["haze"] * hz)) + (255,)
            draw_boat(rd, shapes, bink, mirror_y=ywb + 0.01 * L, fill=refl_col)
            draw_boat(d, shapes, bink)
            for sh in shapes:
                if sh[0] == "lantern":
                    (lx, ly), LL = sh[1], sh[2]
                    glows.append((lx, ly, LL * 0.22, (255, 170, 80), 0.75))
                    glows.append((lx, ly, LL * 0.035, (255, 240, 200), 1.4))
                    glows.append((lx, 2 * ywb - ly + 6, LL * 0.16, (255, 160, 70), 0.35, 2.6))
            if "release" in b:
                px, py = b["post"]
                d.line([(px, py + 30), (px + 4, py - 120)], fill=ink, width=16)
                bow = (x - L / 2 + 0.03 * L, ywb - 0.15 * L)
                if u < b["release"]:
                    mid = ((px + bow[0]) / 2, max(py - 70, bow[1]) + 40)
                    d.line([(px + 4, py - 70), mid, bow], fill=ink, width=4, joint="curve")
                else:
                    k = min(1, (u - b["release"]) * 6)
                    end = (lerp(px + 4, bow[0] - 0.12 * L, k), lerp(py - 70, ywb + 10, k))
                    d.line([bow, ((bow[0] + end[0]) / 2, (bow[1] + end[1]) / 2 + 20), end], fill=ink, width=4, joint="curve")
                # post reflection
                rd.rectangle([px - 8, py + 30, px + 12, py + 170], fill=refl_col)
        # diyas
        for k, dy in enumerate(o.get("diyas", [])):
            x0, y0, x1, y1 = dy
            du = min(1, max(0, u * 1.1 - k * 0.04))
            x, y = lerp(x0, x1, du ** 0.8), lerp(y0, y1, du ** 0.8)
            sz = lerp(40, 6, (y0 - y) / max(1, (y0 - hy))) if y0 > hy else 20
            y += math.sin(t * 1.5 + k) * sz * 0.08
            d.chord([x - sz, y - sz * 0.5, x + sz, y + sz * 0.5], 0, 180, fill=ink)
            fl = 0.85 + 0.15 * math.sin(t * 13 + k * 3) + 0.08 * math.sin(t * 29 + k)
            glows.append((x, y - sz * 0.55, sz * 3.2 * fl, (255, 160, 70), 0.9))
            glows.append((x, y - sz * 0.55, sz * 0.5, (255, 240, 190), 1.7 * fl))
            glows.append((x, y + sz * 1.8, sz * 2.2, (255, 150, 60), 0.45, 3.0))
        # rippled reflections of boats / posts
        ra = np.asarray(rlayer, F32)
        yy = np.arange(H, dtype=F32)[:, None]
        rip = np.clip(0.55 + 0.6 * np.sin(yy * 0.55 + t * 3.0 + np.sin(self.A.X * 0.02 + t) * 2), 0, 1)
        a = ra[..., 3:4] / 255 * rip[..., None] * 0.8
        F *= (1 - a)
        F += a * ra[..., :3]
        # bank / ghat / big tree
        if o.get("wedge") or o.get("ghat") or o.get("bigtree"):
            m = A.wedge if o.get("wedge") else (A.ghat if o.get("ghat") else A.bigtree)
            self.w.comp(F, layer)
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            blend(F, 0, m, pal["ink"])
            if o.get("ghat"):
                glows.append((159, 680, 160, (255, 170, 80), 0.9 * smooth((tod - 2.0) * 2)))
                glows.append((159, 680, 18, (255, 240, 200), 1.5 * smooth((tod - 2.0) * 2)))
        # wanderer walking away along the bank
        if "wanderer" in o:
            wo = o["wanderer"]
            z = lerp(wo["z"][0], wo["z"][1], u)
            x = lerp(wo["p0"][0], wo["p1"][0], z)
            yf = lerp(wo["p0"][1], wo["p1"][1], z)
            hgt = lerp(wo["h"][0], wo["h"][1], z)
            draw_wanderer(d, x, yf, hgt, t * 5.2, ink)
        if "waver" in o:
            x, yf, hh = o["waver"]
            draw_waver(d, x, yf, hh, t, ink)
        sky_bird = tuple(int(v) for v in pal["ink"] * 0.8 + pal["haze"] * 0.2)
        w.birds(d, t, o.get("flocks", []), sky_bird)
        # leaves
        if o.get("leaves"):
            rng = np.random.default_rng(77)
            for i in range(26):
                x0 = rng.uniform(-100, W)
                sp = rng.uniform(40, 90)
                ph = rng.uniform(0, 6.28)
                yy = (rng.uniform(0, H) + t * sp) % (H + 200) - 100
                xx = x0 + math.sin(t * 0.8 + ph) * 80 + t * 25 % W
                xx = xx % (W + 100) - 50
                s = rng.uniform(10, 24)
                a = t * rng.uniform(1, 3) + ph
                pts = rot([(xx - s, yy), (xx, yy - s * 0.4), (xx + s, yy), (xx, yy + s * 0.4)], xx, yy, a)
                d.polygon(pts, fill=ink)
        self.w.comp(F, layer)
        for gl in glows:
            add_glow(F, gl[0], gl[1], gl[2], gl[3], gl[4], gl[5] if len(gl) > 5 else 1.0)
        if o.get("fireflies"):
            w.fireflies(F, t, 26, o["fireflies"], (0, hy - 60, W, H - 40))
        if o.get("shooting"):
            for (ts, x0, y0, ang) in o["shooting"]:
                k = (t - ts) / 1.1
                if 0 < k < 1:
                    hx, hy2 = x0 + math.cos(ang) * 700 * k, y0 + math.sin(ang) * 700 * k
                    for j in range(30):
                        q = j / 30
                        add_glow(F, hx - math.cos(ang) * 260 * q, hy2 - math.sin(ang) * 260 * q, 6,
                                 (220, 230, 255), (1 - q) * 0.9 * math.sin(k * math.pi))
        return F

    def nest(self, t, u, o):
        """Out-of-focus sunset river behind a sharp branch with an empty nest."""
        base_o = dict(o)
        base_o.pop("flocks", None)
        bg = self.river(t, u, dict(base_o, mist=0.5, clouds=0.75))
        img = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8))
        small = img.resize((W // 4, H // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3.2))
        F = np.asarray(small.resize((W, H), Image.BICUBIC), F32).copy()
        pal = palette(o.get("tod", tod_at(t)))
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        self.w.birds(d, t, o.get("flocks", []), tuple(int(v) for v in pal["ink"] * 0.7 + pal["haze"] * 0.3))
        self.w.comp(F, layer)
        dx = int(4 * math.sin(t * 1.1))
        dy = int(3 * math.sin(t * 0.9 + 1))
        m = np.roll(np.roll(self.A.branch, dy, 0), dx, 1)
        rim = np.clip(m - np.roll(m, 3, 1), 0, 1) * 0.6
        blend(F, 0, m, pal["ink"] * 0.6)
        F += rim[..., None] * pal["sun"] * 0.35
        return F

    def road(self, t, u, o):
        w, A = self.w, self.A
        R = A.road
        hy, vx = R["hy"], R["vx"]
        tod = o.get("tod", tod_at(t))
        pal = palette(tod)
        night = tod > 2.35
        F = np.zeros((H, W, 3), F32)
        sun_y = o.get("sun_y", 560)
        sr = 34 if (not night and sun_y < hy + 30) else 0
        glow = 0 if night else (1.0 if tod < 1.5 else max(0.25, 1 - (tod - 1.5) * 0.6))
        moon = (vx + 40, 300 - u * 10, 40) if tod > 2.2 else None
        w.sky(F, pal, hy, (vx + 10, sun_y, sr), 1800 + t * 5, o.get("clouds", 0.7), smooth((tod - 1.7) / 1.0), t,
              moon=moon, glow=glow)
        w.far_land(F, pal, hy, 0, A.tl_road)
        z = R["z"]
        gcol = (pal["haze"] * (1 - z ** 0.5) + pal["ink"] * 1.4 * z ** 0.5)[..., None, :] if False else None
        zz = z[..., None]
        ground = (pal["haze"] * 0.75 * (1 - zz ** 0.45) + (pal["ink"] * 1.6 + 8) * zz ** 0.45)
        G = ground * R["pattern"][..., None]
        rd = R["road"][..., None]
        roadcol = pal["hor"] * 0.55 * (1 - zz ** 0.5) + pal["mid"] * 0.30 * zz ** 0.5 + 10
        G = G * (1 - rd) + roadcol * rd
        F[hy:] = G
        w.mist(F, pal, hy, t, 0.5)
        blend(F, 0, R["trees"], pal["ink"] * 1.0)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        ink = tuple(int(v) for v in pal["ink"]) + (255,)
        wo = o["wanderer"]
        D = lerp(wo["D"][0], wo["D"][1], u)
        zw = 1 / D
        yf = hy + zw * (H - hy)
        x = vx + (zw ** 1.6) * -260 + wo.get("xoff", 60) * zw
        draw_wanderer(d, x, yf, 620 * zw, t * 5.0, ink)
        w.birds(d, t, o.get("flocks", []), tuple(int(v) for v in pal["ink"] * 0.8 + pal["haze"] * 0.2))
        # foreground grass swaying
        rng = np.random.default_rng(91)
        for i in range(170):
            gx = rng.uniform(-20, W + 20)
            if abs(gx - 700) < 380:
                continue
            gh = rng.uniform(60, 190)
            sway = math.sin(t * 1.6 + gx * 0.01) * gh * 0.12
            d.line([(gx, H + 5), (gx + sway * 0.5, H - gh * 0.5), (gx + sway, H - gh)], fill=ink,
                   width=int(rng.integers(2, 5)), joint="curve")
        w.comp(F, layer)
        if o.get("fireflies"):
            w.fireflies(F, t, 22, o["fireflies"], (0, hy, W, H - 80), seed=8)
        return F


def flock(t0, life, p0, p1, s0, s1, n, seed, arc=60):
    return (t0, life, p0, p1, s0, s1, n, seed, arc)


def build_timeline():
    S = []
    # (start, end, kind, options, zoom0, zoom1, panx)
    S.append((0, 34.2, "river", dict(
        sun_x=1300, sun_y=lambda u: lerp(470, 500, u), clouds=0.85, mist=0.35, cloud_speed=7,
        boats=[dict(x=(1650, 1150), y=(668, 668), L=(110, 110), seed=1)],
        flocks=[flock(3, 14, (200, 560), (1300, 470), 14, 4, 6, 1), flock(15, 13, (-50, 380), (1200, 450), 12, 4, 5, 2),
                flock(25, 10, (300, 600), (1250, 500), 10, 3, 4, 3)]), 1.0, 1.10, 0))
    S.append((34.2, 42.2, "river", dict(
        sun_x=820, sun_y=545, wedge=True, clouds=0.8, mist=0.45,
        wanderer=dict(z=(0.0, 0.62), p0=(230, 905 - 230 / 830 * 257 + 6), p1=(800, 905 - 800 / 830 * 257 + 2), h=(330, 16)),
        flocks=[flock(35, 8, (1400, 430), (850, 520), 10, 4, 5, 4)]), 1.04, 1.12, -40))
    S.append((42.2, 50.4, "nest", dict(
        sun_x=700, sun_y=540,
        flocks=[flock(42.4, 8, (1100, 640), (500, 430), 22, 5, 7, 5, 120)]), 1.0, 1.06, 0))
    S.append((50.4, 58.6, "road", dict(
        sun_y=575, wanderer=dict(D=(1.6, 3.6), xoff=60),
        flocks=[flock(51, 7, (300, 300), (1100, 500), 10, 4, 4, 6)]), 1.0, 1.08, 0))
    S.append((58.6, 67.0, "river", dict(
        sun_x=960, sun_y=560, sun_r=46, clouds=0.6, mist=0.35,
        boats=[dict(x=(760, 900), y=(690, 690), L=(200, 200), seed=2)],
        flocks=[flock(58.8, 7.5, (1700, 640), (300, 430), 18, 10, 9, 7, 80)]), 1.12, 1.02, 0))
    S.append((67.0, 86.0, "river", dict(
        sun_x=1150, sun_y=lambda u: lerp(560, 700, u), clouds=0.95, cloud_speed=130, cloud0=200, mist=0.5,
        boats=[dict(x=(500, 760), y=(700, 700), L=(160, 160), seed=3)],
        flocks=[flock(72, 10, (100, 300), (1500, 420), 10, 4, 5, 8), flock(80, 6, (1800, 450), (1100, 600), 8, 3, 4, 9)]),
        1.0, 1.05, 0))
    S.append((86.0, 104.3, "river", dict(
        sun_x=1250, sun_y=720, clouds=0.75, mist=0.5, fireflies=0.3,
        boats=[dict(x=(-250, 1250), y=(760, 720), L=(420, 330), lantern=True, seed=4)]), 1.05, 1.0, 0))
    S.append((104.3, 121.3, "road", dict(
        sun_y=640, wanderer=dict(D=(1.15, 2.7), xoff=40), clouds=0.8, fireflies=0.6,
        flocks=[flock(110, 9, (1500, 250), (700, 420), 9, 4, 4, 10)]), 1.0, 1.10, 0))
    S.append((121.3, 129.8, "river", dict(
        sun_x=1300, sun_y=720, clouds=0.7, mist=0.45,
        boats=[dict(x=(980, 1500), y=(820, 700), L=(520, 200), release=0.28, post=(420, 840), man=False, seed=5)]),
        1.06, 1.0, 0))
    S.append((129.8, 138.2, "river", dict(
        sun_x=1150, sun_y=720, clouds=0.7, mist=0.55,
        boats=[dict(x=(1150, 1260), y=(690, 668), L=(170, 80), man=False, seed=5)],
        flocks=[flock(130.5, 7, (300, 300), (1100, 520), 10, 4, 5, 11)]), 1.0, 1.06, 0))
    S.append((138.2, 146.4, "nest", dict(
        sun_x=900, sun_y=730, tod=2.3, moon=(1500, 230),
        flocks=[flock(138.4, 8, (1150, 650), (420, 380), 20, 5, 6, 12, 110)]), 1.06, 1.0, 0))
    S.append((146.4, 165.0, "river", dict(
        moon=(1350, 230), clouds=0.45, cloud_speed=10, mist=0.75, fireflies=0.9,
        boats=[dict(x=(1500, 1300), y=(672, 672), L=(90, 90), lantern=True, seed=6)]), 1.0, 1.08, 0))
    S.append((165.0, 184.0, "river", dict(
        moon=(1250, 210), clouds=0.3, mist=0.5, bigtree=True, fireflies=0.8,
        shooting=[(168.5, 700, 90, 0.45), (176.0, 1300, 60, 2.6), (181.0, 400, 140, 0.35)]), 1.06, 1.0, 0))
    S.append((184.0, 200.6, "river", dict(
        moon=(1450, 220), clouds=0.35, mist=0.6, leaves=True,
        diyas=[(860, 1010, 980, 690), (1040, 1060, 1080, 700), (700, 960, 900, 690), (1200, 990, 1150, 680),
               (560, 1050, 820, 700), (1350, 1040, 1230, 690), (980, 940, 1010, 676)]), 1.0, 1.07, 0))
    S.append((200.6, 209.3, "river", dict(
        moon=(1500, 220), clouds=0.3, mist=0.5, ghat=True, waver=(470, 870, 210),
        boats=[dict(x=(900, 1350), y=(800, 690), L=(300, 120), lantern=True, seed=7)]), 1.04, 1.0, 0))
    S.append((209.3, 217.6, "river", dict(
        moon=(1100, 240), clouds=0.35, mist=0.6, fireflies=0.5,
        boats=[dict(x=(1050, 1130), y=(680, 670), L=(110, 70), lantern=True, seed=8)]), 1.0, 1.06, 0))
    S.append((217.6, 225.9, "nest", dict(
        moon=(800, 330), tod=3.0, clouds=0.3,
        flocks=[flock(217.8, 8, (1200, 600), (500, 300), 18, 5, 7, 13, 100)]), 1.0, 1.06, 0))
    S.append((225.9, 234.3, "road", dict(
        wanderer=dict(D=(2.0, 5.5), xoff=50), clouds=0.4, fireflies=0.9), 1.0, 1.08, 0))
    S.append((234.3, 260.0, "river", dict(
        moon=(1300, 230), clouds=0.35, mist=0.7, fireflies=0.6,
        boats=[dict(x=(1260, 1330), y=(668, 660), L=(60, 18), lantern=True, seed=9)],
        flocks=[flock(236, 12, (200, 240), (1250, 230), 10, 3, 5, 14)]), 1.14, 1.0, 0))
    return S


# ------------------------------------------------------------------ text overlay
class Text:
    def __init__(self, cfg):
        self.cfg = cfg
        self.lines = cfg["lines"]
        self.big, self.small = [], []
        for ln in self.lines:
            f = V1.fit_font(ln["text"], V1.FONT_SERIF_BOLD, 86, 1600)
            self.big.append(V1.text_sprite(ln["text"], f, fill=(255, 248, 236), glow=(255, 180, 110), glow_r=18))
            fs = V1.fit_font(ln["text"], V1.FONT_SERIF, 44, 1300)
            self.small.append(V1.text_sprite(ln["text"], fs, fill=(240, 228, 236), glow=None))
        tf = ImageFont.truetype(V1.FONT_SERIF_BOLD, 160, layout_engine=ImageFont.Layout.RAQM)
        self.title = V1.text_sprite(cfg["title"], tf, glow_r=28)
        cf = ImageFont.truetype(V1.FONT_LATIN_LIGHT, 40)
        self.credits = [V1.text_sprite(c, cf, fill=(250, 238, 228), glow=(255, 170, 120), glow_r=10)
                        for c in cfg["credits"]]
        wf = ImageFont.truetype(V1.FONT_SERIF, 30, layout_engine=ImageFont.Layout.RAQM)
        wl = ImageFont.truetype(V1.FONT_LATIN_LIGHT, 27)
        self.wm = [V1.text_sprite(cfg["title"], wf, fill=(255, 240, 230), glow=None),
                   V1.text_sprite("·  " + cfg.get("artist", ""), wl, fill=(255, 240, 230), glow=None)]
        nf = ImageFont.truetype(V1.FONT_LATIN, 60)
        self.note = V1.text_sprite("♪", nf, fill=(255, 228, 196), glow=(255, 160, 90), glow_r=12)

    @staticmethod
    def paste(img, spr, cx, cy, alpha, reveal=1.0):
        if alpha <= 0.01:
            return
        s, pad, tw, th = spr
        arr = np.array(s)
        a = arr[..., 3].astype(F32) * alpha
        if reveal < 0.999:
            xs = np.arange(arr.shape[1], dtype=F32)
            edge = pad + reveal * (tw + 160) - 80
            a *= np.clip((edge - xs) / 80 + 0.5, 0, 1)[None, :]
        arr[..., 3] = a.astype(np.uint8)
        im = Image.fromarray(arr)
        img.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

    def draw(self, img, t):
        L = self.lines
        first, last_end = L[0]["start"], L[-1]["end"]
        if t < first - 0.4:
            a = smooth((t - 1.0) / 2.5) * (1 - smooth((t - (first - 4)) / 2.5))
            self.paste(img, self.title, W / 2, 330 + (1 - smooth((t - 1) / 3)) * 30, a, reveal=smooth((t - 0.8) / 2.6))
            for k, c in enumerate(self.credits):
                self.paste(img, c, W / 2, 490 + k * 60, smooth((t - 4 - k) / 2) * (1 - smooth((t - (first - 4)) / 2.5)))
        if t > last_end + 0.3:
            a = smooth((t - last_end - 0.3) / 1.6)
            self.paste(img, self.title, W / 2, 360, a)
            for k, c in enumerate(self.credits):
                self.paste(img, c, W / 2, 520 + k * 60, a)
        wa = 0.55 * smooth((t - first + 1) / 2) * (1 - smooth((t - last_end) / 1.5))
        if wa > 0.01:
            (s1, p1, w1, h1), (s2, p2, w2, h2) = self.wm
            self.paste(img, self.wm[0], 60 + w1 / 2, 48 + h1 / 2, wa)
            self.paste(img, self.wm[1], 60 + w1 + 16 + w2 / 2, 48 + h1 - h2 / 2 + 5, wa)
        for i in range(len(L) - 1):
            g0, g1 = L[i]["end"] + 2.0, L[i + 1]["start"] - 1.5
            if g1 - g0 > 12 and g0 < t < g1:
                a = smooth((t - g0) / 2) * (1 - smooth((t - (g1 - 2)) / 2))
                self.paste(img, self.note, W / 2, 300 + math.sin(t * 2.2) * 8, a)
                for k, c in enumerate(self.credits):
                    self.paste(img, c, W / 2, 390 + k * 60, a * 0.9)
        CY = 300
        for i, ln in enumerate(L):
            s, e = ln["start"], ln["end"]
            nxt = L[i + 1]["start"] if i + 1 < len(L) else e + 3
            hold = min(nxt - 0.15, e + 2.5)
            if not (s - 0.5 <= t <= hold + 0.05):
                continue
            a = smooth((t - (s - 0.5)) / 0.5) * (1 - smooth((t - (hold - 0.5)) / 0.5))
            rv = smooth((t - (s - 0.45)) / 1.5)
            rise = (1 - smooth((t - (s - 0.5)) / 0.9)) * 18
            self.paste(img, self.big[i], W / 2, CY + rise, a, reveal=rv)
            if i + 1 < len(L) and nxt - e < 6:
                na = a * 0.4 * (1 - smooth((t - (nxt - 0.6)) / 0.4)) * smooth((t - s - 1.0) / 1.0)
                self.paste(img, self.small[i + 1], W / 2, CY + 118, na)


# ------------------------------------------------------------------ frame assembly
class Film:
    def __init__(self, cfg, duration, fps, feats):
        self.world = World(feats, fps)
        self.shots = Shots(self.world)
        self.tl = build_timeline()
        self.text = Text(cfg)
        self.duration, self.fps = duration, fps
        lut = []
        for i in range(256):
            x = i / 255
            y = x + 0.08 * math.sin(2 * math.pi * x) * (1 - x) * 0.9  # gentle s-curve
            lut.append(int(np.clip(y * 255 + 4 * (1 - x), 0, 255)))
        self.lut = lut * 3

    def shot_frame(self, idx, t):
        s0, s1, kind, o, z0, z1, pan = self.tl[idx]
        u = min(1.0, max(0.0, (t - s0) / (s1 - s0)))
        F = getattr(self.shots, kind)(t, u, o)
        img = Image.fromarray(np.clip(F, 0, 255).astype(np.uint8))
        z = lerp(z0, z1, smooth(u) * 0.5 + u * 0.5)
        if abs(z - 1) > 1e-3 or pan:
            cw, ch = W / z, H / z
            cx = W / 2 + pan * (u - 0.5)
            box = (cx - cw / 2, H / 2 - ch / 2, cx + cw / 2, H / 2 + ch / 2)
            img = img.resize((W, H), Image.BICUBIC, box=box)
        return img

    def render(self, fi):
        t = fi / self.fps
        idx = 0
        for i, s in enumerate(self.tl):
            if s[0] <= t < s[1]:
                idx = i
                break
        else:
            idx = len(self.tl) - 1
        img = self.shot_frame(idx, t)
        XF = 0.6
        s0, s1 = self.tl[idx][0], self.tl[idx][1]
        if idx + 1 < len(self.tl) and t > s1 - XF:
            k = smooth((t - (s1 - XF)) / (2 * XF))
            img = Image.blend(img, self.shot_frame(idx + 1, t), k)
        elif idx > 0 and t < s0 + XF:
            k = smooth((t - (s0 - XF)) / (2 * XF))
            img = Image.blend(self.shot_frame(idx - 1, t), img, k)
        # bloom
        small = img.resize((W // 6, H // 6), Image.BILINEAR)
        sa = np.asarray(small, F32)
        bright = np.clip(sa - 185, 0, 255) * 1.6
        bl = Image.fromarray(bright.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR)
        A = self.world.A
        F = np.asarray(img, F32) + np.asarray(bl, F32) * 0.40
        F *= A.vig
        g = A.grain[fi % 6]
        F += np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None]
        # fade in/out
        fade = smooth(t / 1.5) * (1 - smooth((t - (self.duration - 2.5)) / 2.3))
        F *= fade
        img = Image.fromarray(np.clip(F, 0, 255).astype(np.uint8)).point(self.lut).convert("RGBA")
        self.text.draw(img, t)
        return img.convert("RGB")


# ------------------------------------------------------------------ driver
_film = None


def _init(cfg, duration, fps, feats):
    global _film
    _film = Film(cfg, duration, fps, feats)


def _chunk(args):
    idx, f0, f1, fps, outdir = args
    out = os.path.join(outdir, f"chunk_{idx:03d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
                          "-tune", "film", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(_film.render(fi).tobytes())
        if (fi - f0) % 150 == 0:
            print(f"  chunk {idx}: {fi - f0}/{f1 - f0}", flush=True)
    p.stdin.close()
    p.wait()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--preview", nargs=2, type=float)
    ap.add_argument("--still", type=float, nargs="*")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, "lyrics.json"), encoding="utf-8"))
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", a.audio]).strip())
    print(f"duration {dur:.2f}s; analysing audio…", flush=True)
    feats = V1.load_audio_features(a.audio, a.fps, dur)
    if a.still is not None:
        _init(cfg, dur, a.fps, feats)
        base = os.path.splitext(a.out)[0]
        for s in a.still:
            _film.render(int(s * a.fps)).save(f"{base}_{s:06.1f}.jpg", quality=90)
        return
    start, end = a.preview if a.preview else (0, dur)
    f0, f1 = int(start * a.fps), min(int(end * a.fps), int(dur * a.fps))
    outdir = os.path.splitext(a.out)[0] + "_chunks"
    os.makedirs(outdir, exist_ok=True)
    n = max(1, a.jobs)
    per = math.ceil((f1 - f0) / (n * 4))
    jobs = [(i, f, min(f + per, f1), a.fps, outdir) for i, f in enumerate(range(f0, f1, per))]
    with Pool(n, initializer=_init, initargs=(cfg, dur, a.fps, feats)) as pool:
        chunks = pool.map(_chunk, jobs, chunksize=1)
    lst = os.path.join(outdir, "list.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.abspath(c)}'\n" for c in chunks)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ss", str(start),
                    "-t", str(end - start), "-i", a.audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", "-shortest", a.out], check=True)
    for c in chunks:
        os.remove(c)
    os.remove(lst)
    os.rmdir(outdir)
    print("wrote", a.out)


if __name__ == "__main__":
    sys.exit(main())
