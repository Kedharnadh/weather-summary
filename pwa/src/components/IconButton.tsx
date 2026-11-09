import type { ReactNode } from 'react';

interface Props {
  /** Accessible name; also used as the hover tooltip. */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary';
  disabled?: boolean;
  /** Spin the icon while an action is in progress. */
  busy?: boolean;
  className?: string;
}

/**
 * Square, icon-only button for the compact header and manage rows. The visible
 * content is the glyph; `aria-label` and `title` keep it understandable to
 * screen readers and on hover.
 */
export function IconButton({
  label,
  icon,
  onClick,
  variant = 'ghost',
  disabled = false,
  busy = false,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={`icon-button ${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
    >
      <span className={`icon-button-glyph${busy ? ' is-spinning' : ''}`}>{icon}</span>
    </button>
  );
}
