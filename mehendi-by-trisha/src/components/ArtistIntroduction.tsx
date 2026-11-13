import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { Img } from './Img'
import { Reveal, RevealText } from './Reveal'
import { Sprig, LeafMark, FlowerMark } from './Botanical'
import { Button } from './Button'
import { PORTRAIT_SLUG, CONES_SLUG } from '../data/gallery'

/**
 * ARTIST INTRODUCTION
 * The biography text below is a warm starting point written from what is
 * known (Trisha, a mehendi artist in Maslandapur). Edit freely — add her
 * own story, years of practice or anything she'd like clients to know.
 */
const BIO = [
  "Hi, I'm Trisha — a mehendi artist based in Maslandapur, West Bengal.",
  'For me, mehendi is more than decoration. It is a quiet, unhurried art: a cone of henna, a steady hand and a design that grows line by line until it tells a story of its own. Every bride, every celebration and every pair of hands is different, so I love shaping each design around the person wearing it.',
  'Whether you dream of a full bridal design with peacocks, mandalas and hidden initials, flowing Arabic florals, or a single delicate motif, I would love to create something that feels truly yours.',
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
            <Img slug={PORTRAIT_SLUG} alt="Portrait of Trisha, the mehendi artist behind Mehendi by Trisha" sizes="(min-width: 960px) 34vw, 78vw" focus="center 30%" />
          </Reveal>
          <m.div className="about__cones" style={{ y: conesY }}>
            <Img slug={CONES_SLUG} alt="A fan of henna cones ready for a mehendi session" sizes="(min-width: 960px) 16vw, 38vw" focus="center 60%" />
          </m.div>
          <Sprig className="about__sprig" />
          <p className="about__signature script" aria-hidden="true">Trisha</p>
        </div>

        <div className="about__copy">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> About</p>
          </Reveal>
          <h2 id="about-title" className="section-title">
            <RevealText text="The Artist" /> <RevealText text="Behind the Art" className="italic" delay={0.15} />
          </h2>
          {BIO.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              <p className={i === 0 ? 'about__lead' : 'about__text'}>{p}</p>
            </Reveal>
          ))}

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
