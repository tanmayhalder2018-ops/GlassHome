/**
 * Services shown in "Signature Services".
 * `image` is a slug from src/data/gallery.ts / image-manifest.json.
 * Prices are intentionally not listed — every card says "Enquire for Pricing".
 */
export interface Service {
  title: string
  description: string
  image: string
}

export const SERVICES: Service[] = [
  {
    title: 'Bridal Mehendi',
    description:
      'Detailed designs for the bride, from palms to elbows — with room for personal motifs, figures and hidden initials.',
    image: 'bridal-peacock-jhumka-palm',
  },
  {
    title: 'Arabic Mehendi',
    description: 'Flowing trails, bold florals and graceful shading, with open space that lets the design breathe.',
    image: 'arabic-floral-shaded-palm',
  },
  {
    title: 'Traditional Indian Mehendi',
    description: 'Mandalas, lotuses, paisleys and fine fills — classic motifs drawn in rich, intricate detail.',
    image: 'lotus-mandala-palm',
  },
  {
    title: 'Engagement Mehendi',
    description: 'Elegant designs for the ring ceremony — refined enough for photographs, light enough for the day.',
    image: 'intricate-full-palm',
  },
  {
    title: 'Minimal Mehendi',
    description: 'A single motif, a finger band or a delicate accent — for those who love a clean, modern look.',
    image: 'minimal-lotus-back-hand-2',
  },
  {
    title: 'Party & Guest Mehendi',
    description: 'Quick, pretty designs for family and guests so everyone can join the celebration.',
    image: 'floral-vine-palm',
  },
  {
    title: 'Festival Mehendi',
    description: 'Festive designs for Teej, Karwa Chauth, Eid, Diwali and every celebration in between.',
    image: 'floral-trail-garden-palm',
  },
  {
    title: 'Group Mehendi Booking',
    description: 'Planning mehendi for a group? Share the numbers and timing and we can plan it together.',
    image: 'henna-cones',
  },
]
