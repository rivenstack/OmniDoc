import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LoginForm,
  LOGIN_FAILURE_MESSAGES,
  type LoginFailure,
  type LoginFormProps,
  type LoginFormState,
} from "./login";

afterEach(cleanup);

const settle = async () => Promise.resolve();

function renderLogin(props: Partial<LoginFormProps> = {}) {
  const action = props.action ?? (async () => null);
  return render(<LoginForm action={action} {...props} />);
}

function form(): HTMLFormElement {
  const element = document.querySelector("form");
  if (!element) {
    throw new Error("login form not rendered");
  }
  return element as HTMLFormElement;
}

describe("LoginForm — structure and accessible names", () => {
  it("labels every field and marks the credentials required", () => {
    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>("Email*");
    const password = screen.getByLabelText<HTMLInputElement>("Password*");

    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(password.type).toBe("password");
    expect(password.required).toBe(true);
  });

  it("asks password managers for the right autocomplete hints", () => {
    renderLogin();

    expect(screen.getByLabelText("Email*").getAttribute("autocomplete")).toBe(
      "username",
    );
    // `current-password`, not `new-password` — otherwise browsers offer to
    // generate a password on a sign-in form.
    expect(
      screen.getByLabelText("Password*").getAttribute("autocomplete"),
    ).toBe("current-password");
  });

  it("makes the visible card title the page h1", () => {
    renderLogin({ appName: "OmniDoc" });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Welcome to OmniDoc");
  });

  it("keeps the reference layout's OR separator between social and credentials", () => {
    renderLogin();

    expect(screen.getByText("or sign in with")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Sign in with Google/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Sign in with Github/ }),
    ).toBeTruthy();
  });
});

describe("LoginForm — unbacked controls", () => {
  it("renders the controls the API cannot back as disabled, never as working ones", () => {
    renderLogin();

    // Base UI renders the checkbox as a `<span role="checkbox">`, so the state
    // arrives as `aria-disabled` rather than a native `disabled` property.
    expect(
      screen
        .getByRole("checkbox", { name: "Remember this device" })
        .getAttribute("aria-disabled"),
    ).toBe("true");

    // Social sign-in has no endpoint: `CreateSessionRequest` is email + password.
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /Sign in with Google/,
      }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /Sign in with Github/,
      }).disabled,
    ).toBe(true);
  });

  it("names the checkbox through its visible label, not only its input", () => {
    renderLogin();

    // `htmlFor` on its own points at Base UI's hidden native input, which is
    // `aria-hidden` — the visible control needs `aria-labelledby` to be named.
    const checkbox = screen.getByRole("checkbox", {
      name: "Remember this device",
    });
    expect(checkbox.getAttribute("aria-labelledby")).toBe("remember-label");
    expect(document.getElementById("remember-label")?.textContent).toBe(
      "Remember this device",
    );
  });

  it("says why those controls are unavailable instead of leaving them unexplained", () => {
    renderLogin();

    expect(
      screen.getByText("Social sign-in isn’t available yet."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Account creation, password recovery and remembered devices aren’t available yet.",
      ),
    ).toBeTruthy();
  });

  it("does not render password recovery or account creation as links with no destination", () => {
    renderLogin();

    // A dead `<a href="#">` looks like a control and acts like a trap.
    for (const label of ["Forgot password?", "Create an account"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
    expect(screen.getByText("Forgot password?")).toBeTruthy();
    expect(screen.getByText("Create an account")).toBeTruthy();
  });
});

describe("LoginForm — failure states", () => {
  it.each(Object.keys(LOGIN_FAILURE_MESSAGES) as LoginFailure[])(
    "announces %s in an alert region with readable text",
    async (failure) => {
      renderLogin({ action: async () => failure });

      fireEvent.submit(form());

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(LOGIN_FAILURE_MESSAGES[failure]);
    },
  );

  it("keeps a rejected password apart from an unreachable service", () => {
    // The two must not share a sentence: one is the user's problem, the other
    // is ours (docs/design/system-ux.md §2).
    expect(LOGIN_FAILURE_MESSAGES.invalid_credentials).not.toBe(
      LOGIN_FAILURE_MESSAGES.unavailable,
    );
    expect(LOGIN_FAILURE_MESSAGES.invalid_credentials).toMatch(
      /email and password/i,
    );
    expect(LOGIN_FAILURE_MESSAGES.unavailable).toMatch(/could not be reached/i);
  });

  it("shows no alert before the user has tried", () => {
    renderLogin();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("LoginForm — submission", () => {
  it("sends the credentials and the destination as form data", async () => {
    const action = vi.fn<
      (state: LoginFormState, formData: FormData) => Promise<LoginFormState>
    >(async () => null);
    renderLogin({ action, next: "/notes/new" });

    fireEvent.change(screen.getByLabelText("Email*"), {
      target: { value: "alex@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password*"), {
      target: { value: "s3cret" },
    });
    fireEvent.submit(form());

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1];
    expect(formData.get("email")).toBe("alex@example.test");
    expect(formData.get("password")).toBe("s3cret");
    expect(formData.get("next")).toBe("/notes/new");
  });

  it("omits the destination field when there is nowhere to return to", () => {
    renderLogin();

    expect(form().querySelector('input[name="next"]')).toBeNull();
  });

  it("reports progress once: the submit is disabled and the form is busy", async () => {
    let finish: (state: null) => void = () => undefined;
    const action = vi.fn(
      () =>
        new Promise<null>((resolve) => {
          finish = resolve;
        }),
    );
    renderLogin({ action });

    fireEvent.submit(form());

    const submit = await screen.findByRole<HTMLButtonElement>("button", {
      name: /Signing in/,
    });
    await waitFor(() => expect(submit.disabled).toBe(true));
    expect(form().getAttribute("aria-busy")).toBe("true");

    // Resolve so the pending state does not leak into the next test.
    finish(null);
    await waitFor(() => settle());
    expect(form().getAttribute("aria-busy")).toBe("false");
  });
});
