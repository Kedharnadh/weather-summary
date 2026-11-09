import type { ReactNode, SVGProps } from 'react';

export type UiIconName =
  | 'location'
  | 'install'
  | 'refresh'
  | 'settings'
  | 'close'
  | 'up'
  | 'down'
  | 'trash'
  | 'check'
  | 'offline'
  | 'update'
  | 'search'
  | 'sparkle';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: UiIconName;
  size?: number;
}

/**
 * Small, monochrome UI glyphs used by buttons and banners. These are plain
 * stroke icons rather than the faceted low-poly weather art: at 16–20px the
 * polygon scenes lose their shape, so buttons stay legible instead.
 */
export function UiIcon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

const paths: Record<UiIconName, ReactNode> = {
  location: (
    <>
      <path d="M12 21s-6.2-5.5-6.2-10.2a6.2 6.2 0 1 1 12.4 0C18.2 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </>
  ),
  install: (
    <>
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 21v-5h5" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 3v5h-5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h8" />
      <path d="M17 7h3" />
      <circle cx="14.5" cy="7" r="2.4" />
      <path d="M4 12h3" />
      <path d="M12 12h8" />
      <circle cx="9.5" cy="12" r="2.4" />
      <path d="M4 17h8" />
      <path d="M17 17h3" />
      <circle cx="14.5" cy="17" r="2.4" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  up: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  down: (
    <>
      <path d="M12 5v14" />
      <path d="m18 13-6 6-6-6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  offline: (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.6 15.4a5 5 0 0 1 6.8 0" />
      <path d="M5.2 12.2a10 10 0 0 1 3-1.9" />
      <path d="M16 10.4a10 10 0 0 1 2.8 1.8" />
      <path d="M12 19h.01" />
    </>
  ),
  update: (
    <>
      <path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.7L12 16l-1.7-4.6L5.8 9.7 10.3 8 12 3.5Z" />
      <path d="M18 15.5l.7 1.8 1.8.7-1.8.7L18 20.5l-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.7L12 16l-1.7-4.6L5.8 9.7 10.3 8 12 3.5Z" />
      <path d="M18.5 15.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5Z" />
    </>
  ),
};
