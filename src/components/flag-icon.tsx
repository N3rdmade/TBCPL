import Image from "next/image";

interface FlagIconProps {
  code: string;
  size?: number;
  className?: string;
}

/**
 * Renders a flag icon using flagcdn.com for ISO country codes.
 * Falls back to a sun emoji for Kurdistan (no ISO code).
 */
export function FlagIcon({ code, size = 20, className = "" }: FlagIconProps) {
  // Kurdistan doesn't have an ISO code
  if (code === "kurdistan") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.8 }}
        role="img"
        aria-label="Kurdistan flag"
      >
        ☀️
      </span>
    );
  }

  return (
    <Image
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={`${code.toUpperCase()} flag`}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: "auto" }}
      unoptimized
    />
  );
}
