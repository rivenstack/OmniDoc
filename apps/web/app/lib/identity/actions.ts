"use server";

/**
 * Identity server actions — the only place the app mutates session state.
 *
 * Actions run on the Next server, so they can talk to the API and write
 * cookies, and the browser never needs CORS or a client auth library
 * (ADR-0001 §6 / ADR-0005). Membership is always re-read from the server: no
 * decision here trusts a value the client sent.
 * Authorship note: a `"use server"` module may only export async functions,
 * which is why the shared path constants live in `./constants` instead of here.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { LoginFailure, LoginFormState } from "@omnidoc/ui";

import {
  DEFAULT_AUTHENTICATED_PATH,
  SESSION_COOKIE_NAME,
  SIGN_IN_PATH,
  WORKSPACE_SELECTOR_COOKIE_NAME,
  safeNextPath,
} from "./constants";
import { relayedCookieNames, relayedIdentityCookies } from "./cookies";
import {
  apiOrigin,
  createSession,
  deleteSession,
  readWorkspaces,
  type SignInOutcome,
} from "./identity-api";
import { readIdentityJar } from "./session";
import { isSelectableWorkspace } from "./workspace-selection";

/**
 * Translate a port outcome into the failure the form renders.
 *
 * `null` means "no failure"; the caller only reaches that branch on success,
 * which redirects, so the form never renders a null state.
 */
function toLoginFailure(outcome: SignInOutcome): LoginFailure | null {
  switch (outcome.status) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "invalid_request":
      return "invalid_request";
    case "unsupported":
      return "unsupported";
    case "unavailable":
      return "unavailable";
    default:
      return null;
  }
}

/**
 * Sign in.
 *
 * Shaped for `useActionState`, so the form gets its pending and failure states
 * from React and the submit still works as a plain form post before hydration.
 * On success this redirects (so it never returns a success value); on failure it
 * returns the kind, which the form turns into a message.
 *
 * The API performs the authentication. The empty-field check is a convenience
 * for the visible form only — it is never treated as authority.
 */
export async function signInAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return "invalid_request";
  }

  const outcome = await createSession({ email, password });
  const failure = toLoginFailure(outcome);
  if (failure) {
    return failure;
  }
  if (outcome.status !== "authenticated") {
    return "unavailable";
  }

  const relayed = relayedIdentityCookies(outcome.setCookieHeaders, apiOrigin());
  const session = relayed.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
  if (!session) {
    // The API claimed a session but did not hand one over. Reporting success
    // would put the user in a shell that immediately bounces back here, so this
    // is a transport-level failure instead.
    return "unavailable";
  }

  const store = await cookies();
  for (const cookie of relayed) {
    store.set(cookie.name, cookie.value, cookie.options);
  }

  revalidatePath("/", "layout");
  redirect(next ?? DEFAULT_AUTHENTICATED_PATH);
}

/**
 * Sign out.
 *
 * The local cookies are cleared whether or not the API confirms revocation: the
 * user asked to leave, and keeping a session cookie the browser already handed
 * over would be worse. Revocation is best-effort — if the API is unreachable
 * the server-side session survives until its own timeout, which is recorded as
 * a known limitation in the F-03 handoff outcome.
 */
export async function signOutAction(): Promise<void> {
  const jar = await readIdentityJar();
  if (jar.session) {
    await deleteSession(jar);
  }

  const store = await cookies();
  for (const name of relayedCookieNames()) {
    store.delete(name);
  }
  store.delete(WORKSPACE_SELECTOR_COOKIE_NAME);

  revalidatePath("/", "layout");
  redirect(SIGN_IN_PATH);
}

/**
 * Remember which workspace the user selected.
 *
 * The id is checked against the server-resolved membership list first, so the
 * frontend cannot invent a selection the session has no membership for. The
 * API still re-binds membership on every request — this cookie is a selector,
 * never a grant (`architecture.md` §2).
 */
export async function selectWorkspaceAction(workspaceId: string): Promise<void> {
  if (!workspaceId) {
    return;
  }

  const jar = await readIdentityJar();
  const lookup = await readWorkspaces(jar, workspaceId);
  if (lookup.status !== "resolved" || !isSelectableWorkspace(lookup.workspaces, workspaceId)) {
    return;
  }

  const store = await cookies();
  store.set(WORKSPACE_SELECTOR_COOKIE_NAME, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/", "layout");
}
