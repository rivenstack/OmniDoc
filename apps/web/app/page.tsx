import { appName } from "@omnidoc/contracts";
import { placeholderToken } from "@omnidoc/ui";

// S-01a scaffold stub. Imports prove the allowed boundary edges:
// apps/web -> packages/contracts, packages/ui (scope:shared).
// Full journey UI lands in F-01+ after D-01 specs.
export default function HomePage() {
  return (
    <main className="shell">
      <h1>{appName}</h1>
      <p>
        Scaffold stub — token: <bdi>{placeholderToken}</bdi>
      </p>
    </main>
  );
}
