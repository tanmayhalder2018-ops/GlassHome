import { MapPin } from 'lucide-react'
import { Reveal, RevealText } from './Reveal'
import { Sprig, LeafMark, FlowerMark } from './Botanical'
import { BUSINESS } from '../config/site'
import { Portrait } from './Portrait'

/**
 * ARTIST INTRODUCTION — edit the text below freely.
 * (Title and location come from src/config/site.ts → BUSINESS.)
 */
const VALUES = [
  { icon: 'flower', title: 'Designed for you', text: 'Shaped around your occasion, outfit and style.' },
  { icon: 'leaf', title: 'Patient detail', text: 'Fine lines, careful fills, balanced space.' },
  { icon: 'flower', title: 'Every occasion', text: 'Bridal, engagement, festive or party.' },
]

export function ArtistIntroduction() {
  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__visual">
          <Reveal className="about__portrait">
            <Portrait focus="50% 24%" />
          </Reveal>
          <Reveal className="artist-card" delay={0.2}>
            <p className="artist-card__name">{BUSINESS.artist}</p>
            <p className="artist-card__title">{BUSINESS.title}</p>
            <p className="artist-card__place"><MapPin size={12} strokeWidth={1.6} /> {BUSINESS.locality}, {BUSINESS.region}</p>
          </Reveal>
          <Sprig className="about__sprig" />
        </div>

        <div className="about__copy">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> {BUSINESS.title}</p>
          </Reveal>
          <h2 id="about-title" className="section-title">
            <RevealText text="Meet" /> <RevealText text="Trisha" className="italic" delay={0.12} />
          </h2>
          <Reveal delay={0.1}>
            <p className="about__lead">
              Welcome to Mehendi by Trisha, where <mark className="hl">creativity meets tradition</mark>.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="about__text">
              Specialising in <mark className="hl">bridal and custom mehendi</mark> artistry, Trisha creates beautiful
              henna designs inspired by elegance, intricate details, and individual preferences. Every design is a unique
              expression of art, created to make your special moments even more memorable.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="about__place">
              <MapPin size={15} strokeWidth={1.5} /> Based in <strong>{BUSINESS.locality}</strong> · travels to{' '}
              <a href="#areas">North 24 Parganas, Nadia &amp; Kolkata</a>
            </p>
          </Reveal>

          <ul className="about__values">
            {VALUES.map((v, i) => (
              <Reveal as="li" key={v.title} delay={0.1 + i * 0.08}>
                {v.icon === 'leaf' ? <LeafMark size={20} /> : <FlowerMark size={20} />}
                <div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
