import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px" }}>
      {/* Vision */}
      <section style={{ marginBottom: 64 }}>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: 24,
            background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          About Guildex
        </h1>
        <p style={{ color: "#ccc", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: 20 }}>
          Guildex is an open platform where you can browse, download, upload, and deploy AI talent —
          each one carrying real expertise, real personality, and real judgment. Not generic AI.
          A person with opinions, experience, and scars from the real world.
        </p>
        <p style={{ color: "#ccc", fontSize: "1.1rem", lineHeight: 1.8 }}>
          Many professionals fear being replaced by AI — but have no way out. Guildex is that way
          out: encode your expertise into an AI talent, help others, and let your value live on.
        </p>
      </section>

      {/* How It Works */}
      <section>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e0e7ff", marginBottom: 32 }}>
          How It Works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
          {/* Step 1 */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#a5b4fc",
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: 16,
              }}
            >
              1
            </div>
            <h3 style={{ color: "#f1f1f1", fontWeight: 700, marginBottom: 8 }}>Find your talent</h3>
            <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Search across 100+ specialized AI talent by expertise, style, and industry.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#a5b4fc",
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: 16,
              }}
            >
              2
            </div>
            <h3 style={{ color: "#f1f1f1", fontWeight: 700, marginBottom: 8 }}>Add to your team</h3>
            <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Download and deploy to your OpenClaw agent. Your AI team, ready in minutes.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#a5b4fc",
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: 16,
              }}
            >
              3
            </div>
            <h3 style={{ color: "#f1f1f1", fontWeight: 700, marginBottom: 8 }}>Get real work done</h3>
            <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Hire an AI talent for 1% of a human's cost. 100% of their expertise, always available.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Link
            to="/skills"
            search={{
              q: undefined,
              sort: undefined,
              dir: undefined,
              highlighted: undefined,
              nonSuspicious: true,
              view: undefined,
              focus: undefined,
            }}
            className="btn btn-primary"
            style={{ background: "#6366f1", borderColor: "#6366f1", color: "#fff" }}
          >
            Browse AI Talent
          </Link>
        </div>
      </section>
    </main>
  );
}
