import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { PublicSkill } from "../lib/publicUser";

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#1a3a6b", // deep blue
  "#2d1a6b", // deep purple
  "#1a5c2d", // deep green
  "#6b1a1a", // deep red
  "#1a4a5c", // deep teal
  "#5c3a1a", // deep brown
  "#3a1a5c", // deep indigo
  "#1a5c4a", // deep emerald
  "#5c1a3a", // deep rose
  "#3a4a1a", // deep olive
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.42,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.02em",
        border: "2px solid rgba(255,255,255,0.08)",
      }}
    >
      {getInitial(name)}
    </div>
  );
}

// ─── Category color map ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Professional/Career": "#60a5fa",
  "Startup/Investment": "#34d399",
  "Famous Figure Style": "#a78bfa",
  "Lifestyle": "#f472b6",
  "Education/Learning": "#fbbf24",
  "Creative Arts": "#fb923c",
  "Health & Mind": "#2dd4bf",
};

function getCategoryColor(category: string | null | undefined): string {
  return (category && CATEGORY_COLORS[category]) ?? "#888";
}

// ─── SkillCard ────────────────────────────────────────────────────────────────

type SkillCardProps = {
  skill: PublicSkill;
  ownerHandle?: string | null;
  badge?: string | string[];
  chip?: string;
  platformLabels?: string[];
  summaryFallback: string;
  meta: ReactNode;
  href?: string;
};

export function SkillCard({
  skill,
  summaryFallback,
  href,
  ownerHandle,
}: SkillCardProps) {
  const owner = encodeURIComponent(String(skill.ownerUserId));
  const link = href ?? `/${owner}/${skill.slug}`;

  const name = skill.displayName;
  const tagline = skill.summary ?? summaryFallback;
  const rating = skill.rating ?? 4.8;
  const downloadCount = skill.stats?.downloads ?? 0;
  const skillTags = (skill.coreSkills ?? []).slice(0, 3);
  const extraTags = (skill.coreSkills ?? []).length - skillTags.length;
  const category = skill.category ?? null;
  const title = skill.title ?? null;
  const categories = skill.categories ?? (category ? [category] : []);
  const firstCategory = categories[0] ?? null;
  const extraCategoryCount = categories.length - 1;

  return (
    <Link to={link} className="card persona-card" style={{ display: "flex", flexDirection: "column", aspectRatio: "1 / 1.15", padding: "14px" }}>
      {/* Top row: avatar + name + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Avatar name={name} size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </h3>
          {title && (
            <p style={{
              margin: 0,
              fontSize: "0.72rem",
              color: "#6b7280",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {title}
            </p>
          )}
        </div>
      </div>

      {/* Rating + downloads */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.78rem", color: "#aaa" }}>
        <span style={{ color: "#fbbf24" }}>⭐</span>
        <span style={{ fontWeight: 600, color: "#e0e0e0" }}>{rating.toFixed(1)}</span>
        <span style={{ color: "#555" }}>·</span>
        <span>↓ {downloadCount.toLocaleString()}</span>
      </div>

      {/* Tagline */}
      {tagline && (
        <p style={{
          margin: "0 0 8px",
          fontSize: "0.72rem",
          color: "#999",
          lineHeight: 1.4,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          flex: "0 0 auto",
        }}>
          {tagline}
        </p>
      )}

      {/* Skill tags */}
      {skillTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, flex: "1 1 auto", alignContent: "flex-start", overflow: "hidden" }}>
          {skillTags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.06)",
                color: "#bbb",
                fontSize: "0.68rem",
                fontWeight: 500,
                border: "1px solid rgba(255,255,255,0.08)",
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span style={{
              padding: "2px 8px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.04)",
              color: "#666",
              fontSize: "0.68rem",
            }}>
              +{extraTags}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Divider + footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: getCategoryColor(firstCategory) }}>
            {firstCategory ?? "AI Talent"}
          </span>
          {extraCategoryCount > 0 && (
            <span style={{ fontSize: "0.68rem", color: "#555", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 9999 }}>
              +{extraCategoryCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: "0.68rem", color: "#555" }}>
          by {ownerHandle ?? skill.slug}
        </span>
      </div>
    </Link>
  );
}
