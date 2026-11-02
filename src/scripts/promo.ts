import { launchConfetti } from "./confetti";
import { initCoupon } from "./coupon-ui";
import { initSnow } from "./snow";

const MOBILE_BREAKPOINT = 640;
const MOBILE_FLAKES = 16;
const DESKTOP_FLAKES = 30;

export const initPromo = (): void => {
  const snowLayer = document.querySelector<HTMLElement>("[data-snow-layer]");
  const couponCard = document.querySelector<HTMLElement>("[data-coupon-state]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const disposeCoupon = couponCard ? initCoupon(couponCard) : () => {};

  let disposeSnow: (() => void) | null = null;
  let disposeConfetti: (() => void) | null = null;

  const disposeDecor = () => {
    disposeSnow?.();
    disposeSnow = null;
    disposeConfetti?.();
    disposeConfetti = null;
    disposeCoupon();
  };

  const startDecor = () => {
    if (reduceMotion.matches) return;

    if (snowLayer && !disposeSnow) {
      disposeSnow = initSnow(snowLayer, {
        flakes: window.innerWidth < MOBILE_BREAKPOINT ? MOBILE_FLAKES : DESKTOP_FLAKES,
      });
    }

    if (!disposeConfetti) disposeConfetti = launchConfetti();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDecor, { once: true });
  } else {
    startDecor();
  }

  document.addEventListener("astro:before-swap", disposeDecor);
};
