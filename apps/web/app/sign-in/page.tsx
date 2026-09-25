import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appName } from "@omnidoc/contracts";
import { LoginForm } from "@omnidoc/ui";
import { signInAction } from "../lib/identity/actions";
import { safeNextPath } from "../lib/identity/constants";
import { resolveSignInGate } from "../lib/identity/session";

export const metadata: Metadata = {
  title: `Sign in — ${appName}`,
};

/**
 * Sign-in route (F-03).
 *
 * Outside the `(app)` route group on purpose, so it renders without the
 * authenticated shell and cannot nest inside it. `(app)/layout.tsx` sends
 * visitors whose session was rejected here, and the proxy sends cookie-less
 * visitors here; both pass the page they wanted as `next`.
 *
 * Whether to skip the form is decided by `resolveSignInGate`, which asks the
 * API — never by whether a session cookie exists. The proxy leaves this route
 * alone for exactly that reason: deciding it in two places, from two different
 * kinds of evidence, is what made a stale cookie an infinite loop.
 *
 * `next` arrives from the URL, so it is re-validated here with `safeNextPath`
 * before it reaches the form (and again, as a destination, inside the gate).
 * Without that, `?next=https://evil.example` would turn sign-in into an open
 * redirect. The server action validates it again on submit — the form input is
 * a convenience, never the authority.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(requested);

  const gate = await resolveSignInGate(next);
  if (gate.status === "redirect") {
    redirect(gate.destination);
  }

  return (
    <main>
      <LoginForm action={signInAction} next={next} appName={appName} />
    </main>
  );
}
