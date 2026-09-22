import { AppShellHost } from "../shell/app-shell-host";

/**
 * Authenticated route-group layout — F-02 deliverable 2.
 *
 * The app shell lives here, not in the root layout, so that routes which must
 * *not* be wrapped in authenticated chrome (sign-in, the re-auth prompt F-03
 * owns) can sit outside this group without a later restructure. Route groups do
 * not affect URLs, so this is still `/`.
 *
 * The root layout keeps `<html lang dir>`, `DirectionProvider`, and
 * `ThemeProvider` — this file adds only the shell.
 */
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellHost>{children}</AppShellHost>;
}
