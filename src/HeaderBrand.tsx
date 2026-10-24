import { useState } from "react";
import worldsLogo from "./assets/worlds-2026.webp";

export function LegacyBrand() {
  return (
    <div className="brand" data-brand="legacy">
      <span className="worlds-mark" aria-hidden="true">
        W
      </span>
      <div>
        <h1>
          WORLDS <span>2026</span>
        </h1>
        <p>THE TOURNAMENT BOARD</p>
      </div>
    </div>
  );
}

export function HeaderBrand({
  variant = "official",
}: {
  variant?: "official" | "legacy";
}) {
  const [logoUnavailable, setLogoUnavailable] = useState(false);
  if (variant === "legacy" || logoUnavailable) return <LegacyBrand />;
  return (
    <div className="brand" data-brand="official">
      <h1>
        <img
          className="worlds-logo"
          src={worldsLogo}
          alt="Worlds 2026"
          width={792}
          height={213}
          fetchPriority="high"
          onError={() => setLogoUnavailable(true)}
        />
      </h1>
    </div>
  );
}
