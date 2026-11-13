/**
 * ─────────────────────────────────────────────
 *  SERVICE AREAS & FAQ — edit freely
 * ─────────────────────────────────────────────
 * Maslandapur is the only business location. The other areas are places
 * where Trisha travels to the client's home or venue for bookings
 * (confirmed by the owner). Do not add an area unless she takes bookings there,
 * and never add addresses for them — there is no office outside Maslandapur.
 */

export interface Area {
  name: string
  /** Bengali name, shown alongside the English one. */
  bn: string
  note: string
  primary?: boolean
}

export const AREAS: Area[] = [
  {
    name: 'Maslandapur',
    bn: 'মছলন্দপুর',
    note: 'Home base — bridal, custom and festive mehendi, at your home or venue.',
    primary: true,
  },
  { name: 'Barasat', bn: 'বারাসাত', note: 'Bridal and custom mehendi bookings at your home or venue.' },
  { name: 'Madhyamgram', bn: 'মধ্যমগ্রাম', note: 'Bridal, engagement and party mehendi at your home or venue.' },
  { name: 'Kolkata', bn: 'কলকাতা', note: 'Wedding and celebration bookings — share your venue and date.' },
  {
    name: 'North 24 Parganas',
    bn: 'উত্তর ২৪ পরগনা',
    note: 'Other towns across the district, depending on the date and distance.',
  },
]

export interface Faq {
  q: string
  /** Plain-text answer (also used for search-engine structured data). */
  a: string
  /** Optional in-page link shown after the answer. */
  link?: { href: string; label: string }
  lang?: 'en' | 'bn'
}

export const FAQS: Faq[] = [
  {
    q: 'Where is Mehendi by Trisha based?',
    a: 'Trisha is a bridal and custom mehendi artist based in Maslandapur, North 24 Parganas, West Bengal. She comes to your home or event venue for bookings.',
    link: { href: '#about', label: 'Meet Trisha' },
  },
  {
    q: 'Do you provide bridal mehendi in Barasat and Madhyamgram?',
    a: 'Yes. Trisha accepts bridal, engagement and custom mehendi bookings in Barasat and Madhyamgram, at your home or venue. Share your date and location on WhatsApp to check availability.',
    link: { href: '#services', label: 'See bridal mehendi' },
  },
  {
    q: 'Do you travel to Kolkata for weddings?',
    a: 'Yes, Trisha takes wedding and celebration bookings in Kolkata. Send your venue, date and the number of people, and the travel details are agreed with you before the booking is confirmed.',
    link: { href: '#booking', label: 'Send a booking enquiry' },
  },
  {
    q: 'Do you accept bookings elsewhere in North 24 Parganas?',
    a: 'Yes, bookings in other towns of North 24 Parganas are accepted depending on the date and distance. Message Trisha with your location to confirm.',
    link: { href: '#booking', label: 'Check your date' },
  },
  {
    q: 'Can I get a custom design with names or initials?',
    a: 'Yes. Every design can be personalised — couple initials, names, motifs such as peacocks or lotuses, or a design based on a photo you love.',
    link: { href: '#gallery', label: 'Browse the gallery' },
  },
  {
    q: 'How do I book and get the price?',
    a: 'Fill in the booking form or message Trisha on WhatsApp with your event type, date, location and number of people. Pricing depends on the design and coverage, so it is shared on enquiry.',
    link: { href: '#booking', label: 'Book your date' },
  },
  {
    lang: 'bn',
    q: 'আপনি কি বাড়িতে এসে মেহেন্দি করেন?',
    a: 'হ্যাঁ। ত্রিশা মছলন্দপুর থেকে বারাসাত, মধ্যমগ্রাম, কলকাতা এবং উত্তর ২৪ পরগনার বিভিন্ন জায়গায় আপনার বাড়ি বা অনুষ্ঠানস্থলে গিয়ে ব্রাইডাল ও কাস্টম মেহেন্দি করেন। তারিখ ও জায়গা জানিয়ে হোয়াটসঅ্যাপে মেসেজ করুন।',
    link: { href: '#booking', label: 'বুকিং করুন' },
  },
  {
    lang: 'bn',
    q: 'বিয়ের মেহেন্দির জন্য কত আগে বুক করা উচিত?',
    a: 'বিয়ের মরসুমে তারিখ তাড়াতাড়ি ভরে যায়, তাই যত আগে সম্ভব যোগাযোগ করুন। আপনার তারিখ খালি আছে কি না, ত্রিশা হোয়াটসঅ্যাপে জানিয়ে দেবেন।',
    link: { href: '#booking', label: 'তারিখ জানতে চান' },
  },
]
