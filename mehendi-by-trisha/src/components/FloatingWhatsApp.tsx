import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { whatsappLink } from '../config/site'
import { WhatsAppIcon } from './BrandIcons'

/** Floating WhatsApp button — appears after the visitor scrolls past the hero. */
export function FloatingWhatsApp() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <m.a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="fab"
          aria-label="Chat with Trisha on WhatsApp"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          <span className="fab__ring" aria-hidden="true" />
          <WhatsAppIcon size={26} />
          <span className="fab__label">Book on WhatsApp</span>
        </m.a>
      )}
    </AnimatePresence>
  )
}
