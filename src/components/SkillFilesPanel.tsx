import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type SkillFile = Doc<"skillVersions">["files"][number];

type SkillFilesPanelProps = {
  versionId: Id<"skillVersions"> | null;
  readmeContent: string | null;
  readmeError: string | null;
  latestFiles: SkillFile[];
  skill?: Doc<"skills">;
};

export function SkillFilesPanel({
  readmeContent,
  readmeError,
  skill,
}: SkillFilesPanelProps) {
  // Build AI Twin profile content from enriched DB fields
  const hasPersonaData = skill && (skill.bio ?? skill.personality ?? skill.keyQuote ?? skill.coreSkills);

  if (hasPersonaData) {
    const sections: string[] = [];

    if (skill.bio) {
      sections.push(`# ${skill.displayName}\n\n${skill.bio}`);
    }

    if (skill.personality) {
      sections.push(`## Personality\n\n${skill.personality}`);
    }

    if (skill.keyQuote ?? skill.featuredQuote) {
      sections.push(`## Featured Quote\n\n> "${skill.keyQuote ?? skill.featuredQuote}"`);
    }

    if (skill.coreSkills && skill.coreSkills.length > 0) {
      sections.push(`## Core Skills\n\n${skill.coreSkills.map((s) => `- ${s}`).join("\n")}`);
    }

    if (skill.careerHighlights && skill.careerHighlights.length > 0) {
      sections.push(`## Career Highlights\n\n${skill.careerHighlights.map((h) => `- ${h}`).join("\n")}`);
    }

    const personaContent = sections.join("\n\n");

    return (
      <div className="tab-body">
        <div>
          <h2 className="section-title" style={{ fontSize: "1.2rem", margin: 0 }}>
            AI Talent Profile
          </h2>
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{personaContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: show SOUL.md content from the README field
  return (
    <div className="tab-body">
      <div>
        <h2 className="section-title" style={{ fontSize: "1.2rem", margin: 0 }}>
          SOUL.md
        </h2>
        <div className="markdown">
          {readmeContent ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeContent}</ReactMarkdown>
          ) : readmeError ? (
            <div className="stat">Failed to load SOUL.md: {readmeError}</div>
          ) : (
            <div>Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
