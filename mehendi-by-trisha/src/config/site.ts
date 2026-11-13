/**
 * ─────────────────────────────────────────────────────────────
 *  BUSINESS SETTINGS — edit this one file to update the website
 * ─────────────────────────────────────────────────────────────
 */

/**
 * WhatsApp number: country code 91 + 10-digit mobile number,
 * digits only, no "+", spaces or dashes.  (+91 97327 17192)
 * Every WhatsApp button on the site uses this one value.
 */
export const WHATSAPP_NUMBER = '919732717192'

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hello Trisha! I visited your Mehendi by Trisha website and would like to enquire about booking your mehendi services. Please share your availability and pricing.'

/**
 * Social links. Leave a value as an empty string ('') to hide that link.
 * Paste full profile URLs, e.g. 'https://www.instagram.com/your.username/'
 */
export const SOCIAL = {
  instagram: 'https://www.instagram.com/myself_._trisha/',
  /** Shown as "@handle" next to the Instagram link, without the @. */
  instagramHandle: 'myself_._trisha',
  facebook: 'https://www.facebook.com/share/1GMscLGVvd/',
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
  title: 'Bridal & Custom Mehendi Artist',
  tagline: 'Beautiful Henna. Unforgettable Moments.',
  description:
    'Creating beautiful bridal and custom mehendi designs with artistic details, creativity, and a personal touch for your special occasions.',
}

/** Trisha's portrait. Replace this file to change the photo everywhere on the site. */
export const PORTRAIT_SRC = `${import.meta.env.BASE_URL}images/trisha-portrait.jpg`

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
