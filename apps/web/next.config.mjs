/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `@omnidoc/ui` ships TypeScript source (ADR-0002/0003: copy-in, project
  // owned, no build step), so Next must compile it as part of the app.
  transpilePackages: ["@omnidoc/ui"],
};

export default nextConfig;
