import { MapPin, ArrowUpRight } from 'lucide-react'
import { BUSINESS, SOCIAL, MAPS_URL, whatsappLink, isWhatsAppConfigured, WHATSAPP_NUMBER } from '../config/site'
import { Reveal, RevealText } from './Reveal'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from './BrandIcons'
import { Vine } from './Botanical'

function prettyNumber(n: string) {
  return `+91 ${n.slice(2, 7)} ${n.slice(7)}`
}

export function Contact() {
  const cards = [
    {
      icon: <WhatsAppIcon size={22} />,
      label: 'WhatsApp',
      value: isWhatsAppConfigured ? prettyNumber(WHATSAPP_NUMBER) : 'Message Trisha',
      href: whatsappLink(),
      note: 'The quickest way to check dates & pricing',
    },
    SOCIAL.instagram && {
      icon: <InstagramIcon size={22} />,
      label: 'Instagram',
      value: SOCIAL.instagramHandle ? `@${SOCIAL.instagramHandle.replace(/^@/, '')}` : 'Follow on Instagram',
      href: SOCIAL.instagram,
      note: 'Latest designs and sessions',
    },
    SOCIAL.facebook && {
      icon: <FacebookIcon size={22} />,
      label: 'Facebook',
      value: 'Mehendi by Trisha',
      href: SOCIAL.facebook,
      note: 'Updates and photos',
    },
    {
      icon: <MapPin size={22} strokeWidth={1.5} />,
      label: 'Location',
      value: `${BUSINESS.locality}, ${BUSINESS.region}`,
      href: MAPS_URL,
      note: 'View on Google Maps',
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href: string; note: string }[]

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <header className="section-head section-head--center">
          <Reveal>
            <p className="eyebrow eyebrow--center"><span className="eyebrow__line" /> Get in Touch <span className="eyebrow__line" /></p>
          </Reveal>
          <h2 id="contact-title" className="section-title">
            <RevealText text="Mehendi" /> <RevealText text="by Trisha" className="italic" delay={0.1} />
          </h2>
          <Reveal delay={0.1}>
            <p className="contact__title">{BUSINESS.title}</p>
            <address className="contact__address">
              {BUSINESS.locality}, {BUSINESS.region}, {BUSINESS.country}
            </address>
            <p className="contact__serving">
              Serving <a href="#areas">Barasat · Madhyamgram · Kolkata · North 24 Parganas</a>
            </p>
          </Reveal>
          <Vine className="contact__vine" />
        </header>

        <ul className={`contact__cards contact__cards--${cards.length}`}>
          {cards.map((c, i) => (
            <Reveal as="li" key={c.label} delay={i * 0.08}>
              <a className="contact-card" href={c.href} target="_blank" rel="noopener noreferrer">
                <span className="contact-card__icon">{c.icon}</span>
                <span className="contact-card__label">{c.label}</span>
                <span className="contact-card__value">{c.value}</span>
                <span className="contact-card__note">{c.note}</span>
                <ArrowUpRight className="contact-card__arrow" size={20} strokeWidth={1.4} aria-hidden="true" />
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
