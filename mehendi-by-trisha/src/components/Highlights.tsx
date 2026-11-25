import { m } from 'framer-motion'
import { Sparkles, Home, MapPin, MessageCircle } from 'lucide-react'
import { ease } from './Reveal'

/**
 * At-a-glance facts right under the hero, so visitors get the essentials
 * without scrolling. Only verified facts — no invented numbers.
 */
const ITEMS = [
  { icon: <Sparkles size={20} strokeWidth={1.5} />, title: 'Bridal & Custom', text: 'Peacocks, mandalas, names & initials', href: '#services' },
  { icon: <Home size={20} strokeWidth={1.5} />, title: 'Home & Venue Visits', text: 'Trisha comes to you', href: '#areas' },
  { icon: <MapPin size={20} strokeWidth={1.5} />, title: 'Maslandapur Based', text: 'N. 24 Parganas · Nadia · Kolkata', href: '#areas' },
  { icon: <MessageCircle size={20} strokeWidth={1.5} />, title: 'Quick WhatsApp Booking', text: 'Pricing shared on enquiry', href: '#booking' },
]

export function Highlights() {
  return (
    <section className="highlights" aria-label="Highlights">
      <ul className="container highlights__grid">
        {ITEMS.map((it, i) => (
          <m.li
            key={it.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease, delay: i * 0.07 }}
          >
            <a href={it.href} className="highlight">
              <span className="highlight__icon" aria-hidden="true">{it.icon}</span>
              <span className="highlight__body">
                <strong>{it.title}</strong>
                <span>{it.text}</span>
              </span>
            </a>
          </m.li>
        ))}
      </ul>
    </section>
  )
}
