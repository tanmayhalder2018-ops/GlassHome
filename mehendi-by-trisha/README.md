# Mehendi by Trisha — website

Portfolio and booking website for **Mehendi by Trisha**, mehendi artist in Maslandapur, West Bengal.
Built with React, Vite, TypeScript, Framer Motion and Lucide icons.

## Where to change things

| What | File |
| --- | --- |
| **WhatsApp number**, default message | `src/config/site.ts` → `WHATSAPP_NUMBER` (format `91XXXXXXXXXX`) |
| **Instagram / Facebook links** | `src/config/site.ts` → `SOCIAL` (empty `''` = hidden) |
| Google Maps link | `src/config/site.ts` → `MAPS_URL` |
| **Gallery photos, titles, captions, categories** | `src/data/gallery.ts` |
| Services text & photos | `src/data/services.ts` |
| Artist biography | `src/components/ArtistIntroduction.tsx` → `BIO` |
| Instagram-style grid photos | `src/components/InstagramSection.tsx` → `FEED` |
| Website address (canonical, sitemap, social previews) | `.env` → `VITE_SITE_URL` (empty = Netlify address is used automatically) |
| **Trisha's portrait** (hero, About, artist card) | `public/images/trisha-portrait.jpg` — replace this file, or put the original in `raw-photos/trisha-portrait.jpg` and run `npm run images` |

## Adding or replacing gallery photos

1. Copy the original photo into `raw-photos/`, named the way you want it referenced,
   e.g. `raw-photos/bridal-rose-palm.jpg`. (This folder is not committed — originals stay on your computer.)
2. Run `npm run images` — this creates optimised WebP copies in `public/images/work/`
   and records the size in `src/data/image-manifest.json`.
3. Add an entry in `src/data/gallery.ts` with `slug: 'bridal-rose-palm'`, a title, alt text
   and categories (`bridal`, `arabic`, `traditional`, `minimal`, `festive` — or `[]` if unsure).

To replace a photo, put a new file with the same name in `raw-photos/` and run `npm run images -- --force`.
To remove one, delete its entry in `gallery.ts`.
A gallery filter only appears once at least one photo uses that category (e.g. "Festive").

## Develop & build

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Live on GitHub Pages

Every push to the default branch (`claude/song-graphic-video-youtube-jgzlyo`) that touches this
folder rebuilds and publishes the site with `.github/workflows/deploy-chord-app.yml`:

**https://tanmayhalder2018-ops.github.io/GlassHome/mehendi/**

(ChordSathi stays at https://tanmayhalder2018-ops.github.io/GlassHome/ — both share one Pages site.)
When a custom domain is chosen, change `VITE_SITE_URL` in that workflow.

## Deploy on Netlify (optional alternative)

`netlify.toml` at the repository root already points Netlify at this folder:
base `mehendi-by-trisha`, command `npm run build`, publish `dist`.

1. Netlify → *Add new site → Import an existing project* → choose this GitHub repository.
2. Leave the build settings as detected from `netlify.toml` and deploy.
3. No domain needs to be set yet: while `VITE_SITE_URL` is empty, a Netlify build uses
   the site's Netlify address for the canonical URL, sitemap and social previews.
   Once the real domain is live, set `VITE_SITE_URL` in `.env` (or as an environment
   variable in Netlify → Site configuration → Environment variables) and redeploy.
