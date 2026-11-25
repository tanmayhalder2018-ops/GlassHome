import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Maximize2, ChevronDown } from 'lucide-react'
import { GALLERY, ACTIVE_CATEGORIES, CATEGORY_LABELS, type Category } from '../data/gallery'
import { whatsappLink } from '../config/site'
import { Img } from './Img'
import { Reveal, RevealText, ease } from './Reveal'
import { useLightbox } from './Lightbox'
import { Button } from './Button'
import { WhatsAppIcon } from './BrandIcons'

type Filter = 'all' | Category

/** Columns for the current width: 2 on phones (compact), 3 on tablets, 4 on desktops. */
function useColumns() {
  const get = () => (typeof window === 'undefined' ? 2 : window.innerWidth >= 1100 ? 4 : window.innerWidth >= 700 ? 3 : 2)
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const on = () => setCols(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return cols
}

/** How many photos show before "View all" on phones, to keep the page short. */
const MOBILE_PREVIEW = 6

export function Gallery() {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState(false)
  const { open } = useLightbox()
  const cols = useColumns()
  const items = useMemo(() => (filter === 'all' ? GALLERY : GALLERY.filter((g) => g.categories.includes(filter))), [filter])
  const limited = cols === 2 && !expanded && items.length > MOBILE_PREVIEW
  const shown = limited ? items.slice(0, MOBILE_PREVIEW) : items
  // Deal photos into columns left-to-right so the layout stays balanced and reads in order.
  const columns = Array.from({ length: Math.min(cols, shown.length) }, (_, c) =>
    shown.map((g, i) => ({ g, i })).filter(({ i }) => i % cols === c),
  )

  return (
    <section id="gallery" className="section gallery" aria-labelledby="gallery-title">
      <div className="container">
        <header className="section-head section-head--split">
          <div>
            <Reveal>
              <p className="eyebrow"><span className="eyebrow__line" /> The Portfolio</p>
            </Reveal>
            <h2 id="gallery-title" className="section-title">
              <RevealText text="The Master" /> <RevealText text="Gallery" className="italic" delay={0.12} />
            </h2>
          </div>
          <Reveal delay={0.12} className="section-head__aside">
            <p>
              <mark className="hl">Real work, real hands</mark> — every photo is a design by Trisha. Tap any image to see it
              in full detail.
            </p>
          </Reveal>
        </header>

        <div className="filters" role="group" aria-label="Filter the gallery by style">
          {ACTIVE_CATEGORIES.map((c) => {
            const count = c === 'all' ? GALLERY.length : GALLERY.filter((g) => g.categories.includes(c)).length
            return (
              <button
                key={c}
                className={`filter ${filter === c ? 'is-active' : ''}`}
                aria-pressed={filter === c}
                onClick={() => {
                  setFilter(c)
                  setExpanded(false)
                }}
              >
                {filter === c && <m.span layoutId="filter-pill" className="filter__pill" transition={{ duration: 0.45, ease }} />}
                <span className="filter__label">{CATEGORY_LABELS[c]}</span>
                <sup>{count}</sup>
              </button>
            )
          })}
        </div>

        <p className="visually-hidden" aria-live="polite">
          Showing {shown.length} of {items.length} {items.length === 1 ? 'design' : 'designs'} in {CATEGORY_LABELS[filter]}.
        </p>

        <AnimatePresence mode="wait">
          <m.div
            key={filter + String(expanded)}
            className={`masonry masonry--${columns.length}`}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {columns.map((col, c) => (
              <ul className="masonry__col" key={c}>
                {col.map(({ g, i }) => (
                  <m.li
                    key={g.slug}
                    className="masonry__item"
                    variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
                  >
                    <button className="tile" onClick={() => open(items, i)} aria-label={`View “${g.title}” full screen`}>
                      <Img slug={g.slug} alt={g.alt} fit="natural" sizes="(min-width: 1100px) 23vw, (min-width: 700px) 31vw, 46vw" />
                      <span className="tile__shade" aria-hidden="true" />
                      <span className="tile__meta">
                        <span className="tile__title">{g.title}</span>
                        {g.categories.length > 0 && <span className="tile__tags">{g.categories.map((cat) => CATEGORY_LABELS[cat]).join(' · ')}</span>}
                      </span>
                      <span className="tile__zoom" aria-hidden="true"><Maximize2 size={14} strokeWidth={1.6} /></span>
                    </button>
                  </m.li>
                ))}
              </ul>
            ))}
          </m.div>
        </AnimatePresence>

        <div className="gallery__foot">
          {limited && (
            <button className="btn btn--outline" onClick={() => setExpanded(true)}>
              <span>View all {items.length} designs</span>
              <ChevronDown size={16} strokeWidth={1.6} />
            </button>
          )}
          <Button
            href={whatsappLink('Hello Trisha! I loved the designs in your Mehendi by Trisha gallery and would like to enquire about booking. Please share your availability and pricing.')}
            external
            icon={<WhatsAppIcon size={17} />}
          >
            Love a design? Enquire
          </Button>
        </div>
      </div>
    </section>
  )
}
