import { m } from 'framer-motion'
import { MapPin, ArrowUpRight } from 'lucide-react'
import { AREAS } from '../data/areas'
import { whatsappLink } from '../config/site'
import { Reveal, RevealText, ease } from './Reveal'
import { Vine } from './Botanical'

function areaEnquiry(area: string) {
  return whatsappLink(
    `Hello Trisha! I found Mehendi by Trisha online and I'm looking for a mehendi artist in ${area}. Could you please share your availability and pricing?`,
  )
}

/** Where Trisha works: Maslandapur (home base) plus the areas she travels to. */
export function ServiceAreas() {
  return (
    <section id="areas" className="section areas" aria-labelledby="areas-title">
      <div className="container areas__grid">
        <div className="areas__intro">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> Service Areas</p>
          </Reveal>
          <h2 id="areas-title" className="section-title">
            <RevealText text="From Maslandapur," /> <RevealText text="to your doorstep" className="italic" delay={0.12} />
          </h2>
          <Reveal delay={0.15}>
            <p className="section-intro">
              Mehendi by Trisha is based in <strong>Maslandapur</strong>, and Trisha travels to your home or venue for{' '}
              <a href="#services">bridal and custom mehendi</a> across <strong>Barasat</strong>,{' '}
              <strong>Madhyamgram</strong>, <strong>Kolkata</strong> and the wider <strong>North 24 Parganas</strong>{' '}
              district of West Bengal.
            </p>
            <p className="areas__bn" lang="bn">
              মছলন্দপুর থেকে বারাসাত, মধ্যমগ্রাম, কলকাতা — আপনার বিয়ে ও প্রতিটি অনুষ্ঠানে সুন্দর মেহেন্দি।
            </p>
            <p className="areas__links">
              <a href="#gallery">See the bridal portfolio</a>
              <span aria-hidden="true">·</span>
              <a href="#faq">Travel &amp; booking FAQs</a>
            </p>
          </Reveal>
          <Vine className="areas__vine" />
        </div>

        <ul className="areas__list">
          {AREAS.map((a, i) => (
            <m.li
              key={a.name}
              className={`area ${a.primary ? 'area--primary' : ''}`}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.8, ease, delay: i * 0.07 }}
            >
              <span className="area__pin" aria-hidden="true"><MapPin size={18} strokeWidth={1.5} /></span>
              <div className="area__body">
                <h3>
                  {a.name} <span lang="bn">{a.bn}</span>
                  {a.primary && <em className="area__badge">Home base</em>}
                </h3>
                <p>{a.note}</p>
              </div>
              <a
                className="area__cta"
                href={areaEnquiry(a.name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Enquire on WhatsApp about mehendi in ${a.name}`}
              >
                <ArrowUpRight size={18} strokeWidth={1.5} />
              </a>
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
