import { redirect } from "next/navigation";

/**
 * App home. Inbox is the default unfiled home (`system-ux.md` §1), so `/`
 * redirects there. The shell lives in the `(app)` group layout.
 */
export default function AppHomePage() {
  redirect("/inbox");
}
