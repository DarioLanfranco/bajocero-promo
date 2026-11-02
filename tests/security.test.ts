import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_META,
  REFERRER_POLICY,
  renderHeadersFile,
} from "../src/config/security";

describe("política de seguridad", () => {
  it("no habilita scripts ni estilos inline", () => {
    for (const policy of [CONTENT_SECURITY_POLICY, CONTENT_SECURITY_POLICY_META]) {
      expect(policy).toContain("script-src 'self'");
      expect(policy).toContain("style-src 'self'");
      expect(policy).not.toContain("unsafe-inline");
      expect(policy).not.toContain("unsafe-eval");
    }
  });

  it("bloquea el embebido en frames solo vía header", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY_META).not.toContain("frame-ancestors");
  });

  it("protege el documento base y los formularios", () => {
    expect(CONTENT_SECURITY_POLICY_META).toContain("base-uri 'none'");
    expect(CONTENT_SECURITY_POLICY_META).toContain("form-action 'none'");
    expect(CONTENT_SECURITY_POLICY_META).toContain("object-src 'none'");
  });
});

describe("renderHeadersFile", () => {
  const file = renderHeadersFile();

  it("aplica la política a todas las rutas", () => {
    expect(file.startsWith("/*\n")).toBe(true);
    expect(file).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(file).toContain(`Referrer-Policy: ${REFERRER_POLICY}`);
  });

  it("marca como inmutables los assets con hash y el media público", () => {
    expect(file).toContain("/_astro/*");
    expect(file).toContain("/media/*");
    expect(file.match(/immutable/g)).toHaveLength(2);
  });

  it("no deja bloques vacíos ni líneas huérfanas", () => {
    expect(file.endsWith("\n")).toBe(true);
    expect(file).not.toMatch(/\n{3,}/);
    for (const line of file.split("\n")) {
      expect(line === "" || line.startsWith("/") || line.startsWith("  ")).toBe(true);
    }
  });
});
