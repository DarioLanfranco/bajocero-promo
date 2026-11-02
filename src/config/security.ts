const DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

/**
 * `frame-ancestors` no es válido dentro de un `<meta>`: por eso la política
 * del documento y la del header comparten directivas pero no son idénticas.
 */
export const CONTENT_SECURITY_POLICY = [...DIRECTIVES, "frame-ancestors 'none'"].join(
  "; ",
);

export const CONTENT_SECURITY_POLICY_META = DIRECTIVES.join("; ");

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
  ["Referrer-Policy", REFERRER_POLICY],
  ["X-Content-Type-Options", "nosniff"],
  ["Permissions-Policy", "geolocation=(), camera=(), microphone=()"],
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
];

const CACHE_RULES: ReadonlyArray<{
  pattern: string;
  headers: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    pattern: "/_astro/*",
    headers: [["Cache-Control", "public, max-age=31536000, immutable"]],
  },
  {
    pattern: "/media/*",
    headers: [["Cache-Control", "public, max-age=31536000, immutable"]],
  },
];

/**
 * `_headers` es el formato de Netlify/Cloudflare Pages. Se genera en build para
 * que la política viva en un único lugar y no derive del `<meta>`.
 */
export const renderHeadersFile = (): string => {
  const global = SECURITY_HEADERS.map(([name, value]) => `  ${name}: ${value}`).join(
    "\n",
  );

  const scoped = CACHE_RULES.map(
    ({ pattern, headers }) =>
      `${pattern}\n${headers.map(([name, value]) => `  ${name}: ${value}`).join("\n")}`,
  ).join("\n\n");

  return `/*\n${global}\n\n${scoped}\n`;
};
