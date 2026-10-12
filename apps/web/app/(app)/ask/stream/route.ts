import { readAskRouteContext } from "../../../lib/ask/ask-loader";
import { handleAskRequest } from "../../../lib/ask/ask-run";

/**
 * Ask stream proxy — the only way the browser reaches the answer stream.
 *
 * The Java API's origin and the session cookies are server-only, so the browser
 * posts its question here (same-origin) and this handler opens the upstream SSE
 * stream, re-authorizes the workspace from the **session** (never the body), and
 * pipes validated frames back.
 *
 * It is a route handler, not a page: layouts do not run for handlers, so the
 * session is resolved here. All of the decision logic lives in
 * `lib/ask/ask-run.ts` (`handleAskRequest`) where it is tested with an injected
 * port; this file is only the `next/headers` + `request.signal` adapter.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  const { jar, session } = await readAskRouteContext();
  return handleAskRequest({
    session,
    jar,
    body,
    signal: request.signal,
  });
}
