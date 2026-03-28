import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { PublicSkill } from "../lib/publicUser";
import { SkillCard } from "../components/SkillCard";

export const Route = createFileRoute("/stars")({
  component: Stars,
});

function Stars() {
  const me = useQuery(api.users.me) as Doc<"users"> | null | undefined;
  const skills =
    (useQuery(api.stars.listByUser, me ? { userId: me._id, limit: 50 } : "skip") as
      | PublicSkill[]
      | undefined) ?? [];

  if (!me) {
    return (
      <main className="section">
        <div className="card">Sign in to see your highlights.</div>
      </main>
    );
  }

  return (
    <main className="section">
      <h1 className="section-title">Saved AI Talent</h1>
      <p className="section-subtitle">AI Talent you've saved for quick access.</p>
      <div className="grid">
        {skills.length === 0 ? (
          <div className="card">No saved talent yet.</div>
        ) : (
          skills.map((skill) => (
            <SkillCard
              key={skill._id}
              skill={skill}
              summaryFallback="Agent-ready AI Talent pack."
              meta={null}
            />
          ))
        )}
      </div>
    </main>
  );
}
