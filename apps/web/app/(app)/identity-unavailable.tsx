import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@omnidoc/ui";

/**
 * Shell entry — identity service unreachable.
 *
 * A third entry state, distinct from both "signed in" and "signed out". The
 * session could not be read at all, so the app must not guess: sending the user
 * to sign-in would imply the session was rejected (nobody asked), and rendering
 * the shell would imply membership that was never confirmed.
 *
 * Copy is deliberately plain and non-alarming: nothing was changed, and no
 * credential was involved.
 */
export function IdentityUnavailable() {
  return (
    <main
      id="content"
      className="flex min-h-dvh items-center justify-center px-4"
    >
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Can&rsquo;t reach the session service</EmptyTitle>
          <EmptyDescription>
            Your session could not be confirmed, so nothing is shown and nothing
            was changed. This is usually temporary — reload the page to try
            again.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
