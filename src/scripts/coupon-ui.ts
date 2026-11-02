import { CAMPAIGN, COUPON_DURATION_MS } from "../config/business";
import { initCountdown } from "./countdown";

/**
 * El estado visual del cupón vive en la tarjeta (`data-state`), mientras que
 * el reloj conserva el suyo en `[data-countdown]` para que sus estilos
 * encapsulados (tema expirado) se apliquen sin duplicar selectores.
 */
export const initCoupon = (card: HTMLElement): (() => void) => {
  const countdownRoot = card.querySelector<HTMLElement>("[data-countdown]");

  if (!countdownRoot) return () => {};

  const controller = initCountdown({
    root: countdownRoot,
    durationMs: COUPON_DURATION_MS,
    storageKey: CAMPAIGN.storageKey,
    onStateChange: (state) => {
      card.dataset.state = state.expired ? "expired" : "active";
    },
  });

  return () => controller.destroy();
};
