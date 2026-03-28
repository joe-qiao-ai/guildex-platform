import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { Menu, Monitor, Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { getUserFacingConvexError } from "../lib/convexError";
import { gravatarUrl } from "../lib/gravatar";
import { isModerator } from "../lib/roles";
import { getSiteMode } from "../lib/site";
import { applyTheme, useThemeMode } from "../lib/theme";
import { startThemeTransition } from "../lib/theme-transition";
import { setAuthError, useAuthError } from "../lib/useAuthError";
import { useAuthStatus } from "../lib/useAuthStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Header() {
  const { isAuthenticated, isLoading, me } = useAuthStatus();
  const { signIn, signOut } = useAuthActions();
  const { mode, setMode } = useThemeMode();
  const toggleRef = useRef<HTMLDivElement | null>(null);
  const siteMode = getSiteMode();
  void siteMode; // Guild is always skills mode visually

  const avatar = me?.image ?? (me?.email ? gravatarUrl(me.email) : undefined);
  const handle = me?.handle ?? me?.displayName ?? "user";
  const initial = (me?.displayName ?? me?.name ?? handle).charAt(0).toUpperCase();
  const isStaff = isModerator(me);
  const { error: authError, clear: clearAuthError } = useAuthError();
  const signInRedirectTo = getCurrentRelativeUrl();

  const setTheme = (next: "system" | "light" | "dark") => {
    startThemeTransition({
      nextTheme: next,
      currentTheme: mode,
      setTheme: (value) => {
        const nextMode = value as "system" | "light" | "dark";
        applyTheme(nextMode);
        setMode(nextMode);
      },
      context: { element: toggleRef.current },
    });
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link
          to="/"
          search={{ q: undefined, highlighted: undefined, search: undefined }}
          className="brand"
        >
          <span className="brand-mark" aria-hidden="true" />
          <span
            className="brand-name"
            style={{
              background: "linear-gradient(90deg, #ffffff 0%, #a5b4fc 60%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Guildex
          </span>
        </Link>
        <nav className="nav-links">
          <Link
            to="/skills"
            search={{
              q: undefined,
              sort: undefined,
              dir: undefined,
              focus: undefined,
            }}
          >
            AI Talent
          </Link>
          <Link to="/upload" search={{ updateSlug: undefined }}>
            Upload
          </Link>
          {me ? <Link to="/stars">Saved</Link> : null}
          {isStaff ? (
            <Link to="/management" search={{ skill: undefined }}>
              Management
            </Link>
          ) : null}
        </nav>
        <div className="nav-actions">
          <div className="nav-mobile">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="nav-mobile-trigger" type="button" aria-label="Open menu">
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to="/skills"
                    search={{
                      q: undefined,
                      sort: undefined,
                      dir: undefined,
                      focus: undefined,
                    }}
                  >
                    AI Talent
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/upload" search={{ updateSlug: undefined }}>
                    Upload
                  </Link>
                </DropdownMenuItem>
                {me ? (
                  <DropdownMenuItem asChild>
                    <Link to="/stars">Saved</Link>
                  </DropdownMenuItem>
                ) : null}
                {isStaff ? (
                  <DropdownMenuItem asChild>
                    <Link to="/management" search={{ skill: undefined }}>
                      Management
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                  System
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  Dark
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isAuthenticated && me ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="user-trigger" type="button">
                  {avatar ? (
                    <img src={avatar} alt={me.displayName ?? me.name ?? "User avatar"} />
                  ) : (
                    <span className="user-menu-fallback">{initial}</span>
                  )}
                  <span className="mono">@{handle}</span>
                  <span className="user-menu-chevron">▾</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {authError ? (
                <div className="error" role="alert" style={{ fontSize: "0.85rem", marginRight: 8 }}>
                  {authError}{" "}
                  <button
                    type="button"
                    onClick={clearAuthError}
                    aria-label="Dismiss"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      padding: "0 2px",
                    }}
                  >
                    &times;
                  </button>
                </div>
              ) : null}
              <button
                className="btn btn-primary"
                type="button"
                disabled={isLoading}
                onClick={() => {
                  clearAuthError();
                  void signIn(
                    "github",
                    signInRedirectTo ? { redirectTo: signInRedirectTo } : undefined,
                  ).catch((error) => {
                    setAuthError(
                      getUserFacingConvexError(error, "Sign in failed. Please try again."),
                    );
                  });
                }}
              >
                <span className="sign-in-label">Sign in</span>
                <span className="sign-in-provider">with GitHub</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getCurrentRelativeUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
