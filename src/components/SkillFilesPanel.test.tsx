import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { SkillFilesPanel } from "./SkillFilesPanel";

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("remark-gfm", () => ({
  default: {},
}));

type SkillFile = Doc<"skillVersions">["files"][number];

function makeFile(path: string, size: number): SkillFile {
  return { path, size } as unknown as SkillFile;
}

describe("SkillFilesPanel", () => {
  it("shows persona profile when skill has enriched data", () => {
    const skill = {
      displayName: "Naval Ravikant",
      bio: "Investor, philosopher, and founder of AngelList.",
      personality: "Direct. Principled. First-principles thinker.",
      keyQuote: "Seek wealth, not money or status.",
      coreSkills: ["Angel investing", "Startups", "Philosophy"],
    } as unknown as Doc<"skills">;

    render(
      <SkillFilesPanel
        versionId={"skillVersions:1" as Id<"skillVersions">}
        readmeContent={"# skill"}
        readmeError={null}
        latestFiles={[makeFile("SOUL.md", 10)]}
        skill={skill}
      />,
    );

    expect(screen.getByText("Persona Profile")).toBeDefined();
    expect(screen.getByText(/Naval Ravikant/)).toBeDefined();
  });

  it("falls back to SOUL.md readme content when no persona data", () => {
    render(
      <SkillFilesPanel
        versionId={"skillVersions:1" as Id<"skillVersions">}
        readmeContent={"# My Skill\n\nSome content here."}
        readmeError={null}
        latestFiles={[makeFile("SOUL.md", 10)]}
      />,
    );

    expect(screen.getByText("SOUL.md")).toBeDefined();
  });

  it("shows error state when readme fails to load and no persona data", () => {
    render(
      <SkillFilesPanel
        versionId={"skillVersions:1" as Id<"skillVersions">}
        readmeContent={null}
        readmeError={"Network error"}
        latestFiles={[]}
      />,
    );

    expect(screen.getByText(/Failed to load SOUL.md/)).toBeDefined();
  });
});
