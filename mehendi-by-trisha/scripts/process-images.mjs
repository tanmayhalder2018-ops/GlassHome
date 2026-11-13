/**
 * Image pipeline for Mehendi by Trisha.
 *
 * Put original photos (JPG / PNG / HEIC-converted JPG) in `raw-photos/`,
 * named with the slug you want to use, e.g. `raw-photos/bridal-peacock.jpg`.
 * Then run:  npm run images
 *
 * For every photo this writes responsive WebP files to
 * `public/images/work/<slug>-<width>.webp` and records the real size plus a
 * tiny blurred placeholder in `src/data/image-manifest.json`.
 * The original photos are never modified.
 */
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'raw-photos')
const OUT = path.join(root, 'public', 'images', 'work')
const MANIFEST = path.join(root, 'src', 'data', 'image-manifest.json')
const WIDTHS = [480, 960, 1600]

const force = process.argv.includes('--force')

await mkdir(OUT, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {}

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f) && !f.startsWith('_'))
if (!files.length) console.warn('No photos found in raw-photos/')

for (const file of files) {
  const slug = path.parse(file).name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  const input = path.join(SRC, file)
  // .rotate() applies the phone's EXIF orientation so nothing appears sideways.
  const base = sharp(input).rotate()
  const meta = await base.metadata()
  const portrait = (meta.orientation ?? 1) >= 5
  const width = portrait ? meta.height : meta.width
  const height = portrait ? meta.width : meta.height

  const sizes = WIDTHS.filter((w) => w < width).concat(width < WIDTHS.at(-1) ? [width] : [])
  for (const w of sizes) {
    const out = path.join(OUT, `${slug}-${w}.webp`)
    if (!force && existsSync(out)) continue
    await sharp(input).rotate().resize({ width: w }).webp({ quality: w > 1000 ? 76 : 80, effort: 5 }).toFile(out)
  }

  const lqipBuf = await sharp(input).rotate().resize({ width: 16 }).blur(0.6).webp({ quality: 40 }).toBuffer()
  manifest[slug] = {
    width,
    height,
    sizes,
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
  }
  console.log(`✓ ${slug}  ${width}×${height}  → ${sizes.join(', ')}`)
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

// Social share image (1200×630) built from the hero photo.
const og = path.join(root, 'public', 'og-image.jpg')
const heroSrc = files.find((f) => f.startsWith('bridal-peacock-elephant-palm'))
if (heroSrc && (force || !existsSync(og))) {
  await sharp(path.join(SRC, heroSrc)).rotate().resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82 }).toFile(og)
  console.log('✓ og-image.jpg')
}
