/**
 * ─────────────────────────────────────────────────────────────
 *  BUSINESS SETTINGS — edit this one file to update the website
 * ─────────────────────────────────────────────────────────────
 */

/**
 * WhatsApp number: country code 91 + 10-digit mobile number,
 * digits only, no "+", spaces or dashes.  Example: "919876543210"
 *
 * While this still says REPLACE_WITH_PHONE_NUMBER, every WhatsApp button
 * opens WhatsApp with the message ready and lets the visitor pick the chat,
 * so nothing on the site is broken — but customers can't reach Trisha
 * directly until the real number is filled in.
 */
export const WHATSAPP_NUMBER = 'REPLACE_WITH_PHONE_NUMBER'

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hello Trisha! I visited your Mehendi by Trisha website and would like to enquire about booking your mehendi services. Please share your availability and pricing.'

/**
 * Social links. Leave a value as an empty string ('') to hide that link.
 * Paste full profile URLs, e.g. 'https://www.instagram.com/your.username/'
 */
export const SOCIAL = {
  instagram: '',
  /** Shown as "@handle" next to the Instagram link, without the @. */
  instagramHandle: '',
  facebook: '',
}

/**
 * Google Maps link. By default it points to the town of Maslandapur only —
 * no home address is shown. Replace with a Google Maps share link to a
 * studio/business listing if Trisha has one.
 */
export const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Maslandapur%2C+West+Bengal'

export const BUSINESS = {
  name: 'Mehendi by Trisha',
  artist: 'Trisha',
  locality: 'Maslandapur',
  region: 'West Bengal',
  country: 'India',
  tagline: 'Beautiful Henna. Unforgettable Moments.',
}

const configured = /^91\d{10}$/.test(WHATSAPP_NUMBER)
export const isWhatsAppConfigured = configured

/** Builds a WhatsApp link that opens a chat with the message pre-filled. */
export function whatsappLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  const text = encodeURIComponent(message)
  return configured ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}` : `https://wa.me/?text=${text}`
}

export function serviceEnquiry(service: string): string {
  return whatsappLink(
    `Hello Trisha! I visited your Mehendi by Trisha website and I'm interested in ${service}. Could you please share your availability and pricing?`,
  )
}

export const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'contact', label: 'Contact' },
] as const
