type BrandMarkProps = { size?: "sm" | "md" | "lg"; dark?: boolean; withName?: boolean };

export function BrandMark({ size = "md", dark = false, withName = true }: BrandMarkProps) {
  const dimensions = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className="brand-lockup" aria-label="SELVA+">
      <span className={`brand-symbol ${dimensions} ${dark ? "brand-symbol-dark" : ""}`} aria-hidden="true">
        <span className="brand-s">S</span><span className="brand-plus">+</span>
      </span>
      {withName && <span className="brand-name">SELVA<span>+</span></span>}
    </div>
  );
}
