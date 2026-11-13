import { m } from 'framer-motion'
import { GALLERY } from '../data/gallery'
import { SOCIAL, whatsappLink } from '../config/site'
import { Img } from './Img'
import { Reveal, RevealText, ease } from './Reveal'
import { useLightbox } from './Lightbox'
import { Button } from './Button'
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from './BrandIcons'
import { LeafMark } from './Botanical'

/** Which portfolio photos appear in the Instagram-style grid (slugs from gallery.ts). */
const FEED = [
  'lotus-mandala-palm',
  'bridal-peacock-jhumka-palm',
  'minimal-lotus-back-hand',
  'floral-trail-garden-palm',
  'arabic-floral-shaded-palm',
  'bridal-initials-back-hands',
]

export function InstagramSection() {
  const { open } = useLightbox()
  const items = FEED.map((s) => GALLERY.find((g) => g.slug === s)).filter((g): g is (typeof GALLERY)[number] => !!g)
  const handle = SOCIAL.instagramHandle ? `@${SOCIAL.instagramHandle.replace(/^@/, '')}` : null

  return (
    <section className="section insta" aria-labelledby="insta-title">
      <div className="container">
        <header className="section-head section-head--split">
          <div>
            <Reveal>
              <p className="eyebrow"><span className="eyebrow__line" /> {handle ?? 'Social'}</p>
            </Reveal>
            <h2 id="insta-title" className="section-title">
              <RevealText text="Follow" /> <RevealText text="the Art" className="italic" delay={0.1} />
            </h2>
          </div>
          <Reveal delay={0.15} className="section-head__aside insta__links">
            {SOCIAL.instagram || SOCIAL.facebook ? (
              <>
                <p>New designs, bridal sessions and festive looks — follow along.</p>
                <div className="insta__buttons">
                  {SOCIAL.instagram && (
                    <Button href={SOCIAL.instagram} external icon={<InstagramIcon size={18} />}>
                      Instagram
                    </Button>
                  )}
                  {SOCIAL.facebook && (
                    <Button href={SOCIAL.facebook} external variant="outline" icon={<FacebookIcon size={18} />}>
                      Facebook
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p>Want to see more of Trisha's recent work? Ask for more photos on WhatsApp.</p>
                <div className="insta__buttons">
                  <Button
                    href={whatsappLink('Hello Trisha! I visited your Mehendi by Trisha website — could you share more photos of your recent mehendi designs?')}
                    external
                    icon={<WhatsAppIcon size={18} />}
                  >
                    Ask for more designs
                  </Button>
                </div>
              </>
            )}
          </Reveal>
        </header>

        <ul className="insta__grid">
          {items.map((g, i) => (
            <m.li
              key={g.slug}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.8, ease, delay: i * 0.07 }}
            >
              <button className="insta__tile" onClick={() => open(items, i)} aria-label={`View “${g.title}” full screen`}>
                <Img slug={g.slug} alt={g.alt} sizes="(min-width: 900px) 16vw, 33vw" focus={g.focus} />
                <span className="insta__hover" aria-hidden="true">
                  <LeafMark size={26} />
                </span>
              </button>
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
