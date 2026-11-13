import { FlowerMark } from './Botanical'

const WORDS = ['Bridal', 'Arabic', 'Traditional', 'Engagement', 'Minimal', 'Party & Guest', 'Festival']

/** Slow, endless ribbon of service names between hero and about. */
export function Marquee() {
  const row = WORDS.flatMap((w) => [w, '•'])
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {[0, 1].map((k) => (
          <div className="marquee__group" key={k}>
            {row.map((w, i) =>
              w === '•' ? <FlowerMark key={i} size={18} spin={false} /> : <span key={i}>{w} Mehendi</span>,
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
