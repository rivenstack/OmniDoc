import type { Metadata } from "next";
import { appName } from "@omnidoc/contracts";
import { LoginForm } from "@omnidoc/ui";
import { signInAction } from "../lib/identity/actions";
import { safeNextPath } from "../lib/identity/constants";

export const metadata: Metadata = {
  title: `Sign in — ${appName}`,
};

/**
 * Sign-in route (F-03).
 *
 * Outside the `(app)` route group on purpose, so it renders without the
 * authenticated shell and cannot nest inside it. The proxy sends cookie-less
 * visitors here and `(app)/layout.tsx` sends visitors whose session was
 * rejected; both pass the page they wanted as `next`.
 *
 * `next` arrives from the URL, so it is re-validated here with `safeNextPath`
 * before it reaches the form. Without that, `?next=https://evil.example` would
 * turn sign-in into an open redirect. The server action validates it again on
 * submit — the form input is a convenience, never the authority.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <main>
      <LoginForm
        action={signInAction}
        next={safeNextPath(requested)}
        appName={appName}
      />
    </main>
  );
}
