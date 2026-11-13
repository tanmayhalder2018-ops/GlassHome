import { ArrowRight } from 'lucide-react'
import type { ReactNode, MouseEventHandler } from 'react'

interface Props {
  href: string
  children: ReactNode
  variant?: 'solid' | 'outline' | 'ghost' | 'light'
  icon?: ReactNode
  external?: boolean
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  ariaLabel?: string
}

/** Link-styled button with a sliding arrow. External links open in a new tab. */
export function Button({ href, children, variant = 'solid', icon, external, className = '', onClick, ariaLabel }: Props) {
  return (
    <a
      href={href}
      className={`btn btn--${variant} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {icon}
      <span>{children}</span>
      <span className="btn__arrow" aria-hidden="true">
        <ArrowRight size={16} strokeWidth={1.6} />
        <ArrowRight size={16} strokeWidth={1.6} />
      </span>
    </a>
  )
}
