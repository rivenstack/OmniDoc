"use client";

import { useActionState } from "react";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconNotebook,
} from "@tabler/icons-react";
import { Button } from "../components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Checkbox } from "../components/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "../components/field";
import { Input } from "../components/input";
import { Spinner } from "../components/spinner";
import { cn } from "../lib/utils";

/**
 * Why sign-in failed — the four kinds the form must keep apart.
 *
 * This is the app's authority for these names (see `docs/design/system-ux.md`
 * §2: "the product must be able to tell them apart"). A wrong password and an
 * unreachable identity service are different facts, and `unsupported` is a
 * third: a build with no identity endpoints is neither of those, so it cannot
 * be reported as "check your password".
 */
export type LoginFailure =
  "invalid_credentials" | "invalid_request" | "unsupported" | "unavailable";

/** `null` means the action has not run yet. Success redirects, so it is absent. */
export type LoginFormState = LoginFailure | null;

export const LOGIN_FAILURE_MESSAGES: Record<LoginFailure, string> = {
  invalid_credentials: "That email and password don't match an account.",
  invalid_request: "Enter both your email and your password.",
  unsupported: "This environment has no sign-in service configured.",
  unavailable:
    "The sign-in service could not be reached, so your password was not checked. Try again.",
};

export type LoginFormProps = {
  /**
   * Server action. Owns authentication and the session cookie; the browser
   * never talks to the API and no client auth library is involved
   * (ADR-0001 §6 / ADR-0005).
   */
  action: (
    state: LoginFormState,
    formData: FormData,
  ) => Promise<LoginFormState>;
  /** Same-origin path to return to after signing in. Already validated. */
  next?: string;
  appName?: string;
  className?: string;
};

/**
 * Shell block — `LoginForm` (sign-in / session entry).
 *
 * Layout follows the reference supplied by `@user` (2026-09-24, branch
 * `F03-auth-ui`). Three deliberate departures, all recorded in
 * `docs/design/now.md`:
 *
 * 1. **No third-party assets.** The reference loads its logo and provider icons
 *    from `images.shadcnspace.com`. Those are runtime requests to a host this
 *    project does not control — the same reason fonts are self-hosted — so the
 *    mark is a Tabler glyph and the provider icons are Tabler brand icons.
 * 2. **Unbacked controls are visible but disabled**, per `@user`. Social
 *    sign-in, "Remember this device", password recovery and account creation
 *    have no endpoint in `docs/api/openapi.yaml` (`CreateSessionRequest` is
 *    `email` + `password` only), so `disabled` is the honest rendering. The
 *    account-creation group carries a short note saying so; the social group
 *    deliberately does **not** (`@user`, 2026-09-25) — those are placeholders
 *    for a feature that will arrive later, and the button labels carry the
 *    message. Enabling any of them is a contract change, not a frontend tweak.
 * 3. **The title is the page `h1`** (`CardTitle level={1}`) and the form has a
 *    real `role="alert"` error region, so the outline and the failure state are
 *    usable by assistive tech.
 *
 * `min-h-dvh` replaces the reference's `min-h-screen`: `dvh` accounts for the
 * mobile browser's dynamic toolbars, which matters at ~390px.
 */
export function LoginForm({
  action,
  next,
  appName = "OmniDoc",
  className,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <section
      className={cn(
        "relative flex min-h-dvh items-center justify-center bg-foreground dark:bg-background",
        className,
      )}
    >
      {/*
        Decorative grid texture from `../styles/patterns.css` (`.grid-pattern`).
        Same contract as the arcs below: `aria-hidden` because it carries no
        meaning, `pointer-events-none` so it never swallows a click on the
        card. The asset is effectively opaque, so it renders full-strength like
        the reference: in light mode `patterns.css` filters it to its negative
        (dark paper, light grid lines); in dark mode the original light-toned
        asset shows as-is. The card sits on the opposite polarity of the
        texture in either theme, so its contrast holds (ui-qa-checklist §2).
      */}
      <div
        aria-hidden="true"
        className="grid-pattern pointer-events-none absolute inset-0 mix-blend-screen"
      />

      <div className="relative mx-auto w-full max-w-lg px-4 py-10 sm:px-0 md:py-20">
        <Card className="max-w-lg gap-6 px-6 py-8 sm:p-12">
          <CardHeader className="gap-6 p-0 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <IconNotebook aria-hidden="true" className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle level={1} className="text-2xl font-medium">
                Welcome to {appName}
              </CardTitle>
              <CardDescription className="text-sm font-normal">
                Sign in to your account to continue
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/*
              A real `<form action>`: the submit is a normal form post, so it
              works before hydration and the pending state comes from
              `useActionState` rather than hand-managed state.
            */}
            <form action={formAction} aria-busy={isPending}>
              {/* Carries the post-sign-in destination through the form post. */}
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <FieldGroup className="gap-6">
                <Field className="grid gap-3 md:grid-cols-2 md:gap-6">
                  <Button
                    variant="outline"
                    type="button"
                    disabled
                    className="h-9 gap-2 text-sm text-card-foreground shadow-xs"
                  >
                    <IconBrandGoogle aria-hidden="true" className="size-4" />
                    Sign in with Google
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled
                    className="h-9 gap-2 text-sm text-card-foreground shadow-xs"
                  >
                    <IconBrandGithub aria-hidden="true" className="size-4" />
                    Sign in with Github
                  </Button>
                </Field>
                <FieldSeparator className="bg-transparent text-sm text-muted-foreground *:data-[slot=field-separator-content]:bg-card">
                  <span className="px-4">or sign in with</span>
                </FieldSeparator>
                {/*
                  One `role="alert"` region for the whole form. Announced when
                  it appears, and its text — not a colour — carries the meaning
                  (ui-qa-checklist §2.5, §4.4).
                */}
                {state ? (
                  <FieldDescription
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-start text-sm font-normal text-destructive"
                  >
                    {LOGIN_FAILURE_MESSAGES[state]}
                  </FieldDescription>
                ) : null}
                <div className="flex flex-col gap-4">
                  <Field className="gap-1.5">
                    <FieldLabel
                      htmlFor="email"
                      className="text-sm font-normal text-muted-foreground"
                    >
                      Email*
                    </FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@example.com"
                      required
                      className="h-9 shadow-xs dark:bg-background"
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel
                      htmlFor="password"
                      className="text-sm font-normal text-muted-foreground"
                    >
                      Password*
                    </FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      // `current-password` lets a password manager fill it;
                      // without it browsers guess and sometimes offer the
                      // "new password" flow on a sign-in form.
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      className="h-9 shadow-xs dark:bg-background"
                    />
                  </Field>
                </div>
                {/*
                  `data-disabled` dims the whole row through the field group
                  contract in `field.tsx`, so the label and the link text read
                  as unavailable rather than merely inert.
                */}
                <Field
                  orientation="horizontal"
                  data-disabled="true"
                  className="justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/*
                      `htmlFor` alone would leave the visible box unnamed: Base
                      UI puts the consumer's `id` on its hidden native input, so
                      the label would point at an `aria-hidden` element while the
                      `role="checkbox"` span stayed anonymous. `aria-labelledby`
                      names the control itself; `htmlFor` keeps the native input
                      associated for real browsers.
                    */}
                    <Checkbox
                      id="remember"
                      name="remember"
                      aria-labelledby="remember-label"
                      disabled
                    />
                    <FieldLabel
                      id="remember-label"
                      htmlFor="remember"
                      className="cursor-not-allowed text-sm font-normal text-muted-foreground"
                    >
                      Remember this device
                    </FieldLabel>
                  </div>
                  {/*
                    Not an `<a>`: a link with no destination is a broken
                    control. Plain text is the honest form of "unavailable".
                  */}
                  <span className="text-end text-sm font-medium text-muted-foreground">
                    Forgot password?
                  </span>
                </Field>
                <Field className="gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isPending}
                    className="h-10 rounded-lg"
                  >
                    {isPending ? (
                      <>
                        <Spinner data-icon="inline-start" label="Signing in" />
                        Signing in&hellip;
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                  <FieldDescription className="text-center text-sm font-normal">
                    Don&rsquo;t have an account?{" "}
                    <span className="font-medium text-muted-foreground">
                      Create an account
                    </span>
                  </FieldDescription>
                  <FieldDescription className="text-center text-xs">
                    Account creation, password recovery and remembered devices
                    aren&rsquo;t available yet.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
