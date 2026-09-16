import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DirectionProvider, ThemeProvider } from "./index";

afterEach(cleanup);

describe("DirectionProvider", () => {
  it("renders children with the supplied direction", () => {
    render(
      <DirectionProvider direction="ltr">
        <span>content</span>
      </DirectionProvider>,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("does not set a direction attribute on the DOM", () => {
    // D-01 §8 / a11y §7.1: `<html lang dir>` in the root layout is the only
    // DOM direction source. This provider supplies runtime direction to Base
    // UI primitives only, so no wrapper element may appear here.
    const { container } = render(
      <DirectionProvider direction="ltr">
        <span>content</span>
      </DirectionProvider>,
    );
    expect(container.querySelector("[dir]")).toBeNull();
  });
});

describe("ThemeProvider", () => {
  it("renders children (class-driven theming per D-01 §2.3)", () => {
    render(
      <ThemeProvider>
        <span>themed</span>
      </ThemeProvider>,
    );
    expect(screen.getByText("themed")).toBeTruthy();
  });
});
