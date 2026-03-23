import { lazy, Suspense } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { SkillVersionsPanel } from "./SkillVersionsPanel";

const SkillFilesPanel = lazy(() =>
  import("./SkillFilesPanel").then((module) => ({ default: module.SkillFilesPanel })),
);

type SkillFile = Doc<"skillVersions">["files"][number];

type SkillDetailTabsProps = {
  activeTab: "files" | "compare" | "versions";
  setActiveTab: (tab: "files" | "compare" | "versions") => void;
  onCompareIntent?: () => void;
  readmeContent: string | null;
  readmeError: string | null;
  latestFiles: SkillFile[];
  latestVersionId: Id<"skillVersions"> | null;
  skill: Doc<"skills">;
  diffVersions?: Doc<"skillVersions">[] | undefined;
  versions: Doc<"skillVersions">[] | undefined;
  nixPlugin: boolean;
  suppressVersionScanResults: boolean;
  scanResultsSuppressedMessage: string | null;
};

export function SkillDetailTabs({
  activeTab,
  setActiveTab,
  readmeContent,
  readmeError,
  latestFiles,
  latestVersionId,
  skill,
  versions,
  nixPlugin,
  suppressVersionScanResults,
  scanResultsSuppressedMessage,
}: SkillDetailTabsProps) {
  return (
    <div className="card tab-card">
      <div className="tab-header">
        <button
          className={`tab-button${activeTab === "files" ? " is-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("files")}
        >
          Files
        </button>
        {/* Compare tab hidden — AI Twins don't have real version diffs */}
        <button
          className={`tab-button${activeTab === "versions" ? " is-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("versions")}
        >
          Versions
        </button>
      </div>

      {activeTab === "files" ? (
        <Suspense fallback={<div className="tab-body stat">Loading file viewer…</div>}>
          <SkillFilesPanel
            versionId={latestVersionId}
            readmeContent={readmeContent}
            readmeError={readmeError}
            latestFiles={latestFiles}
            skill={skill}
          />
        </Suspense>
      ) : null}

      {activeTab === "versions" ? (
        <SkillVersionsPanel
          versions={versions}
          nixPlugin={nixPlugin}
          skillSlug={skill.slug}
          suppressScanResults={suppressVersionScanResults}
          suppressedMessage={scanResultsSuppressedMessage}
        />
      ) : null}
    </div>
  );
}
