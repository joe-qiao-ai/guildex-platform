import { useEffect, useRef, useState, type RefObject } from "react";
import { type SortKey } from "./-params";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "downloads", label: "Most Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Legends", label: "Legends" },
  { value: "Tech & AI", label: "Tech & AI" },
  { value: "Engineering", label: "Engineering" },
  { value: "Marketing", label: "Marketing" },
  { value: "Product & Strategy", label: "Product & Strategy" },
  { value: "Leadership & Change", label: "Leadership" },
  { value: "Sales & Support", label: "Sales" },
  { value: "Academic & Specialized", label: "Academic" },
  { value: "Philosophy & Wisdom", label: "Philosophy" },
  { value: "Health & Wellness", label: "Health" },
  { value: "Creative Arts", label: "Creative Arts" },
];

type SkillsToolbarProps = {
  searchInputRef: RefObject<HTMLInputElement | null>;
  query: string;
  hasQuery: boolean;
  sort: SortKey;
  activeCategory: string;
  onQueryChange: (next: string) => void;
  onSortChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

export function SkillsToolbar({
  searchInputRef,
  query,
  hasQuery,
  sort,
  activeCategory,
  onQueryChange,
  onSortChange,
  onCategoryChange,
}: SkillsToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSort = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
  const displaySort = hasQuery && sort === "relevance" ? "Relevance" : currentSort.label;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div className="skills-toolbar-v2">
      {/* Row 1: Search + Sort */}
      <div className="skills-toolbar-row1">
        <div className="skills-search-wrap">
          <span className="skills-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={searchInputRef}
            className="skills-search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by name, expertise, or specialty..."
            autoComplete="off"
          />
        </div>

        {/* Sort dropdown */}
        <div className="skills-sort-dropdown" ref={dropdownRef}>
          <button
            className="skills-sort-btn"
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span>{displaySort}</span>
            <span className="skills-sort-chevron" aria-hidden="true">
              {dropdownOpen ? "▲" : "▼"}
            </span>
          </button>

          {dropdownOpen && (
            <div className="skills-sort-menu" role="listbox" aria-label="Sort options">
              {hasQuery && (
                <button
                  className={`skills-sort-option${sort === "relevance" ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={sort === "relevance"}
                  onClick={() => {
                    onSortChange("relevance");
                    setDropdownOpen(false);
                  }}
                >
                  {sort === "relevance" && <span className="skills-sort-check">✓</span>}
                  <span>Relevance</span>
                </button>
              )}
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`skills-sort-option${sort === opt.value ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={sort === opt.value}
                  onClick={() => {
                    onSortChange(opt.value);
                    setDropdownOpen(false);
                  }}
                >
                  {sort === opt.value && <span className="skills-sort-check">✓</span>}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Category pills */}
      <div className="skills-category-pills" role="tablist" aria-label="Filter by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`skills-category-pill${activeCategory === cat.value ? " is-active" : ""}`}
            role="tab"
            aria-selected={activeCategory === cat.value}
            type="button"
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
