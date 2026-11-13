/**
 * ─────────────────────────────────────────────
 *  GALLERY — every portfolio photo lives here
 * ─────────────────────────────────────────────
 *
 * To ADD a photo:
 *   1. Put the original in `raw-photos/` named after its slug,
 *      e.g. `raw-photos/bridal-rose-palm.jpg`
 *   2. Run `npm run images`
 *   3. Add an entry below with that slug.
 *
 * To REMOVE a photo: delete its entry below (the files in
 * public/images/work can be deleted too).
 *
 * `categories` — any of: 'bridal' | 'arabic' | 'traditional' | 'minimal' | 'festive'.
 *   Leave it empty ([]) if unsure: the photo still shows under "All Work".
 *   A filter button only appears once at least one photo uses that category.
 *
 * `focus` — which part of the photo to keep when a layout has to crop it
 *   (CSS object-position, e.g. 'center 30%'). The gallery and lightbox
 *   always show the full, uncropped photo.
 */
import manifest from './image-manifest.json'

export type Category = 'bridal' | 'arabic' | 'traditional' | 'minimal' | 'festive'

export const CATEGORY_LABELS: Record<'all' | Category, string> = {
  all: 'All Work',
  bridal: 'Bridal',
  arabic: 'Arabic',
  traditional: 'Traditional',
  minimal: 'Minimal',
  festive: 'Festive',
}

export interface GalleryItem {
  slug: string
  title: string
  alt: string
  caption?: string
  categories: Category[]
  focus?: string
}

export const GALLERY: GalleryItem[] = [
  {
    slug: 'bridal-peacock-elephant-palm',
    title: 'The Royal Peacock',
    alt: 'Bridal mehendi on a palm with a peacock, hanging jhumka strings, an elephant and lotus wrist border, and lotus-tipped fingers',
    caption: 'A full bridal palm — peacock, elephants, lotus panels and latticed fingers.',
    categories: ['bridal'],
    focus: 'center 45%',
  },
  {
    slug: 'arabic-floral-shaded-palm',
    title: 'Golden Bloom',
    alt: 'Arabic-style shaded floral mehendi flowing diagonally across a palm onto the fingers',
    caption: 'Shaded lotus blooms flowing from wrist to fingertip.',
    categories: ['arabic'],
    focus: 'center 40%',
  },
  {
    slug: 'bridal-initials-back-hands',
    title: 'Two Hands, One Story',
    alt: 'Back-hand bridal mehendi on both hands with mandalas, one holding a lotus and one the initials A G, with leaf vines and jhumkas on the fingers',
    caption: 'Matching back hands with a hidden pair of initials.',
    categories: ['bridal'],
    focus: 'center 40%',
  },
  {
    slug: 'floral-trail-garden-palm',
    title: 'Garden Trail',
    alt: 'Floral mehendi trail across a palm and wrist with roses, beaded strings and a geometric finger pattern, photographed in a garden',
    caption: 'Roses, beads and geometry — photographed in the garden.',
    categories: ['arabic'],
    focus: 'center 45%',
  },
  {
    slug: 'minimal-lotus-back-hand',
    title: 'Little Lotus',
    alt: 'Minimal bold lotus mehendi motif on the back of a hand, freshly applied',
    caption: 'One bold lotus — simple, striking, quick to apply.',
    categories: ['minimal'],
    focus: 'center 60%',
  },
  {
    slug: 'bridal-peacock-jhumka-palm',
    title: 'Peacock & Jhumkas',
    alt: 'Mehendi on a palm with a peacock, a crown at the wrist, hanging jhumka strings, lattice work and floral finger motifs',
    caption: 'A peacock framed by jhumka strings and lattice.',
    categories: ['bridal'],
    focus: 'center 40%',
  },
  {
    slug: 'lotus-mandala-palm',
    title: 'Lotus Mandala',
    alt: 'Circular mandala mehendi with a lotus at its centre on the palm, a lotus wrist cuff and swirl motifs on the fingers',
    caption: 'A lotus at the heart of a mandala, with a matching wrist cuff.',
    categories: ['traditional'],
    focus: 'center 35%',
  },
  {
    slug: 'intricate-full-palm',
    title: 'Fine Detail',
    alt: 'Densely detailed palm mehendi with roses, netting, beaded arcs and paisleys, fingertips dipped in henna',
    caption: 'Netting, roses and beaded arcs in close detail.',
    categories: [],
    focus: 'center 40%',
  },
  {
    slug: 'floral-vine-palm',
    title: 'Climbing Vine',
    alt: 'Mehendi on a palm with a floral cluster at the wrist, a curling vine across the palm and ring motifs on each finger',
    caption: 'A soft vine climbing towards the fingers.',
    categories: [],
    focus: 'center 55%',
  },
  {
    slug: 'minimal-lotus-back-hand-2',
    title: 'Little Lotus, Again',
    alt: 'Minimal lotus mehendi on the back of a hand with simple ring bands on the fingers',
    caption: 'The same lotus, finished with simple finger bands.',
    categories: ['minimal'],
    focus: 'center 35%',
  },
]

/** Non-gallery photos used elsewhere on the site. */
export const CONES_SLUG = 'henna-cones'
export const HERO_SLUG = 'bridal-peacock-elephant-palm'

/* ─────────── helpers (no need to edit below) ─────────── */

interface ManifestEntry {
  width: number
  height: number
  sizes: number[]
  lqip: string
}
const images = manifest as Record<string, ManifestEntry>

export function getImage(slug: string) {
  const entry = images[slug]
  if (!entry) throw new Error(`Image "${slug}" not found. Put it in raw-photos/ and run "npm run images".`)
  const base = import.meta.env.BASE_URL
  const url = (w: number) => `${base}images/work/${slug}-${w}.webp`
  const largest = entry.sizes[entry.sizes.length - 1]
  return {
    ...entry,
    src: url(entry.sizes.includes(960) ? 960 : largest),
    large: url(largest),
    srcSet: entry.sizes.map((w) => `${url(w)} ${w}w`).join(', '),
  }
}

export const ACTIVE_CATEGORIES = (Object.keys(CATEGORY_LABELS) as ('all' | Category)[]).filter(
  (c) => c === 'all' || GALLERY.some((g) => g.categories.includes(c)),
)

export function findItem(slug: string) {
  return GALLERY.find((g) => g.slug === slug)
}
