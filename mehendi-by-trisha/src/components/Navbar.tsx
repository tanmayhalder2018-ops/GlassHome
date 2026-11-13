import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS, whatsappLink, BUSINESS } from '../config/site'
import { WhatsAppIcon } from './BrandIcons'
import { FlowerMark } from './Botanical'
import { ease } from './Reveal'

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`wordmark ${light ? 'wordmark--light' : ''}`}>
      <span className="wordmark__main">Mehendi</span>
      <span className="wordmark__by">by Trisha</span>
    </span>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently in view.
  useEffect(() => {
    const ids = [...NAV_LINKS.map((l) => l.id), 'booking']
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id === 'booking' ? 'contact' : e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open)
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <div className="nav__inner container">
        <a href="#home" className="nav__brand" aria-label={`${BUSINESS.name} — back to top`} onClick={() => setOpen(false)}>
          <Wordmark />
        </a>

        <nav className="nav__links" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} className={active === l.id ? 'is-active' : ''} aria-current={active === l.id ? 'true' : undefined}>
              {l.label}
            </a>
          ))}
        </nav>

        <a href="#booking" className="nav__cta btn btn--solid btn--sm">
          <span>Book Now</span>
        </a>

        <button
          className="nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease }}
          >
            <nav aria-label="Mobile">
              {NAV_LINKS.map((l, i) => (
                <m.a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  className={active === l.id ? 'is-active' : ''}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease }}
                >
                  <span className="mobile-menu__num">0{i + 1}</span>
                  {l.label}
                </m.a>
              ))}
            </nav>
            <m.div className="mobile-menu__foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <a href="#booking" className="btn btn--solid" onClick={() => setOpen(false)}>
                <span>Book Your Date</span>
              </a>
              <a href={whatsappLink()} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={18} />
                <span>WhatsApp Trisha</span>
              </a>
              <p className="mobile-menu__place">
                <FlowerMark size={14} /> {BUSINESS.locality}, {BUSINESS.region}
              </p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  )
}
