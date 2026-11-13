import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m, type PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getImage, type GalleryItem } from '../data/gallery'
import { whatsappLink } from '../config/site'
import { WhatsAppIcon } from './BrandIcons'
import { ease } from './Reveal'

type Item = Pick<GalleryItem, 'slug' | 'title' | 'alt' | 'caption'>

interface Ctx {
  open: (items: Item[], index: number) => void
}
const LightboxContext = createContext<Ctx>({ open: () => {} })
export const useLightbox = () => useContext(LightboxContext)

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ items: Item[]; index: number } | null>(null)
  const [dir, setDir] = useState(0)
  const returnFocus = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const open = useCallback((items: Item[], index: number) => {
    returnFocus.current = document.activeElement as HTMLElement
    setDir(0)
    setState({ items, index })
  }, [])
  const close = useCallback(() => setState(null), [])
  const go = useCallback((step: number) => {
    setDir(step)
    setState((s) => (s ? { ...s, index: (s.index + step + s.items.length) % s.items.length } : s))
  }, [])

  const isOpen = state !== null
  useEffect(() => {
    if (!isOpen) {
      returnFocus.current?.focus?.()
      return
    }
    document.body.classList.add('no-scroll')
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Tab' && dialogRef.current) {
        // Keep keyboard focus inside the lightbox.
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [isOpen, close, go])

  // Preload neighbours so next / previous feels instant.
  useEffect(() => {
    if (!state) return
    for (const step of [1, -1]) {
      const it = state.items[(state.index + step + state.items.length) % state.items.length]
      const img = new Image()
      img.src = getImage(it.slug).large
    }
  }, [state])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1)
  }

  const item = state ? state.items[state.index] : null
  const img = item ? getImage(item.slug) : null

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {state && item && img && (
          <m.div
            ref={dialogRef}
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${item.title} — image ${state.index + 1} of ${state.items.length}`}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <div className="lightbox__top">
              <span className="lightbox__count">
                {String(state.index + 1).padStart(2, '0')} <span>/ {String(state.items.length).padStart(2, '0')}</span>
              </span>
              <button className="lightbox__btn" onClick={close} aria-label="Close (Esc)">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <div className="lightbox__stage" onClick={(e) => e.target === e.currentTarget && close()}>
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <m.img
                  key={item.slug}
                  className="lightbox__img"
                  src={img.large}
                  srcSet={img.srcSet}
                  sizes="(min-width: 900px) 70vw, 100vw"
                  alt={item.alt}
                  width={img.width}
                  height={img.height}
                  style={{ backgroundImage: `url(${img.lqip})` }}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: d * 60, scale: d === 0 ? 0.94 : 1 }),
                    center: { opacity: 1, x: 0, scale: 1 },
                    exit: (d: number) => ({ opacity: 0, x: d * -60 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, ease }}
                  drag={state.items.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={onDragEnd}
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {state.items.length > 1 && (
              <>
                <button className="lightbox__btn lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Previous image">
                  <ChevronLeft size={26} strokeWidth={1.3} />
                </button>
                <button className="lightbox__btn lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Next image">
                  <ChevronRight size={26} strokeWidth={1.3} />
                </button>
              </>
            )}

            <div className="lightbox__caption">
              <div>
                <h3>{item.title}</h3>
                {item.caption && <p>{item.caption}</p>}
              </div>
              <a
                className="lightbox__enquire"
                href={whatsappLink(
                  `Hello Trisha! I saw the "${item.title}" design on your Mehendi by Trisha website and would love something similar. Could you please share your availability and pricing?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon size={16} /> Enquire about this design
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LightboxContext.Provider>
  )
}
