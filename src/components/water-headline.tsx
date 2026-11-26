export function WaterHeadline() {
  return (
    <h1
      id="hero-heading"
      className="hero-title"
      aria-label="Your local plumbing bloke"
    >
      <span className="headline-intro" aria-hidden="true">
        Your local
      </span>
      <span className="water-word" aria-hidden="true">
        <span className="water-base">plumbing</span>
        <span className="water-fill water-back">plumbing</span>
        <span className="water-fill water-front">plumbing</span>
      </span>
      <span className="headline-ending" aria-hidden="true">
        bloke
      </span>
    </h1>
  );
}
