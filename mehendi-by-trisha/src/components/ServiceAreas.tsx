import { m } from 'framer-motion'
import { MapPin, Home } from 'lucide-react'
import { DISTRICTS } from '../data/areas'
import { whatsappLink } from '../config/site'
import { Reveal, RevealText, ease } from './Reveal'

function areaEnquiry(area: string) {
  return whatsappLink(
    `Hello Trisha! I found Mehendi by Trisha online and I'm looking for a mehendi artist in ${area}. Could you please share your availability and pricing?`,
  )
}

/** Where Trisha works: Maslandapur (home base) plus the towns she travels to, grouped by district. */
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
          <Reveal delay={0.12}>
            <p className="section-intro">
              Based in <mark className="hl">Maslandapur</mark>, Trisha travels to your{' '}
              <mark className="hl">home or venue</mark> for <a href="#services">bridal and custom mehendi</a> across North
              24 Parganas, Nadia and Kolkata. Tap a town to check your date on WhatsApp.
            </p>
            <p className="areas__bn" lang="bn">
              মছলন্দপুর থেকে বারাসাত, বনগাঁ, রানাঘাট, কল্যাণী, শান্তিপুর, কলকাতা — আপনার বিয়ে ও অনুষ্ঠানে মেহেন্দি।
            </p>
          </Reveal>
        </div>

        <div className="areas__districts">
          {DISTRICTS.map((d, i) => (
            <m.div
              key={d.name}
              className="district"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.7, ease, delay: i * 0.08 }}
            >
              <h3 className="district__name">
                {d.name} <span lang="bn">{d.bn}</span>
              </h3>
              <ul className="district__areas">
                {d.areas.map((a) => (
                  <li key={a.name}>
                    <a
                      className={`area-chip ${a.primary ? 'area-chip--primary' : ''}`}
                      href={areaEnquiry(a.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enquire on WhatsApp about mehendi in ${a.name}${a.primary ? ' (home base)' : ''}`}
                    >
                      {a.primary ? <Home size={14} strokeWidth={1.8} aria-hidden="true" /> : <MapPin size={14} strokeWidth={1.6} aria-hidden="true" />}
                      <span>{a.name}</span>
                      <span className="area-chip__bn" lang="bn">{a.bn}</span>
                      {a.primary && <em className="area-chip__badge">Home base</em>}
                    </a>
                  </li>
                ))}
              </ul>
              {d.note && <p className="district__note">{d.note}</p>}
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
