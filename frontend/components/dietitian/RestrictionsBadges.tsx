"use client";

const INFANT_MAX_DIAMETER_MM = 20;

const badgeStyle = {
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 500,
  background: "#fdf0e8",
  color: "#D15200",
  border: "1px solid #f5c8a0",
} as const;

export function RestrictionsBadges({ allergens, age = 0 }: { allergens: string[]; age?: number }) {
  const isInfant = age <= 2;
  const hasAllergens = allergens && allergens.length > 0;

  if (!hasAllergens && !isInfant) return null;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--fg2)",
          marginBottom: "12px",
        }}
      >
        Restrictions
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {allergens.map((a) => (
          <span key={a} style={badgeStyle}>No {a}</span>
        ))}
        {isInfant && (
          <span style={badgeStyle}>Max diameter {INFANT_MAX_DIAMETER_MM}mm</span>
        )}
      </div>
    </div>
  );
}
