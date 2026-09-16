import { appName } from "@omnidoc/contracts";

// S-01a scaffold stub. Imports prove the allowed boundary edges:
// apps/web -> packages/contracts, packages/ui (scope:shared) — `layout.tsx`
// imports the design-system providers. Full journey UI lands in F-02+.
export default function HomePage() {
  return (
    <main className="shell">
      <h1>{appName}</h1>
      <p>
        Scaffold stub — D-01 design tokens and providers are wired (F-01).
        Identifier isolation pattern:{" "}
        <bdi className="od-isolate">--od-accent-500</bdi>
      </p>
    </main>
  );
}
