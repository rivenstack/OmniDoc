import { appName } from "@omnidoc/contracts";

// S-01a scaffold stub. Journey UI is not this page. The visible primitive
// kit is /kit (2026-09-22). Do not treat this file as the app shell.
export default function HomePage() {
  return (
    <main className="shell">
      <h1>{appName}</h1>
      <p>
        Scaffold stub. Primitive kit: <a href="/kit">/kit</a>
      </p>
    </main>
  );
}
