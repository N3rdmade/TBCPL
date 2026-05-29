import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => ReactElement> = {
  movies: (p) => (
    <Svg {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M2.5 9h4M2.5 15h4M17.5 9h4M17.5 15h4M7 12h10" />
    </Svg>
  ),
  anime: ({ size = 18, ...rest }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path
        fillRule="evenodd"
        d="M38.892 14.296C26.973 19.323 15.061 32.693 15.01 41.102c-.009 1.359-2.437 8.367-13.59 39.218L.039 84.141l27.731-.321c31.091-.359 32.628-.667 41.006-8.237 18.829-17.01 3.415-50.678-20.822-45.48-20.01 4.292-21.144 34.431-1.379 36.658 12.603 1.421 18.192-11.422 8.707-20.006-1.841-1.666-2.037-1.62-4.623 1.079-2.699 2.817-2.699 2.82-.68 4.647 4.522 4.092 1.159 8.906-4.439 6.355-6.306-2.873-7.474-12.102-2.199-17.377 13.386-13.386 34.151 8.644 23.31 24.731-16.699 24.779-55.114-1.28-42.293-28.69 8.743-18.692 31.564-23.429 50.15-10.41l5.702 3.995 7.395-5.566c8.152-6.136 8.232-6.278 5.458-9.658-2.098-2.557-1.74-2.656-8.938 2.474l-3.978 2.835-8.663-4.293c-11.285-5.592-23.213-6.537-32.592-2.581M16 62.281c0 .371-1.105 3.609-2.455 7.196L11.09 76h15.259l-2.071-2.25c-1.138-1.237-3.467-4.476-5.174-7.196C17.397 63.834 16 61.911 16 62.281"
      />
    </svg>
  ),
  manga: (p) => (
    <Svg {...p}>
      <path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5Z" />
    </Svg>
  ),
  livetv: (p) => (
    <Svg {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M8 21h8M12 18v3M8 3l4 3 4-3" />
    </Svg>
  ),
  paid: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5" />
    </Svg>
  ),
  apps: (p) => (
    <Svg {...p}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 5.5h4M11 18.5h2" />
    </Svg>
  ),
};

export function CategoryIcon({ id, size, className, ...rest }: { id: string } & IconProps) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <Icon size={size} className={className} {...rest} />;
}
