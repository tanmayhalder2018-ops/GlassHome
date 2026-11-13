import { useState, type FormEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Send, MessageCircle, CalendarHeart, Sparkles } from 'lucide-react'
import { whatsappLink, isWhatsAppConfigured } from '../config/site'
import { SERVICES } from '../data/services'
import { Reveal, RevealText, ease } from './Reveal'
import { Mandala, FlowerMark } from './Botanical'
import { WhatsAppIcon } from './BrandIcons'

const EVENT_TYPES = ['Wedding (Bride)', 'Wedding (Family & Guests)', 'Engagement', 'Festival', 'Party / Celebration', 'Other']
const DESIGNS = [...SERVICES.map((s) => s.title.replace(' Booking', '')), 'Not sure yet — need suggestions']

interface Values {
  name: string
  eventType: string
  date: string
  location: string
  people: string
  design: string
  message: string
}
const EMPTY: Values = { name: '', eventType: '', date: '', location: '', people: '', design: '', message: '' }
type Errors = Partial<Record<keyof Values, string>>

const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function validate(v: Values): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Please enter your name.'
  if (!v.eventType) e.eventType = 'Please choose the type of event.'
  if (!v.date) e.date = 'Please choose your event date.'
  else if (v.date < today()) e.date = 'The event date can’t be in the past.'
  if (v.location.trim().length < 2) e.location = 'Please tell us where the event is.'
  const n = Number(v.people)
  if (!v.people) e.people = 'Please enter how many people need mehendi.'
  else if (!Number.isInteger(n) || n < 1 || n > 500) e.people = 'Please enter a number between 1 and 500.'
  return e
}

function formatDate(iso: string) {
  const [y, mo, d] = iso.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function buildMessage(v: Values) {
  return [
    'Hello Trisha! I visited your Mehendi by Trisha website and would like to enquire about booking your mehendi services.',
    '',
    `*Name:* ${v.name.trim()}`,
    `*Event:* ${v.eventType}`,
    `*Date:* ${formatDate(v.date)}`,
    `*Location:* ${v.location.trim()}`,
    `*Number of people:* ${v.people}`,
    `*Preferred design:* ${v.design || 'Not decided yet'}`,
    ...(v.message.trim() ? ['', `*Message:* ${v.message.trim()}`] : []),
    '',
    'Please share your availability and pricing. Thank you!',
  ].join('\n')
}

const STEPS = [
  { icon: <Send size={18} strokeWidth={1.5} />, title: 'Share your details', text: 'Fill in the form — it prepares a WhatsApp message for you.' },
  { icon: <MessageCircle size={18} strokeWidth={1.5} />, title: 'Chat with Trisha', text: 'Trisha replies with her availability, design ideas and pricing.' },
  { icon: <CalendarHeart size={18} strokeWidth={1.5} />, title: 'Confirm your date', text: 'Your booking is confirmed once you both agree on the details.' },
]

export function BookingForm() {
  const [v, setV] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setV((p) => ({ ...p, [k]: e.target.value }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate(v)
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      document.getElementById(`f-${first}`)?.focus()
      return
    }
    window.open(whatsappLink(buildMessage(v)), '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  const field = (k: keyof Values) => ({
    id: `f-${k}`,
    name: k,
    value: v[k],
    onChange: set(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `e-${k}` : undefined,
  })
  const err = (k: keyof Values) =>
    errors[k] ? (
      <span className="field__error" id={`e-${k}`} role="alert">
        {errors[k]}
      </span>
    ) : null

  return (
    <section id="booking" className="section booking" aria-labelledby="booking-title">
      <Mandala className="booking__mandala" />
      <div className="container booking__grid">
        <div className="booking__intro">
          <Reveal>
            <p className="eyebrow"><span className="eyebrow__line" /> Book Your Date</p>
          </Reveal>
          <h2 id="booking-title" className="section-title">
            <RevealText text="Let's Create" /> <RevealText text="Something Beautiful." className="italic" delay={0.12} />
          </h2>
          <Reveal delay={0.15}>
            <p className="section-intro">
              Planning your wedding or special celebration? Let's discuss your mehendi requirements.
            </p>
          </Reveal>
          <ol className="booking__steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={0.1 + i * 0.1}>
                <span className="booking__step-icon">{s.icon}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1} className="booking__card">
          <AnimatePresence mode="wait">
            {sent ? (
              <m.div key="sent" className="booking__sent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} role="status">
                <FlowerMark size={40} />
                <h3>Your message is ready in WhatsApp</h3>
                <p>
                  Just press <strong>send</strong> in WhatsApp to deliver your enquiry. Trisha will reply with her
                  availability and pricing — your date is confirmed only once you've agreed the details together.
                </p>
                {!isWhatsAppConfigured && (
                  <p className="booking__note">WhatsApp will ask you to choose who to send the message to.</p>
                )}
                <div className="booking__sent-actions">
                  <a className="btn btn--solid" href={whatsappLink(buildMessage(v))} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon size={18} /> <span>Open WhatsApp again</span>
                  </a>
                  <button type="button" className="btn btn--ghost" onClick={() => setSent(false)}>
                    <span>Edit details</span>
                  </button>
                </div>
              </m.div>
            ) : (
              <m.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <div className="booking__form-head">
                  <Sparkles size={18} strokeWidth={1.4} />
                  <p>Booking enquiry</p>
                </div>
                <div className="form-grid">
                  <label className="field field--full">
                    <span className="field__label">Full Name <i aria-hidden="true">*</i></span>
                    <input {...field('name')} type="text" autoComplete="name" required placeholder="Your name" />
                    {err('name')}
                  </label>
                  <label className="field">
                    <span className="field__label">Event Type <i aria-hidden="true">*</i></span>
                    <select {...field('eventType')} required>
                      <option value="" disabled>Select event</option>
                      {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {err('eventType')}
                  </label>
                  <label className="field">
                    <span className="field__label">Event Date <i aria-hidden="true">*</i></span>
                    <input {...field('date')} type="date" min={today()} required />
                    {err('date')}
                  </label>
                  <label className="field">
                    <span className="field__label">Event Location <i aria-hidden="true">*</i></span>
                    <input {...field('location')} type="text" autoComplete="address-level2" required placeholder="Town / venue" />
                    {err('location')}
                  </label>
                  <label className="field">
                    <span className="field__label">Number of People <i aria-hidden="true">*</i></span>
                    <input {...field('people')} type="number" inputMode="numeric" min={1} max={500} required placeholder="e.g. 1" />
                    {err('people')}
                  </label>
                  <label className="field field--full">
                    <span className="field__label">Preferred Design</span>
                    <select {...field('design')}>
                      <option value="">Choose a style (optional)</option>
                      {DESIGNS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="field field--full">
                    <span className="field__label">Additional Message</span>
                    <textarea {...field('message')} rows={3} placeholder="Coverage (palms / elbows), timing, design ideas…" />
                  </label>
                </div>
                <p className="form-note"><i aria-hidden="true">*</i> Required. Sending opens WhatsApp with your details filled in — nothing is booked automatically.</p>
                <button type="submit" className="btn btn--solid btn--block">
                  <WhatsAppIcon size={18} />
                  <span>Send Enquiry on WhatsApp</span>
                </button>
              </m.form>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}
