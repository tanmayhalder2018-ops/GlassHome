import { ArrowUpRight, MoveRight } from 'lucide-react'
import { SERVICES } from '../data/services'
import { serviceEnquiry } from '../config/site'
import { Img } from './Img'
import { Reveal, RevealText } from './Reveal'
import { WhatsAppIcon } from './BrandIcons'

/** Phones: one swipeable row. Larger screens: a compact 4-column grid. */
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
          <Reveal delay={0.12} className="section-head__aside">
            <p>
              Every booking is planned around your occasion, outfit and style —{' '}
              <mark className="hl">Enquire for Pricing</mark> on WhatsApp.
            </p>
            <p className="services__swipe" aria-hidden="true">
              Swipe to see all 8 <MoveRight size={16} strokeWidth={1.5} />
            </p>
          </Reveal>
        </header>

        <Reveal y={20}>
          <ol className="services__track" aria-label="Mehendi services">
            {SERVICES.map((s, i) => (
              <li key={s.title} className="service-card">
                <a
                  className="service-card__link"
                  href={serviceEnquiry(s.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Enquire about ${s.title} on WhatsApp`}
                >
                  <div className="service-card__media">
                    <Img slug={s.image} alt="" sizes="(min-width: 1100px) 22vw, (min-width: 640px) 30vw, 70vw" focus="center 40%" />
                    <span className="service-card__num">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="service-card__body">
                    <h3>{s.title}</h3>
                    <p>{s.description}</p>
                    <div className="service-card__foot">
                      <span className="service-card__price">Enquire for Pricing</span>
                      <span className="service-card__cta">
                        <WhatsAppIcon size={15} />
                        <ArrowUpRight size={16} strokeWidth={1.6} className="service-card__arrow" />
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
