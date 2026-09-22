/**
 * Shell barrel — D-01 component inventory §1–§2 (F-02).
 *
 * Copied-in / project-owned components for the authenticated app shell and the
 * honest workspace chrome (REC-18). They consume D-01 semantic tokens only and
 * never import a provider SDK, Spring/Java types, or `packages/mocks`
 * production paths (inventory §13).
 *
 * Contract shapes come from `@omnidoc/contracts` (S-02, generated from
 * `docs/api/openapi.yaml`) and are re-exported as types from `./types` — never
 * re-declared. Components receive data through props and perform no fetching.
 */
export * from "./types";
export * from "./copy";

export { SkipLink, type SkipLinkProps } from "./skip-link";
export { AppShell, type AppShellProps } from "./app-shell";
export {
  Sidebar,
  SidebarNavItem,
  type SidebarProps,
  type SidebarNavItemProps,
} from "./sidebar";
export { MobileTabBar, type MobileTabBarProps } from "./mobile-tab-bar";
export { TopBar, type TopBarProps } from "./top-bar";
export { PageHeader, type PageHeaderProps } from "./page-header";
export {
  CommandPalette,
  type CommandPaletteProps,
} from "./command-palette";
export {
  ContentRegion,
  ContentRegionRetry,
  type ContentRegionProps,
  type ContentRegionError,
  type ContentRegionEmpty,
} from "./content-region";
export {
  WorkspaceSwitcher,
  WorkspaceSwitcherItem,
  SoloWorkspaceBadge,
  type WorkspaceSwitcherProps,
  type WorkspaceSwitcherItemProps,
} from "./workspace-switcher";
export {
  MembersPanel,
  MemberRow,
  type MembersPanelProps,
  type MemberRowProps,
} from "./members-panel";
export { ThemeToggle, type ThemeToggleProps } from "./theme-toggle";
