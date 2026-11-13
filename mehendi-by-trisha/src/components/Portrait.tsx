import { useState } from 'react'
import { PORTRAIT_SRC, BUSINESS } from '../config/site'

interface Props {
  className?: string
  /** CSS object-position: which part of the photo stays in frame. Faces sit near the top. */
  focus?: string
  priority?: boolean
}

/**
 * Trisha's original portrait (public/images/trisha-portrait.jpg).
 * Shown with object-fit: cover, so it is framed — never stretched or distorted.
 */
export function Portrait({ className = '', focus = 'center 22%', priority }: Props) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`img img--cover portrait ${loaded ? 'is-loaded' : ''} ${className}`}>
      <img
        src={PORTRAIT_SRC}
        alt={`${BUSINESS.artist}, ${BUSINESS.title.toLowerCase()} — ${BUSINESS.name}, ${BUSINESS.locality}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{ objectPosition: focus }}
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete && el.naturalWidth) setLoaded(true)
        }}
      />
    </div>
  )
}
