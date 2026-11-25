import { Img } from './Img'
import { Reveal, RevealText } from './Reveal'
import { FlowerMark, FloatingLeaves } from './Botanical'

const DETAILS = [
  { label: 'Lines', text: 'Steady, fine linework from wrist to fingertip.' },
  { label: 'Motifs', text: 'Peacocks, lotuses, mandalas, jhumkas and florals.' },
  { label: 'Balance', text: 'Bold fills and open skin so the whole hand reads beautifully.' },
]

/** Compact brand band: one image, the headline and three craft points. */
export function BrandStory() {
  return (
    <section className="story" aria-labelledby="story-title">
      <FloatingLeaves count={5} className="story__leaves" />
      <div className="container story__grid">
        <Reveal className="story__media">
          <Img slug="intricate-full-palm" alt="Close view of intricate palm mehendi with roses, netting and beaded arcs" sizes="(min-width: 960px) 30vw, 40vw" focus="center 45%" />
        </Reveal>

        <div className="story__copy">
          <Reveal>
            <p className="eyebrow eyebrow--light"><FlowerMark size={15} /> The Craft</p>
          </Reveal>
          <h2 id="story-title" className="story__title">
            <RevealText text="Every Detail" /> <RevealText text="Tells a Story" className="italic" delay={0.12} />
          </h2>
          <Reveal delay={0.12}>
            <p className="story__text">
              From delicate floral patterns to intricate bridal designs, every creation is crafted with{' '}
              <mark className="hl">patience, passion, and artistic detail</mark>.
            </p>
          </Reveal>
        </div>

        <ol className="story__details">
          {DETAILS.map((d, i) => (
            <Reveal as="li" key={d.label} delay={0.08 * i}>
              <span className="story__num">0{i + 1}</span>
              <div>
                <h3>{d.label}</h3>
                <p>{d.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
