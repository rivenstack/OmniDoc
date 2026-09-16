import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Input,
  Label,
  Separator,
  Skeleton,
  Spinner,
  Textarea,
} from "./index";

afterEach(cleanup);

/**
 * Foundations / primitives — state coverage for the F-01 copy-in tier.
 *
 * These are behaviour/contract checks, not snapshots. Snapshot tests would
 * freeze Tailwind class strings and make every D-01 token tuning a false
 * failure, which is explicitly allowed during F-01.
 */
describe("Button", () => {
  it("renders an accessible, submit-safe control by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    // Default type is "button": a copied-in button must never hijack a form.
    expect(button.getAttribute("type")).toBe("button");
  });

  it("is busy and non-interactive while loading", () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole("button", { name: /saving/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    // The spinner is decorative; the label still names the control.
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("honours an explicit type override", () => {
    render(<Button type="submit">Send</Button>);
    expect(
      screen.getByRole("button", { name: "Send" }).getAttribute("type"),
    ).toBe("submit");
  });
});

describe("IconButton", () => {
  it("always exposes an accessible name", () => {
    render(
      <IconButton label="Close panel">
        <span aria-hidden="true">x</span>
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Close panel" })).toBeTruthy();
  });

  it("reports toggle state when used as a pressed control", () => {
    render(
      <IconButton label="Bold" pressed>
        <span aria-hidden="true">B</span>
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Bold", pressed: true });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Input / Textarea / Label", () => {
  it("associates a label with its control", () => {
    render(
      <>
        <Label htmlFor="title">Title</Label>
        <Input id="title" />
      </>,
    );
    expect(screen.getByLabelText("Title")).toBeTruthy();
  });

  it("drives the error state from aria-invalid, not a visual-only prop", () => {
    render(<Input aria-label="Email" aria-invalid />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    // The rule is attached via the aria-invalid attribute selector, so the
    // visual and the accessibility tree cannot disagree.
    expect(input.className).toContain("aria-invalid:border-destructive");
  });

  it("renders the required marker on the label variant", () => {
    render(
      <Label htmlFor="slug" variant="required">
        Slug
      </Label>,
    );
    // The marker is presentational (a `::after` asterisk); the control itself
    // must still carry `required` / `aria-required` for assistive tech.
    expect(screen.getByText("Slug").className).toContain("after:content-['*']");
  });

  it("keeps textarea long-string safety wired", () => {
    render(<Textarea aria-label="Body" autoGrow />);
    const textarea = screen.getByLabelText("Body");
    expect(textarea.className).toContain("od-unbroken");
    expect(textarea.className).toContain("field-sizing-content");
  });
});

describe("Badge", () => {
  it("renders status text, never colour alone", () => {
    render(<Badge variant="success">Supported</Badge>);
    expect(screen.getByText("Supported")).toBeTruthy();
  });

  it("uses D-01's explicit destructive pair for the danger variant", () => {
    render(<Badge variant="danger">Transport error</Badge>);
    expect(screen.getByText("Transport error").className).toContain(
      "bg-destructive",
    );
  });
});

describe("Card", () => {
  it("composes header, title and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Notes" })).toBeTruthy();
  });
});

describe("Separator", () => {
  it("exposes separator semantics to assistive tech", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeTruthy();
  });
});

describe("Skeleton / Spinner", () => {
  it("keeps skeletons out of the accessibility tree", () => {
    const { container } = render(<Skeleton data-testid="skeleton" />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
    // D-01 §6.1 requires a static block — no shimmer animation at all.
    expect(skeleton?.className).not.toContain("animate-pulse");
  });

  it("names the loading state and degrades motion safely", () => {
    render(<Spinner label="Generating answer" />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Generating answer")).toBeTruthy();
    // Reduced motion resolves to a static indicator rather than disappearing.
    expect(screen.getByRole("status").innerHTML).toContain(
      "motion-reduce:animate-none",
    );
  });
});
