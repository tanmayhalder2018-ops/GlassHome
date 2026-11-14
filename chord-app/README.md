# ChordSathi

A free chord finder that runs entirely in the browser. Nothing is uploaded.

## Features
- **Song mode**: open any audio or video file and get a chord timeline synced to playback
- Large current/next chord display with **guitar and/or piano** diagrams (choose Guitar / Piano / Both) and chord notes
- **Tempo (BPM), beats and time signature** detection: 2/4, 3/4, 4/4, 5/4, 6/8, 9/8 and 12/8 are found automatically, and 5/8, 7/8 and 7/4 can be picked by hand. Chords snap to beats and the chord sheet is laid out in bars, with a live beat counter. Controls let you halve or double the tempo, choose the time signature, and move the bar lines.
- Key detection, transpose (±11), capo (0–7), and a "simple chords" mode (major/minor only)
- A slider to control how often chords change (detection sensitivity)
- Practice tools: speed 0.5×–1.25×, A–B loop between chords, ±5s skip, and keyboard shortcuts (Space, ←, →)
- Export the chord sheet as a `.txt` file
- **Live / YouTube mode**: detect chords in real time from the mic, or from another browser tab such as a YouTube video (Chrome or Edge on a computer). Chords are logged with their times and can be copied as a chord sheet

## Install on your phone (PWA)
1. Merge this branch into the default branch.
2. In the repo on GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The *Deploy ChordSathi to GitHub Pages* workflow publishes the app at
   `https://<your-username>.github.io/<repo-name>/`. You can also run it manually from the **Actions** tab.
4. Open that link on your phone:
   - **Android (Chrome):** tap **Install app** in the app, or use ⋮ → *Add to Home screen*
   - **iPhone (Safari):** tap Share → *Add to Home Screen*

After it's installed, the app works offline.

## Run locally
Open `index.html` in a browser. To use the mic, serve the folder over https or localhost, for example:

    cd chord-app && python3 -m http.server 8000
    # open http://localhost:8000

## How it works
Rhythm: log spectral-flux onset envelope → tempo from autocorrelation (harmonic comb, tempo prior, 3:2 beat-salience check)
→ dynamic-programming beat tracker → beats-per-bar and downbeat from where harmony and accents change, with a triplet-feel test for compound meters.
Chords are then decoded per beat, with chord changes favoured on downbeats.

FFT → peak-picked chroma + bass chroma → template matching (maj, m, 7, m7, maj7, sus4, dim)
→ Viterbi smoothing with a chord-change penalty. The key is estimated with Krumhansl–Schmuckler profiles.
