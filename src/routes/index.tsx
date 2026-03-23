import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { InstallSwitcher } from "../components/InstallSwitcher";
import { SkillCard } from "../components/SkillCard";
import { SkillStatsTripletLine } from "../components/SkillStats";
import { SoulCard } from "../components/SoulCard";
import { SoulStatsTripletLine } from "../components/SoulStats";
import { UserBadge } from "../components/UserBadge";
import { convexHttp } from "../convex/client";
// import { getSkillBadges } from "../lib/badges"; // unused
import type { PublicSkill, PublicSoul, PublicUser } from "../lib/publicUser";
import { getSiteMode } from "../lib/site";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const mode = getSiteMode();
  return mode === "souls" ? <OnlyCrabsHome /> : <SkillsHome />;
}

function SkillsHome() {
  type SkillPageEntry = {
    skill: PublicSkill;
    ownerHandle?: string | null;
    owner?: PublicUser | null;
    latestVersion?: unknown;
  };

  const [_highlighted, setHighlighted] = useState<SkillPageEntry[]>([]);
  const [popular, setPopular] = useState<SkillPageEntry[]>([]);
  const totalSkills = useQuery(api.skills.countPublicSkills);
  const totalSkillsText =
    typeof totalSkills === "number" ? totalSkills.toLocaleString("en-US") : null;
  const CATEGORIES = [
    { label: "Famous Figure Style", darkColor: "rgba(139,92,246,0.15)" },
    { label: "Investing & Finance", darkColor: "rgba(16,185,129,0.15)" },
    { label: "Tech & AI", darkColor: "rgba(59,130,246,0.15)" },
    { label: "Entrepreneurship", darkColor: "rgba(249,115,22,0.15)" },
    { label: "Leadership & Change", darkColor: "rgba(232,121,249,0.15)" },
    { label: "Writing & Media", darkColor: "rgba(250,204,21,0.15)" },
    { label: "Philosophy & Wisdom", darkColor: "rgba(129,140,248,0.15)" },
    { label: "Science & Learning", darkColor: "rgba(45,212,191,0.15)" },
    { label: "Performance & Mindset", darkColor: "rgba(251,146,60,0.15)" },
    { label: "Sales & Influence", darkColor: "rgba(74,222,128,0.15)" },
    { label: "Engineering", darkColor: "rgba(56,189,248,0.15)" },
    { label: "Marketing", darkColor: "rgba(244,114,182,0.15)" },
    { label: "Design", darkColor: "rgba(192,132,252,0.15)" },
    { label: "Product & Strategy", darkColor: "rgba(52,211,153,0.15)" },
    { label: "Sales & Support", darkColor: "rgba(251,191,36,0.15)" },
    { label: "Game Development", darkColor: "rgba(248,113,113,0.15)" },
    { label: "Academic & Specialized", darkColor: "rgba(148,163,184,0.15)" },
  ];

  useEffect(() => {
    let cancelled = false;
    convexHttp
      .query(api.skills.listHighlightedPublic, { limit: 6 })
      .then((r) => {
        if (!cancelled) setHighlighted(r as SkillPageEntry[]);
      })
      .catch(() => {});
    convexHttp
      .query(api.skills.listPublicPageV4, {
        numItems: 12,
        sort: "downloads",
        dir: "desc",
        nonSuspiciousOnly: false,
      })
      .then((r) => {
        if (!cancelled) setPopular((r as { page: SkillPageEntry[] }).page);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy fade-up" data-delay="1">
            <span className="hero-badge" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
              {totalSkillsText ? `${totalSkillsText} AI Talent` : "AI Talent Network"}
            </span>
            <h1
              className="hero-title"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #a5b4fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              The AI Talent Network
            </h1>
            <p className="hero-subtitle">
              Browse, download, and deploy AI talent built on real expertise, real personality, and real-world experience — not generic AI.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <Link
                to="/skills"
                search={{
                  q: undefined,
                  sort: undefined,
                  dir: undefined,
                  focus: undefined,
                }}
                className="btn btn-primary"
                style={{ background: "#6366f1", borderColor: "#6366f1", color: "#fff" }}
              >
                Browse AI Talent
              </Link>
              <Link to="/upload" search={{ updateSlug: undefined }} className="btn" style={{ borderColor: "rgba(255,255,255,0.2)", color: "#f1f1f1" }}>
                Share an AI Talent
              </Link>
            </div>
          </div>
          <div className="hero-card hero-search-card fade-up" data-delay="2" style={{ background: "#1a1a1a", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 40px rgba(99,102,241,0.1)" }}>
            <div className="hero-install" style={{ marginTop: 18 }}>
              <InstallSwitcher exampleSlug="elon-musk" />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Popular AI Talent</h2>
        <p className="section-subtitle">Most-downloaded, non-suspicious picks.</p>
        <div className="grid">
          {popular.length === 0 ? (
            <div className="card">No AI Talent yet. Be the first.</div>
          ) : (
            popular.map((entry) => (
              <SkillCard
                key={entry.skill._id}
                skill={entry.skill}
                summaryFallback="Agent-ready AI Talent pack."
                meta={
                  <div className="skill-card-footer-rows">
                    <UserBadge
                      user={entry.owner}
                      fallbackHandle={entry.ownerHandle ?? null}
                      prefix="by"
                      link={false}
                    />
                    <div className="stat">
                      <SkillStatsTripletLine stats={entry.skill.stats} />
                    </div>
                  </div>
                }
              />
            ))
          )}
        </div>
        <div className="section-cta">
          <Link
            to="/skills"
            search={{
              q: undefined,
              sort: undefined,
              dir: undefined,
              focus: undefined,
            }}
            className="btn"
          >
            See all AI Talent
          </Link>
        </div>
      </section>

      {/* Persona differentiator blurb */}
      <div style={{ textAlign: "center", margin: "32px auto 0", maxWidth: 600, padding: "0 24px" }}>
        <p style={{ color: "#888", fontSize: "0.95rem", fontStyle: "italic", lineHeight: 1.7, margin: 0 }}>
          Two legal advisors. One precise and methodical, one direct and street-smart.{" "}
          You're not picking a tool — you're choosing who you want in your corner.{" "}
          That's something no general AI can give you.
        </p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 my-6 px-4" style={{ justifyContent: "center" }}>
        <Link
          to="/skills"
          search={{ q: undefined, sort: "downloads", dir: undefined, focus: undefined, category: undefined }}
          style={{
            padding: "6px 16px",
            borderRadius: 9999,
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            transition: "all 0.2s",
            background: "rgba(255,255,255,0.05)",
            color: "#aaa",
            textDecoration: "none",
            display: "inline-block",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#6366f1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.color = "#aaa"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          All AI Talent
        </Link>
        {CATEGORIES.map(({ label, darkColor }) => (
          <Link
            key={label}
            to="/skills"
            search={{ q: undefined, sort: "downloads", dir: undefined, focus: undefined, category: label }}
            style={{
              padding: "6px 16px",
              borderRadius: 9999,
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
              background: darkColor ?? "rgba(255,255,255,0.05)",
              color: "#aaa",
              textDecoration: "none",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#6366f1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = darkColor ?? "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.color = "#aaa"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            {label}
          </Link>
        ))}
      </div>
    </main>
  );
}

function OnlyCrabsHome() {
  const navigate = Route.useNavigate();
  const ensureSoulSeeds = useAction(api.seed.ensureSoulSeeds);
  const latest = (useQuery(api.souls.list, { limit: 12 }) as PublicSoul[]) ?? [];
  const [query, setQuery] = useState("");
  const seedEnsuredRef = useRef(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (seedEnsuredRef.current) return;
    seedEnsuredRef.current = true;
    void ensureSoulSeeds({});
  }, [ensureSoulSeeds]);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy fade-up" data-delay="1">
            <span className="hero-badge">SOUL.md, shared.</span>
            <h1 className="hero-title">SoulHub, where system lore lives.</h1>
            <p className="hero-subtitle">
              Share SOUL.md bundles, version them like docs, and keep personal system lore in one
              public place.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <Link to="/upload" search={{ updateSlug: undefined }} className="btn btn-primary">
                Publish a soul
              </Link>
              <Link
                to="/souls"
                search={{
                  q: undefined,
                  sort: undefined,
                  dir: undefined,
                  focus: undefined,
                }}
                className="btn"
              >
                Browse souls
              </Link>
            </div>
          </div>
          <div className="hero-card hero-search-card fade-up" data-delay="2">
            <form
              className="search-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void navigate({
                  to: "/souls",
                  search: {
                    q: trimmedQuery || undefined,
                    sort: undefined,
                    dir: undefined,
                    focus: undefined,
                  },
                });
              }}
            >
              <span className="mono">/</span>
              <input
                className="search-input"
                placeholder="Search souls, prompts, or lore"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </form>
            <div className="hero-install" style={{ marginTop: 18 }}>
              <div className="stat">Search souls. Versioned, readable, easy to remix.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Latest souls</h2>
        <p className="section-subtitle">Newest SOUL.md bundles across the hub.</p>
        <div className="grid">
          {latest.length === 0 ? (
            <div className="card">No souls yet. Be the first.</div>
          ) : (
            latest.map((soul) => (
              <SoulCard
                key={soul._id}
                soul={soul}
                summaryFallback="A SOUL.md bundle."
                meta={
                  <div className="stat">
                    <SoulStatsTripletLine stats={soul.stats} />
                  </div>
                }
              />
            ))
          )}
        </div>
        <div className="section-cta">
          <Link
            to="/souls"
            search={{
              q: undefined,
              sort: undefined,
              dir: undefined,
              focus: undefined,
            }}
            className="btn"
          >
            See all souls
          </Link>
        </div>
      </section>
    </main>
  );
}
