import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { IconSearch } from "@tabler/icons-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  IconButton,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  Separator,
  Skeleton,
  Spinner,
  Textarea,
} from "./index";

afterEach(cleanup);

/**
 * Foundations / primitives — state coverage for the shadcn v4 copy-in tier.
 *
 * These are behaviour/contract checks, not snapshots. Snapshot tests would
 * freeze Tailwind class strings and make every token retune a false failure.
 *
 * Two mechanical guards keep the LTR-now / RTL-ready discipline honest:
 * the rendered-root check below, and a source scan that reads every
 * component file for physical direction utilities. Audit strings are
 * written without the literal utility names so Tailwind's class scanner
 * cannot generate dead utilities from this file (see globals.css @source).
 */

const PHYSICAL_DIRECTION_CLASSES = /(^|\s)(pl|pr|ml|mr)-|text-(left|right)\b/;

const componentDir = path.join(process.cwd(), "src/components");

function assertNoPhysicalDirection(className: string | null) {
  expect(className ?? "").not.toMatch(PHYSICAL_DIRECTION_CLASSES);
}

describe("Button", () => {
  it("renders an accessible, submit-safe control by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    // Default type is "button": a copied-in button must never hijack a form.
    expect(button.getAttribute("type")).toBe("button");
  });

  it("honours an explicit type override", () => {
    render(<Button type="submit">Send</Button>);
    expect(
      screen.getByRole("button", { name: "Send" }).getAttribute("type"),
    ).toBe("submit");
  });

  it("composes the busy state from Spinner + disabled (no loading prop)", () => {
    render(
      <Button disabled>
        <Spinner data-icon="inline-start" />
        Saving
      </Button>,
    );
    const button = screen.getByRole("button", { name: /saving/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("keeps icon padding logical for RTL-readiness", () => {
    render(
      <Button>
        <IconSearch data-icon="inline-start" />
        Search
      </Button>,
    );
    const button = screen.getByRole("button", { name: /search/i });
    assertNoPhysicalDirection(button.className);
    expect(button.className).toContain("has-data-[icon=inline-start]:ps-3");
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

  it("keeps the accessible-name requirement at the type level", () => {
    // @ts-expect-error — IconButton without `label` must not compile.
    const unnamed = <IconButton><span aria-hidden="true">x</span></IconButton>;
    expect(unnamed).toBeTruthy();
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

  it("keeps textarea long-string safety wired", () => {
    render(<Textarea aria-label="Body" />);
    const textarea = screen.getByLabelText("Body");
    expect(textarea.className).toContain("od-unbroken");
    expect(textarea.className).toContain("field-sizing-content");
  });
});

describe("Field family", () => {
  it("groups a label, control and description without manual layout", () => {
    render(
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="note-title">Title</FieldLabel>
          <Input id="note-title" required />
          <FieldDescription>Shown in the notes list.</FieldDescription>
        </Field>
      </FieldGroup>,
    );
    const input = screen.getByLabelText("Title");
    expect(input.hasAttribute("required")).toBe(true);
    expect(screen.getByRole("group")).toBeTruthy();
    expect(screen.getByText("Shown in the notes list.")).toBeTruthy();
  });

  it("announces errors through role=alert and dedupes messages", () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="slug">Slug</FieldLabel>
        <Input id="slug" aria-invalid />
        <FieldError errors={[{ message: "Required" }, { message: "Required" }]} />
      </Field>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });
});

describe("InputGroup", () => {
  it("focuses the control when the addon is clicked", () => {
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon">
          <IconSearch aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search notes" />
        <InputGroupButton aria-label="Run search">Go</InputGroupButton>
      </InputGroup>,
    );
    fireEvent.click(screen.getByTestId("addon"));
    expect(document.activeElement).toBe(screen.getByLabelText("Search notes"));
    expect(screen.getByRole("button", { name: "Run search" })).toBeTruthy();
  });
});

describe("Badge", () => {
  it("renders status text, never colour alone", () => {
    render(<Badge variant="success">Supported</Badge>);
    expect(screen.getByText("Supported")).toBeTruthy();
  });

  it("uses the accessible status role colours for status variants", () => {
    render(<Badge variant="warning">Partial index</Badge>);
    const badge = screen.getByText("Partial index");
    expect(badge.className).toContain("bg-od-status-partial/10");
    expect(badge.className).toContain("text-od-status-partial");
  });

  it("keeps the destructive variant tinted, not a solid fill", () => {
    render(<Badge variant="destructive">Transport error</Badge>);
    expect(screen.getByText("Transport error").className).toContain(
      "bg-destructive/10",
    );
  });
});

describe("Card", () => {
  it("composes header, title, action and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardAction>3</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Notes" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
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
    // The pulse is upstream's; the global reduced-motion rule resolves it to
    // a static block (asserted in tokens.test.ts).
    expect(skeleton?.className).toContain("animate-pulse");
  });

  it("names the loading state", () => {
    render(<Spinner label="Generating answer" />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByLabelText("Generating answer")).toBeTruthy();
  });
});

describe("Empty", () => {
  it("renders the standard empty-state block", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No notes yet</EmptyTitle>
          <EmptyDescription>Create your first note.</EmptyDescription>
        </EmptyHeader>
      </Empty>,
    );
    expect(screen.getByText("No notes yet")).toBeTruthy();
    expect(screen.getByText("Create your first note.")).toBeTruthy();
  });
});

describe("direction discipline (LTR-now / RTL-ready)", () => {
  it("ships no physical direction utilities on component roots", () => {
    render(
      <>
        <Button>Save</Button>
        <Input aria-label="Field" />
        <Textarea aria-label="Body" />
        <Badge>Status</Badge>
        <Card>Card</Card>
      </>,
    );
    for (const element of [
      screen.getByRole("button", { name: "Save" }),
      screen.getByLabelText("Field"),
      screen.getByLabelText("Body"),
      screen.getByText("Status"),
      screen.getByText("Card"),
    ]) {
      assertNoPhysicalDirection(element.className);
    }
  });

  // Source-level scan: a future re-copy from upstream must not silently
  // reintroduce physical utilities anywhere, including components the
  // rendered-root check does not mount (FieldDescription, InputGroup, …).
  const componentSources = readdirSync(componentDir).filter(
    (file) => file.endsWith(".tsx") && !file.includes(".test."),
  );

  it.each(componentSources)(
    "component source %s contains no physical direction utilities",
    (file) => {
      const source = readFileSync(path.join(componentDir, file), "utf8");
      expect(source).not.toMatch(PHYSICAL_DIRECTION_CLASSES);
    },
  );
});
