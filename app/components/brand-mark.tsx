import Image from "next/image";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  withName?: boolean;
  inverted?: boolean;
};

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 56,
} as const;

export function BrandMark({ size = "md", withName = true, inverted = false }: BrandMarkProps) {
  const pixels = sizeMap[size];

  return (
    <div className={`brand-lockup ${inverted ? "brand-lockup-inverted" : ""}`} aria-label="SELVA+">
      <Image
        className="brand-symbol-image"
        src="/brand/selva-symbol.png"
        width={pixels}
        height={pixels}
        sizes={`${pixels}px`}
        alt=""
        priority
      />
      {withName ? <span className="brand-name">SELVA<span>+</span></span> : null}
    </div>
  );
}
