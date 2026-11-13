import { useState, type CSSProperties } from 'react'
import { getImage } from '../data/gallery'

interface Props {
  slug: string
  alt: string
  sizes?: string
  className?: string
  /** 'cover' crops to fill its frame (use `focus` to choose what stays); 'natural' keeps the full photo. */
  fit?: 'cover' | 'natural'
  focus?: string
  priority?: boolean
  style?: CSSProperties
}

/** Responsive, lazy-loaded WebP photo with a blurred placeholder while it loads. */
export function Img({ slug, alt, sizes = '100vw', className = '', fit = 'cover', focus, priority, style }: Props) {
  const img = getImage(slug)
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className={`img ${fit === 'cover' ? 'img--cover' : 'img--natural'} ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{
        backgroundImage: `url(${img.lqip})`,
        aspectRatio: fit === 'natural' ? `${img.width} / ${img.height}` : undefined,
        ...style,
      }}
    >
      <img
        src={img.src}
        srcSet={img.srcSet}
        sizes={sizes}
        width={img.width}
        height={img.height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // @ts-expect-error fetchpriority is valid HTML; React 19 accepts the lowercase attribute
        fetchpriority={priority ? 'high' : undefined}
        style={focus ? { objectPosition: focus } : undefined}
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete && el.naturalWidth) setLoaded(true)
        }}
      />
    </div>
  )
}
