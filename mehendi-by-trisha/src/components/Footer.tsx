import { NAV_LINKS, SOCIAL, BUSINESS, whatsappLink } from '../config/site'
import { Wordmark } from './Navbar'
import { Vine, FlowerMark } from './Botanical'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from './BrandIcons'

const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="footer">
      <Vine className="footer__vine" />
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Wordmark light />
            <p className="footer__tagline">{BUSINESS.tagline}</p>
            <p className="footer__place">
              <FlowerMark size={14} /> {BUSINESS.locality}, {BUSINESS.region}, {BUSINESS.country}
            </p>
          </div>

          <nav className="footer__nav" aria-label="Footer">
            <p className="footer__heading">Explore</p>
            {NAV_LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`}>{l.label}</a>
            ))}
            <a href="#booking">Book Now</a>
          </nav>

          <div className="footer__social">
            <p className="footer__heading">Connect</p>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={18} /> WhatsApp booking
            </a>
            {SOCIAL.instagram && (
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
                <InstagramIcon size={18} /> Instagram
              </a>
            )}
            {SOCIAL.facebook && (
              <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer">
                <FacebookIcon size={18} /> Facebook
              </a>
            )}
          </div>
        </div>

        <p className="footer__giant" aria-hidden="true">Mehendi</p>

        <div className="footer__bottom">
          <p>© {year} {BUSINESS.name}. All designs and photographs © {BUSINESS.artist}.</p>
          <a href="#home">Back to top ↑</a>
        </div>
      </div>
    </footer>
  )
}
