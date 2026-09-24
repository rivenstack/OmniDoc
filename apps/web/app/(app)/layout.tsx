import type { Workspace } from "@omnidoc/ui";
import { AppShell } from "./shell";
import type { ShellUser } from "./nav-user";

/**
 * Render-only placeholder workspaces for the F-02 shell.
 *
 * This is **not** a fixture authority and **not** live data: the F-02 slice is
 * props-only (`@omnidoc/contracts` types, no fetching). S-03 fixtures / B-03
 * identity replace this when the MSW wiring slice lands. One real workspace
 * plus the separated, labelled sample keeps the switcher honest at n≈1.
 */
const placeholderWorkspaces: Workspace[] = [
  {
    id: "ws_local_primary",
    tenantId: "tenant_local",
    name: "My workspace",
  },
  {
    id: "ws_sample_demo",
    tenantId: "tenant_public_sample",
    name: "Sample — public demo notes",
  },
];

const sampleWorkspaceIds = ["ws_sample_demo"];

/**
 * Render-placeholder identity until F-03 wires the session principal.
 * The `NavUser` block renders from this; the Sign out item only appears once
 * F-03 provides a handler that can act.
 */
const placeholderUser: ShellUser = { name: "Local user" };

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      workspaces={placeholderWorkspaces}
      sampleWorkspaceIds={sampleWorkspaceIds}
      user={placeholderUser}
    >
      {children}
    </AppShell>
  );
}
