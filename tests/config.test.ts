import { describe, expect, it } from "vitest";
import {
  BUSINESS,
  CAMPAIGN,
  COUPON_DURATION_LABEL,
  COUPON_DURATION_MS,
  LEGAL_TEXT,
  WHATSAPP_MESSAGE,
  WHATSAPP_SUPPORT_URL,
  WHATSAPP_URL,
} from "../src/config/business";

describe("configuración de campaña", () => {
  it("expone la duración en milisegundos y en texto", () => {
    expect(COUPON_DURATION_MS).toBe(48 * 60 * 60 * 1000);
    expect(COUPON_DURATION_LABEL).toBe("48 horas");
  });

  it("conserva la clave de persistencia para no resetear cupones activos", () => {
    expect(CAMPAIGN.storageKey).toBe("bajocero.coupon.v1.startedAt");
  });
});

describe("canales de contacto", () => {
  it("arma el CTA con el mensaje precargado y escapado", () => {
    expect(WHATSAPP_URL).toContain(`https://wa.me/${BUSINESS.whatsappNumber}`);
    expect(WHATSAPP_URL).toContain(`text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
    expect(WHATSAPP_MESSAGE).toContain(`${CAMPAIGN.discountPercent}%`);
  });

  it("usa el mismo número para el CTA y para soporte", () => {
    expect(WHATSAPP_SUPPORT_URL).toBe(`https://wa.me/${BUSINESS.whatsappNumber}`);
  });
});

describe("textos legales", () => {
  it("no contiene placeholders pendientes", () => {
    for (const value of Object.values(LEGAL_TEXT)) {
      expect(value).not.toMatch(/TODO|\[|\]/);
    }
    expect(BUSINESS.address).not.toMatch(/TODO|\[|\]/);
  });
});
