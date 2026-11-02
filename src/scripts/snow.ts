export interface SnowOptions {
  flakes: number;
}

const POINTER_MEDIA = "(hover: hover) and (pointer: fine)";
const PARALLAX_X = 14;
const PARALLAX_Y = 10;

export const initSnow = (layer: HTMLElement, { flakes }: SnowOptions): (() => void) => {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < flakes; index += 1) {
    const flake = document.createElement("span");
    const size = 3 + Math.random() * 8;

    flake.dataset.snowflake = "";
    flake.style.setProperty("--x", `${(Math.random() * 100).toFixed(2)}%`);
    flake.style.setProperty("--size", `${size.toFixed(1)}px`);
    flake.style.setProperty("--drift", `${Math.round(Math.random() * 90 - 45)}px`);
    flake.style.setProperty("--dur", `${(10 + Math.random() * 12).toFixed(1)}s`);
    flake.style.setProperty("--delay", `${(-Math.random() * 22).toFixed(1)}s`);
    flake.style.setProperty("--o", (0.25 + Math.random() * 0.35).toFixed(2));

    fragment.appendChild(flake);
  }

  layer.replaceChildren(fragment);

  const pointerQuery = window.matchMedia(POINTER_MEDIA);
  let frame = 0;

  const handlePointerMove = (event: PointerEvent) => {
    if (frame) return;

    frame = window.requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - 0.5) * PARALLAX_X;
      const y = (event.clientY / window.innerHeight - 0.5) * PARALLAX_Y;

      layer.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = 0;
    });
  };

  const bindPointer = () => {
    if (pointerQuery.matches) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
    }
  };

  const unbindPointer = () => {
    window.removeEventListener("pointermove", handlePointerMove);
  };

  const handlePointerMediaChange = () => {
    unbindPointer();
    bindPointer();
  };

  bindPointer();
  pointerQuery.addEventListener("change", handlePointerMediaChange);

  return () => {
    unbindPointer();
    pointerQuery.removeEventListener("change", handlePointerMediaChange);

    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }

    layer.style.transform = "";
    layer.replaceChildren();
  };
};
