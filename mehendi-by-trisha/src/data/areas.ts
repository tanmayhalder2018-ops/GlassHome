/**
 * ─────────────────────────────────────────────
 *  SERVICE AREAS & FAQ — edit freely
 * ─────────────────────────────────────────────
 * Maslandapur is the only business location. Every other place is somewhere
 * Trisha travels to the client's home or venue for bookings (confirmed by the
 * owner). Only add a place if she takes bookings there, and never add an
 * address for it — there is no office outside Maslandapur.
 */

export interface Area {
  name: string
  /** Bengali name, shown alongside the English one. */
  bn: string
  primary?: boolean
}

export interface District {
  name: string
  bn: string
  areas: Area[]
  /** Short line under the district, e.g. about nearby towns. */
  note?: string
}

export const DISTRICTS: District[] = [
  {
    name: 'North 24 Parganas',
    bn: 'উত্তর ২৪ পরগনা',
    areas: [
      { name: 'Maslandapur', bn: 'মছলন্দপুর', primary: true },
      { name: 'Barasat', bn: 'বারাসাত' },
      { name: 'Madhyamgram', bn: 'মধ্যমগ্রাম' },
      { name: 'Bongaon', bn: 'বনগাঁ' },
    ],
    note: 'Other towns in the district too, depending on the date.',
  },
  {
    name: 'Nadia',
    bn: 'নদিয়া',
    areas: [
      { name: 'Ranaghat', bn: 'রানাঘাট' },
      { name: 'Kalyani', bn: 'কল্যাণী' },
      { name: 'Santipur', bn: 'শান্তিপুর' },
      { name: 'Majhergram', bn: 'মাঝেরগ্রাম' },
    ],
    note: 'Other towns in Nadia too, depending on the date.',
  },
  {
    name: 'Kolkata',
    bn: 'কলকাতা',
    areas: [{ name: 'Kolkata', bn: 'কলকাতা' }],
    note: 'Weddings and celebrations — share your venue and date.',
  },
]

/** Flat list of every named place (used for structured data and tests). */
export const ALL_AREAS = DISTRICTS.flatMap((d) => d.areas.map((a) => a.name))

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
    q: 'Do you provide bridal mehendi in Barasat, Madhyamgram and Bongaon?',
    a: 'Yes. Trisha accepts bridal, engagement and custom mehendi bookings in Barasat, Madhyamgram, Bongaon and other towns of North 24 Parganas, at your home or venue. Share your date and location on WhatsApp to check availability.',
    link: { href: '#services', label: 'See bridal mehendi' },
  },
  {
    q: 'Do you take bookings in Nadia — Ranaghat, Kalyani, Santipur or Majhergram?',
    a: 'Yes. Trisha travels to Ranaghat, Kalyani, Santipur, Majhergram and other towns in Nadia for bridal and custom mehendi. Send your venue and date, and the travel details are agreed with you before the booking is confirmed.',
    link: { href: '#areas', label: 'See all service areas' },
  },
  {
    q: 'Do you travel to Kolkata for weddings?',
    a: 'Yes, Trisha takes wedding and celebration bookings in Kolkata. Send your venue, date and the number of people, and the travel details are agreed with you before the booking is confirmed.',
    link: { href: '#booking', label: 'Send a booking enquiry' },
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
    a: 'হ্যাঁ। ত্রিশা মছলন্দপুর থেকে বারাসাত, মধ্যমগ্রাম, বনগাঁ, কলকাতা এবং নদিয়ার রানাঘাট, কল্যাণী, শান্তিপুর, মাঝেরগ্রাম-সহ বিভিন্ন জায়গায় আপনার বাড়ি বা অনুষ্ঠানস্থলে গিয়ে ব্রাইডাল ও কাস্টম মেহেন্দি করেন। তারিখ ও জায়গা জানিয়ে হোয়াটসঅ্যাপে মেসেজ করুন।',
    link: { href: '#booking', label: 'বুকিং করুন' },
  },
  {
    lang: 'bn',
    q: 'বিয়ের মেহেন্দির জন্য কত আগে বুক করা উচিত?',
    a: 'বিয়ের মরসুমে তারিখ তাড়াতাড়ি ভরে যায়, তাই যত আগে সম্ভব যোগাযোগ করুন। আপনার তারিখ খালি আছে কি না, ত্রিশা হোয়াটসঅ্যাপে জানিয়ে দেবেন।',
    link: { href: '#booking', label: 'তারিখ জানতে চান' },
  },
]
