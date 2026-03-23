import { useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { api } from "../../../convex/_generated/api";
import { convexHttp } from "../../convex/client";
import { parseDir, parseSort, toListSort, type SortDir, type SortKey } from "./-params";
import type { SkillListEntry, SkillSearchEntry } from "./-types";

const pageSize = 25;

export type SkillsSearchState = {
  q?: string;
  sort?: SortKey;
  dir?: SortDir;
  focus?: "search";
  category?: string;
};

type SkillsNavigate = (options: {
  search: (prev: SkillsSearchState) => SkillsSearchState;
  replace?: boolean;
}) => void | Promise<void>;

type ListStatus = "loading" | "idle" | "loadingMore" | "done";

export function useSkillsBrowseModel({
  search,
  navigate,
  searchInputRef,
}: {
  search: SkillsSearchState;
  navigate: SkillsNavigate;
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState(search.q ?? "");
  const [searchResults, setSearchResults] = useState<Array<SkillSearchEntry>>([]);
  const [searchLimit, setSearchLimit] = useState(pageSize);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequest = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const navigateTimer = useRef<number>(0);

  const activeCategory = search.category ?? "all";
  const searchSkills = useAction(api.search.searchSkills);

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const hasQuery = trimmedQuery.length > 0;
  const sort: SortKey =
    search.sort === "relevance" && !hasQuery
      ? "downloads"
      : (search.sort ?? (hasQuery ? "relevance" : "downloads"));
  const listSort = toListSort(sort);
  const dir = parseDir(search.dir, sort);
  const searchKey = trimmedQuery ? trimmedQuery : "";

  // One-shot paginated fetches (no reactive subscription)
  const [listResults, setListResults] = useState<SkillListEntry[]>([]);
  const [listCursor, setListCursor] = useState<string | null>(null);
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const fetchGeneration = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | null, generation: number) => {
      try {
        const result = await convexHttp.query(api.skills.listPublicPageV4, {
          cursor: cursor ?? undefined,
          numItems: pageSize,
          sort: listSort,
          dir,
          highlightedOnly: false,
          nonSuspiciousOnly: false,
        });
        if (generation !== fetchGeneration.current) return;
        setListResults((prev) => (cursor ? [...prev, ...result.page] : result.page));
        const canAdvance = result.hasMore && result.nextCursor != null;
        setListCursor(canAdvance ? result.nextCursor : null);
        setListStatus(canAdvance ? "idle" : "done");
      } catch (err) {
        if (generation !== fetchGeneration.current) return;
        console.error("Failed to fetch skills page:", err);
        setListStatus(cursor ? "idle" : "done");
      }
    },
    [listSort, dir],
  );

  // Reset and fetch first page when sort/dir/filters change
  useEffect(() => {
    if (hasQuery) return;
    fetchGeneration.current += 1;
    const generation = fetchGeneration.current;
    setListResults([]);
    setListCursor(null);
    setListStatus("loading");
    void fetchPage(null, generation);
  }, [hasQuery, fetchPage]);

  const isLoadingList = listStatus === "loading";
  const canLoadMoreList = listStatus === "idle";
  const isLoadingMoreList = listStatus === "loadingMore";

  useEffect(() => {
    window.clearTimeout(navigateTimer.current);
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    if (search.focus === "search" && searchInputRef.current) {
      searchInputRef.current.focus();
      void navigate({ search: (prev) => ({ ...prev, focus: undefined }), replace: true });
    }
  }, [navigate, search.focus, searchInputRef]);

  useEffect(() => {
    if (!searchKey) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setSearchResults([]);
    setSearchLimit(pageSize);
  }, [searchKey]);

  useEffect(() => {
    if (!hasQuery) return;
    searchRequest.current += 1;
    const requestId = searchRequest.current;
    setIsSearching(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = (await searchSkills({
            query: trimmedQuery,
            highlightedOnly: false,
            nonSuspiciousOnly: false,
            limit: searchLimit,
          })) as Array<SkillSearchEntry>;
          if (requestId === searchRequest.current) {
            setSearchResults(data);
          }
        } finally {
          if (requestId === searchRequest.current) {
            setIsSearching(false);
          }
        }
      })();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [hasQuery, searchLimit, searchSkills, trimmedQuery]);

  const baseItems = useMemo(() => {
    if (hasQuery) {
      return searchResults.map((entry) => ({
        skill: entry.skill,
        latestVersion: entry.version,
        ownerHandle: entry.ownerHandle ?? null,
        owner: entry.owner ?? null,
        searchScore: entry.score,
      }));
    }
    return listResults;
  }, [hasQuery, listResults, searchResults]);

  // Client-side sort: always sort results (both search and list modes)
  const sorted = useMemo(() => {
    const multiplier = dir === "asc" ? 1 : -1;
    const results = [...baseItems];
    results.sort((a, b) => {
      const tieBreak = () => {
        const updated = ((a.skill.updatedAt ?? 0) - (b.skill.updatedAt ?? 0)) * multiplier;
        if (updated !== 0) return updated;
        return (a.skill.slug ?? "").localeCompare(b.skill.slug ?? "");
      };
      switch (sort) {
        case "relevance":
          return ((a.searchScore ?? 0) - (b.searchScore ?? 0)) * multiplier;
        case "rating":
          return (
            ((a.skill.rating ?? 0) - (b.skill.rating ?? 0)) * multiplier || tieBreak()
          );
        case "downloads":
          return (
            ((a.skill.statsDownloads ?? a.skill.stats?.downloads ?? 0) -
              (b.skill.statsDownloads ?? b.skill.stats?.downloads ?? 0)) *
              multiplier || tieBreak()
          );
        case "trending":
          return (
            ((a.skill.trendingScore ?? 0) - (b.skill.trendingScore ?? 0)) * multiplier ||
            tieBreak()
          );
        case "newest":
          return (
            ((a.skill.createdAt ?? a.skill._creationTime ?? 0) - (b.skill.createdAt ?? b.skill._creationTime ?? 0)) * multiplier ||
            a.skill.slug.localeCompare(b.skill.slug)
          );
        case "name":
          return (
            (a.skill.displayName.localeCompare(b.skill.displayName) ||
              a.skill.slug.localeCompare(b.skill.slug)) * multiplier
          );
        default:
          return (
            (a.skill.createdAt - b.skill.createdAt) * multiplier ||
            a.skill.slug.localeCompare(b.skill.slug)
          );
      }
    });
    return results;
  }, [baseItems, dir, sort]);

  // Category filter applied after sort
  const filteredSorted = useMemo(() => {
    if (!activeCategory || activeCategory === "all") return sorted;
    return sorted.filter((item) => {
      const skill = item.skill as { category?: string; categories?: string[] };
      if (skill.categories && skill.categories.includes(activeCategory)) return true;
      if (skill.category === activeCategory) return true;
      return false;
    });
  }, [sorted, activeCategory]);

  const isLoadingSkills = hasQuery ? isSearching && searchResults.length === 0 : isLoadingList;
  const canLoadMore = hasQuery
    ? !isSearching && searchResults.length === searchLimit && searchResults.length > 0
    : canLoadMoreList;
  const isLoadingMore = hasQuery ? isSearching && searchResults.length > 0 : isLoadingMoreList;
  const canAutoLoad = typeof IntersectionObserver !== "undefined";

  const loadMore = useCallback(() => {
    if (loadMoreInFlightRef.current || isLoadingMore || !canLoadMore) return;
    loadMoreInFlightRef.current = true;
    if (hasQuery) {
      setSearchLimit((value) => value + pageSize);
    } else {
      setListStatus("loadingMore");
      void fetchPage(listCursor, fetchGeneration.current);
    }
  }, [canLoadMore, fetchPage, hasQuery, isLoadingMore, listCursor]);

  useEffect(() => {
    if (!isLoadingMore) {
      loadMoreInFlightRef.current = false;
    }
  }, [isLoadingMore]);

  useEffect(() => {
    if (!canLoadMore || typeof IntersectionObserver === "undefined") return;
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  useEffect(() => {
    return () => window.clearTimeout(navigateTimer.current);
  }, []);

  const onQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      window.clearTimeout(navigateTimer.current);
      const trimmed = next.trim();
      navigateTimer.current = window.setTimeout(() => {
        void navigate({
          search: (prev) => {
            const hadQuery = typeof prev.q === "string" && prev.q.trim().length > 0;
            const enteringSearch = Boolean(trimmed) && !hadQuery;
            const usesImplicitBrowseDefault = prev.sort === "downloads" && prev.dir === undefined;

            return {
              ...prev,
              q: trimmed ? next : undefined,
              ...(enteringSearch && usesImplicitBrowseDefault
                ? {
                    sort: undefined,
                    dir: undefined,
                  }
                : null),
            };
          },
          replace: true,
        });
      }, 220);
    },
    [navigate],
  );

  const onSortChange = useCallback(
    (value: string) => {
      const nextSort = parseSort(value);
      void navigate({
        search: (prev) => ({
          ...prev,
          sort: nextSort,
          dir: parseDir(prev.dir, nextSort),
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const onToggleDir = useCallback(() => {
    void navigate({
      search: (prev) => ({
        ...prev,
        dir: parseDir(prev.dir, sort) === "asc" ? "desc" : "asc",
      }),
      replace: true,
    });
  }, [navigate, sort]);

  const onCategoryChange = useCallback(
    (category: string) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          category: category === "all" ? undefined : category,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  return {
    activeCategory,
    canAutoLoad,
    canLoadMore,
    dir,
    filteredSorted,
    hasQuery,
    isLoadingMore,
    isLoadingSkills,
    loadMore,
    loadMoreRef,
    onCategoryChange,
    onQueryChange,
    onSortChange,
    onToggleDir,
    query,
    sort,
    sorted: filteredSorted,
  };
}
