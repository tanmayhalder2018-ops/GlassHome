import { useState } from 'react'
import { Plus } from 'lucide-react'
import { FAQS } from '../data/areas'
import { Reveal, RevealText } from './Reveal'

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    inLanguage: f.lang === 'bn' ? 'bn' : 'en',
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

/** Accessible accordion of booking & travel questions (English + Bengali). */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="container faq__grid">
        <header className="faq__head">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> FAQ · প্রশ্ন ও উত্তর</p>
          </Reveal>
          <h2 id="faq-title" className="section-title">
            <RevealText text="Good to" /> <RevealText text="know" className="italic" delay={0.1} />
          </h2>
          <Reveal delay={0.15}>
            <p className="section-intro">
              Questions about bookings in Maslandapur, Barasat, Madhyamgram, Kolkata and across North 24 Parganas.
            </p>
          </Reveal>
        </header>

        <div className="faq__list">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={Math.min(i, 4) * 0.05} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <h3 lang={f.lang ?? 'en'}>
                  <button
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{f.q}</span>
                    <Plus className="faq-item__icon" size={20} strokeWidth={1.4} aria-hidden="true" />
                  </button>
                </h3>
                {/* Always in the page (readable by search engines); collapsed with CSS when closed. */}
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  className="faq-item__answer"
                  lang={f.lang ?? 'en'}
                  inert={!isOpen}
                >
                  <div>
                    <p>{f.a}</p>
                    {f.link && <a href={f.link.href}>{f.link.label} →</a>}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
