import Image from "next/image";
export function BrandLoader({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={`brand-loader${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Dom’s Plumbing Services"
    >
      <div className="loader-content">
        <Image
          src="/doms-plumbing-logo-transparent.png"
          alt=""
          width={384}
          height={256}
          priority
        />
        <div className="loader-pipe" aria-hidden="true">
          <span />
        </div>
        <p>Getting things flowing.</p>
      </div>
    </div>
  );
}
