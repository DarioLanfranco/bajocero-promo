export const CAMPAIGN = {
  discountPercent: 5,
  durationHours: 48,
  /**
   * Clave de persistencia del cupón. Debe cambiar cuando cambie la campaña:
   * si dos promociones comparten clave, los usuarios recurrentes heredan
   * la ventana de la anterior. Mantenerla estable no resetea cupones activos.
   */
  storageKey: "bajocero.coupon.v1.startedAt",
} as const;

export const BUSINESS = {
  name: "Bajo Cero",
  city: "Río Cuarto",
  province: "Córdoba",
  address: "Roberto Payro 913, Río Cuarto",
  whatsappNumber: "5493586006854",
  whatsappLabel: "358 600-6854",
} as const;

export const WHATSAPP_MESSAGE = `¡Hola! Quiero validar mi ${CAMPAIGN.discountPercent}% de descuento de ${BUSINESS.name}. Adjunto la captura de mi cupón 📸`;

export const COUPON_DURATION_MS = CAMPAIGN.durationHours * 60 * 60 * 1000;
export const COUPON_DURATION_LABEL = `${CAMPAIGN.durationHours} horas`;

export const WHATSAPP_URL = `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${BUSINESS.whatsappNumber}`;

export const LEGAL_TEXT = {
  singleUse: "Válido un (1) solo uso",
  scope: "por dispositivo y cliente.",
  proof: "Presentar captura",
  proofDetail: "de pantalla al momento de abonar en caja.",
  stacking: "No acumulable con otras ofertas.",
} as const;
