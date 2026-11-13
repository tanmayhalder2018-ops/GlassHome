import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Maximize2 } from 'lucide-react'
import { GALLERY, ACTIVE_CATEGORIES, CATEGORY_LABELS, type Category } from '../data/gallery'
import { whatsappLink } from '../config/site'
import { Img } from './Img'
import { Reveal, RevealText, ease } from './Reveal'
import { useLightbox } from './Lightbox'
import { Button } from './Button'
import { WhatsAppIcon } from './BrandIcons'
import { Mandala } from './Botanical'

type Filter = 'all' | Category

/** Number of gallery columns for the current screen width. */
function useColumns() {
  const get = () => (typeof window === 'undefined' ? 1 : window.innerWidth >= 1100 ? 3 : window.innerWidth >= 560 ? 2 : 1)
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const on = () => setCols(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return cols
}

export function Gallery() {
  const [filter, setFilter] = useState<Filter>('all')
  const { open } = useLightbox()
  const items = useMemo(() => (filter === 'all' ? GALLERY : GALLERY.filter((g) => g.categories.includes(filter))), [filter])
  const cols = useColumns()
  // Deal photos into columns left-to-right so the layout stays balanced and reads in order.
  const columns = Array.from({ length: Math.min(cols, items.length) }, (_, c) => items.map((g, i) => ({ g, i })).filter(({ i }) => i % cols === c))

  return (
    <section id="gallery" className="section gallery" aria-labelledby="gallery-title">
      <Mandala className="gallery__mandala" />
      <div className="container">
        <header className="section-head section-head--center">
          <Reveal>
            <p className="eyebrow eyebrow--center"><span className="eyebrow__line" /> The Portfolio <span className="eyebrow__line" /></p>
          </Reveal>
          <h2 id="gallery-title" className="section-title section-title--xl">
            <RevealText text="The Master" /> <RevealText text="Gallery" className="italic" delay={0.12} />
          </h2>
          <Reveal delay={0.15}>
            <p className="section-intro">
              Real work, real hands. Every photograph here is a design created by Trisha — tap any image to see it in full detail.
            </p>
          </Reveal>
        </header>

        <Reveal delay={0.1}>
          <div className="filters" role="group" aria-label="Filter the gallery by style">
            {ACTIVE_CATEGORIES.map((c) => {
              const count = c === 'all' ? GALLERY.length : GALLERY.filter((g) => g.categories.includes(c)).length
              return (
                <button key={c} className={`filter ${filter === c ? 'is-active' : ''}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
                  {filter === c && <m.span layoutId="filter-pill" className="filter__pill" transition={{ duration: 0.5, ease }} />}
                  <span className="filter__label">{CATEGORY_LABELS[c]}</span>
                  <sup>{count}</sup>
                </button>
              )
            })}
          </div>
        </Reveal>

        <p className="visually-hidden" aria-live="polite">
          Showing {items.length} {items.length === 1 ? 'design' : 'designs'} in {CATEGORY_LABELS[filter]}.
        </p>

        <AnimatePresence mode="wait">
          <m.div
            key={filter}
            className={`masonry masonry--${columns.length}`}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >
            {columns.map((col, c) => (
              <ul className="masonry__col" key={c}>
                {col.map(({ g, i }) => (
                  <m.li
                    key={g.slug}
                    className="masonry__item"
                    variants={{
                      hidden: { opacity: 0, y: 40 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
                    }}
                  >
                    <button className="tile" onClick={() => open(items, i)} aria-label={`View “${g.title}” full screen`}>
                      <Img slug={g.slug} alt={g.alt} fit="natural" sizes="(min-width: 1100px) 31vw, (min-width: 560px) 46vw, 92vw" />
                      <span className="tile__shade" aria-hidden="true" />
                      <span className="tile__zoom" aria-hidden="true"><Maximize2 size={16} strokeWidth={1.5} /></span>
                    </button>
                    <div className="tile__meta">
                      <span className="tile__num">No. {String(GALLERY.indexOf(g) + 1).padStart(2, '0')}</span>
                      <h3>{g.title}</h3>
                      {g.categories.length > 0 && (
                        <span className="tile__tags">{g.categories.map((cat) => CATEGORY_LABELS[cat]).join(' · ')}</span>
                      )}
                    </div>
                  </m.li>
                ))}
              </ul>
            ))}
          </m.div>
        </AnimatePresence>

        <Reveal className="gallery__cta">
          <p className="script">love a design?</p>
          <p>Share a favourite from the gallery and Trisha will tailor it to your occasion.</p>
          <Button href={whatsappLink('Hello Trisha! I loved the designs in your Mehendi by Trisha gallery and would like to enquire about booking. Please share your availability and pricing.')} external icon={<WhatsAppIcon size={18} />}>
            Enquire on WhatsApp
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
