import type { ReactNode } from 'react'
import { MapPin, ArrowUpRight } from 'lucide-react'
import { m } from 'framer-motion'
import { BUSINESS, SOCIAL, MAPS_URL, whatsappLink, isWhatsAppConfigured, WHATSAPP_NUMBER } from '../config/site'
import { GALLERY } from '../data/gallery'
import { Reveal, RevealText, ease } from './Reveal'
import { Img } from './Img'
import { useLightbox } from './Lightbox'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from './BrandIcons'

function prettyNumber(n: string) {
  return `+91 ${n.slice(2, 7)} ${n.slice(7)}`
}

/** Portfolio photos shown in the social strip (slugs from gallery.ts). */
const FEED = ['lotus-mandala-palm', 'bridal-peacock-jhumka-palm', 'minimal-lotus-back-hand', 'floral-trail-garden-palm', 'arabic-floral-shaded-palm', 'bridal-initials-back-hands']

/** "Connect" — contact options and the social photo strip in one compact section. */
export function Contact() {
  const { open } = useLightbox()
  const feed = FEED.map((s) => GALLERY.find((g) => g.slug === s)).filter((g): g is (typeof GALLERY)[number] => !!g)
  const handle = SOCIAL.instagramHandle ? `@${SOCIAL.instagramHandle.replace(/^@/, '')}` : 'Instagram'

  const cards = [
    {
      icon: <WhatsAppIcon size={20} />,
      label: 'WhatsApp',
      value: isWhatsAppConfigured ? prettyNumber(WHATSAPP_NUMBER) : 'Message Trisha',
      href: whatsappLink(),
      primary: true,
    },
    SOCIAL.instagram && { icon: <InstagramIcon size={20} />, label: 'Instagram', value: handle, href: SOCIAL.instagram },
    SOCIAL.facebook && { icon: <FacebookIcon size={20} />, label: 'Facebook', value: 'Mehendi by Trisha', href: SOCIAL.facebook },
    { icon: <MapPin size={20} strokeWidth={1.5} />, label: 'Based in', value: `${BUSINESS.locality}, ${BUSINESS.region}`, href: MAPS_URL },
  ].filter(Boolean) as { icon: ReactNode; label: string; value: string; href: string; primary?: boolean }[]

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <header className="section-head section-head--split">
          <div>
            <Reveal>
              <p className="eyebrow"><span className="eyebrow__line" /> Connect</p>
            </Reveal>
            <h2 id="contact-title" className="section-title">
              <RevealText text="Follow" /> <RevealText text="the Art" className="italic" delay={0.1} />
            </h2>
          </div>
          <Reveal delay={0.1} className="section-head__aside">
            <p>
              <strong>{BUSINESS.name}</strong> · {BUSINESS.title}
            </p>
            <address className="contact__address">
              {BUSINESS.locality}, {BUSINESS.region}, {BUSINESS.country}
            </address>
            <p>
              Serving <a href="#areas">North 24 Parganas, Nadia &amp; Kolkata</a>
            </p>
          </Reveal>
        </header>

        <ul className={`contact__cards contact__cards--${cards.length}`}>
          {cards.map((c, i) => (
            <Reveal as="li" key={c.label} delay={i * 0.06}>
              <a className={`contact-card ${c.primary ? 'contact-card--primary' : ''}`} href={c.href} target="_blank" rel="noopener noreferrer">
                <span className="contact-card__icon">{c.icon}</span>
                <span className="contact-card__text">
                  <span className="contact-card__label">{c.label}</span>
                  <span className="contact-card__value">{c.value}</span>
                </span>
                <ArrowUpRight className="contact-card__arrow" size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </Reveal>
          ))}
        </ul>

        <ul className="insta__grid" aria-label="Recent work">
          {feed.map((g, i) => (
            <m.li
              key={g.slug}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease, delay: i * 0.05 }}
            >
              <button className="insta__tile" onClick={() => open(feed, i)} aria-label={`View “${g.title}” full screen`}>
                <Img slug={g.slug} alt={g.alt} sizes="(min-width: 900px) 16vw, 33vw" focus={g.focus} />
                <span className="insta__hover" aria-hidden="true"><InstagramIcon size={22} /></span>
              </button>
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
