import { redirect } from "next/navigation";
import { selectWorkspaceAction, signOutAction } from "../lib/identity/actions";
import { signInHref } from "../lib/identity/constants";
import { getShellSession, readRequestedPath } from "../lib/identity/session";
import { IdentityUnavailable } from "./identity-unavailable";
import { AppShell } from "./shell";

/**
 * Authenticated shell entry — the session-aware boundary.
 *
 * The session is read through the identity port (ADR-0001 §6 keeps the port;
 * ADR-0005 makes the implementation Spring Security HTTP-only session cookies
 * in the Java API). Three outcomes are kept distinct:
 *
 * - authenticated → the F-02 shell, with **server-resolved** workspaces
 * - unauthenticated → sign-in, remembering the page the user was headed for
 * - identity service unreachable → an honest "could not confirm" screen, never
 *   a sign-in form the user cannot use and never a shell that would imply
 *   membership nobody verified
 *
 * Workspace membership is never resolved here from client input: the selector
 * is a preference over the list the server returns (`architecture.md` §2).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getShellSession();

  if (session.status === "unauthenticated") {
    redirect(signInHref(await readRequestedPath()));
  }

  if (session.status === "unavailable") {
    return <IdentityUnavailable />;
  }

  return (
    <AppShell
      principal={session.principal}
      workspaces={session.workspaces}
      workspacesUnavailable={session.workspacesUnavailable}
      sampleWorkspaceIds={session.sampleWorkspaceIds}
      currentWorkspaceId={session.currentWorkspaceId}
      onSignOut={signOutAction}
      onSelectWorkspace={selectWorkspaceAction}
    >
      {children}
    </AppShell>
  );
}
