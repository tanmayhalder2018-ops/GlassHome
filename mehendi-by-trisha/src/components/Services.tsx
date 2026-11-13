import { m } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { SERVICES } from '../data/services'
import { serviceEnquiry } from '../config/site'
import { Img } from './Img'
import { Reveal, RevealText, ease } from './Reveal'
import { Vine } from './Botanical'
import { WhatsAppIcon } from './BrandIcons'

export function Services() {
  return (
    <section id="services" className="section services" aria-labelledby="services-title">
      <div className="container">
        <header className="section-head section-head--split">
          <div>
            <Reveal>
              <p className="eyebrow"><span className="eyebrow__line" /> Signature Services</p>
            </Reveal>
            <h2 id="services-title" className="section-title">
              <RevealText text="Designs for" /> <RevealText text="every moment" className="italic" delay={0.12} />
            </h2>
          </div>
          <Reveal delay={0.15} className="section-head__aside">
            <p>
              From the bride's first fitting to a quick festive motif for guests — every booking is planned around your
              occasion, your outfit and the look you love, in Maslandapur and across{' '}
              <a href="#areas">Barasat, Madhyamgram and Kolkata</a>.
            </p>
            <Vine className="services__vine" />
          </Reveal>
        </header>

        <ol className="services__grid">
          {SERVICES.map((s, i) => (
            <m.li
              key={s.title}
              className="service-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.9, ease, delay: (i % 4) * 0.08 }}
            >
              <a
                className="service-card__link"
                href={serviceEnquiry(s.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Enquire about ${s.title} on WhatsApp`}
              >
                <div className="service-card__media">
                  <Img slug={s.image} alt="" sizes="(min-width: 1100px) 22vw, (min-width: 640px) 44vw, 40vw" focus="center 40%" />
                  <span className="service-card__num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="service-card__body">
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <div className="service-card__foot">
                    <span className="service-card__price">Enquire for Pricing</span>
                    <span className="service-card__cta">
                      <WhatsAppIcon size={15} />
                      <ArrowUpRight size={18} strokeWidth={1.5} className="service-card__arrow" />
                    </span>
                  </div>
                </div>
              </a>
            </m.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
