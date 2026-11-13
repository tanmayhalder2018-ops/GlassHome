import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { Img } from './Img'
import { Reveal, RevealText } from './Reveal'
import { Sprig, LeafMark, FlowerMark } from './Botanical'
import { Button } from './Button'
import { CONES_SLUG } from '../data/gallery'
import { BUSINESS } from '../config/site'
import { Portrait } from './Portrait'
import { MapPin } from 'lucide-react'

/**
 * ARTIST INTRODUCTION — edit the text below freely.
 * (Title and location come from src/config/site.ts → BUSINESS.)
 */
const HEADING = { first: 'Meet', second: 'Trisha' }
const BIO = [
  'Welcome to Mehendi by Trisha, where creativity meets tradition.',
  'Specialising in bridal and custom mehendi artistry, Trisha creates beautiful henna designs inspired by elegance, intricate details, and individual preferences. Every design is a unique expression of art, created to make your special moments even more memorable.',
]

const VALUES = [
  { title: 'Designed for you', text: 'Each design is shaped around your occasion, outfit and personal style.' },
  { title: 'Patient detail', text: 'Fine lines, careful fills and balanced space — never rushed.' },
  { title: 'Every occasion', text: 'Bridal, engagement, festive, party or a simple everyday motif.' },
]

export function ArtistIntroduction() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const conesY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['18%', '-18%'])

  return (
    <section id="about" ref={ref} className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__visual">
          <Reveal className="about__portrait">
            <Portrait focus="50% 24%" />
          </Reveal>
          <Reveal className="artist-card" delay={0.25}>
            <p className="artist-card__name">{BUSINESS.artist}</p>
            <p className="artist-card__title">{BUSINESS.title}</p>
            <p className="artist-card__place"><MapPin size={13} strokeWidth={1.6} /> {BUSINESS.locality}, {BUSINESS.region}</p>
          </Reveal>
          <m.div className="about__cones" style={{ y: conesY }}>
            <Img slug={CONES_SLUG} alt="A fan of henna cones ready for a mehendi session" sizes="(min-width: 960px) 16vw, 38vw" focus="center 60%" />
          </m.div>
          <Sprig className="about__sprig" />
                  </div>

        <div className="about__copy">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> {BUSINESS.title}</p>
          </Reveal>
          <h2 id="about-title" className="section-title">
            <RevealText text={HEADING.first} /> <RevealText text={HEADING.second} className="italic" delay={0.15} />
          </h2>
          {BIO.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              <p className={i === 0 ? 'about__lead' : 'about__text'}>{p}</p>
            </Reveal>
          ))}

          <Reveal delay={0.3}>
            <p className="about__place"><MapPin size={15} strokeWidth={1.5} /> Based in {BUSINESS.locality}, {BUSINESS.region}</p>
            <p className="about__areas">
              Also taking bookings in <a href="#areas">Barasat, Madhyamgram, Kolkata and across North 24 Parganas</a>.
            </p>
          </Reveal>

          <ul className="about__values">
            {VALUES.map((v, i) => (
              <Reveal as="li" key={v.title} delay={0.1 + i * 0.1}>
                {i % 2 === 0 ? <FlowerMark size={22} /> : <LeafMark size={22} />}
                <div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.2}>
            <Button href="#gallery" variant="ghost">See the portfolio</Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
