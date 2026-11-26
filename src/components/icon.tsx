import type { SVGProps } from "react";

const paths = {
  phone: (
    <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  moon: <path d="M20.5 13a9 9 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  droplet: (
    <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Zm-3 13a3 3 0 0 0 3 3" />
  ),
  pipe: (
    <>
      <path d="M3 3h6v9a3 3 0 0 0 3 3h9v6h-9a9 9 0 0 1-9-9V3Z" />
      <path d="M2 3h8m11 11v8M3 8h6m7 7v6" />
    </>
  ),
  wrench: (
    <path d="M14.5 6.5 18 10l3-3a6 6 0 0 1-8 7L6 21a2.1 2.1 0 0 1-3-3l7-7a6 6 0 0 1 7-8l-2.5 3.5Z" />
  ),
  chat: (
    <>
      <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.9-5A10 10 0 0 1 3 11a9 9 0 1 1 18 0Z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
};

export type IconName = keyof typeof paths;
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
