import { useRef } from 'react'
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Img } from './Img'
import { Reveal, RevealText } from './Reveal'
import { Sprig, Vine, FlowerMark, FloatingLeaves } from './Botanical'

const DETAILS = [
  { label: 'Lines', text: 'Steady, fine linework that stays crisp from wrist to fingertip.' },
  { label: 'Motifs', text: 'Peacocks, lotuses, mandalas, jhumkas and florals — each with meaning.' },
  { label: 'Balance', text: 'Bold fills and open skin, arranged so the whole hand reads beautifully.' },
]

export function BrandStory() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1.18, 1])
  const wordX = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['8%', '-14%'])

  return (
    <section ref={ref} className="story" aria-labelledby="story-title">
      <FloatingLeaves count={6} className="story__leaves" />
      <m.p className="story__bigword" style={{ x: wordX }} aria-hidden="true">
        details
      </m.p>

      <div className="container story__grid">
        <div className="story__media">
          <div className="story__frame">
            <m.div className="story__img" style={{ scale }}>
              <Img slug="intricate-full-palm" alt="Close view of intricate palm mehendi with roses, netting and beaded arcs" sizes="(min-width: 960px) 42vw, 90vw" focus="center 45%" />
            </m.div>
          </div>
          <span className="story__frame-line" aria-hidden="true" />
          <Sprig className="story__sprig" />
        </div>

        <div className="story__copy">
          <Reveal>
            <p className="eyebrow eyebrow--light"><FlowerMark size={16} /> The Craft</p>
          </Reveal>
          <h2 id="story-title" className="story__title">
            <RevealText text="Every Detail" /> <br />
            <RevealText text="Tells a Story" className="italic" delay={0.15} />
          </h2>
          <Reveal delay={0.2}>
            <p className="story__text">
              From delicate floral patterns to intricate bridal designs, every creation is crafted with patience, passion, and
              artistic detail.
            </p>
          </Reveal>
          <Vine className="story__vine" delay={0.3} />
          <ol className="story__details">
            {DETAILS.map((d, i) => (
              <Reveal as="li" key={d.label} delay={0.1 * i}>
                <span className="story__num">0{i + 1}</span>
                <div>
                  <h3>{d.label}</h3>
                  <p>{d.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
