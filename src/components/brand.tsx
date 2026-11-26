import Image from "next/image";

export function Brand({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <a
      className={`brand ${className}`.trim()}
      href="#home"
      aria-label="Dom’s Plumbing Services home"
    >
      <Image
        src="/doms-plumbing-logo-transparent.png"
        alt="Dom’s Plumbing Services — Get it done right!"
        width={384}
        height={240}
        sizes="(max-width: 640px) 140px, 190px"
        priority={priority}
      />
    </a>
  );
}
