import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSafeStorage,
  formatRemaining,
  getRemainingMs,
  initCountdown,
  resolveStartedAt,
  splitRemaining,
} from "../src/scripts/countdown";

const DURATION = 48 * 60 * 60 * 1000;
const NOW = 1_761_900_000_000;
const KEY = "test.coupon.startedAt";

const mountCountdown = (): HTMLElement => {
  document.body.innerHTML = `
    <div data-countdown>
      <span data-countdown-label></span>
      <span data-countdown-clock></span>
      <span data-countdown-status></span>
    </div>`;

  const root = document.querySelector<HTMLElement>("[data-countdown]");
  if (!root) throw new Error("countdown root not mounted");
  return root;
};

const clockOf = (root: HTMLElement) =>
  root.querySelector("[data-countdown-clock]")?.textContent?.trim();

describe("getRemainingMs", () => {
  it("calcula la diferencia entre expiración y ahora", () => {
    expect(getRemainingMs(NOW - 1000, NOW, DURATION)).toBe(DURATION - 1000);
  });

  it("nunca devuelve valores negativos", () => {
    expect(getRemainingMs(NOW - DURATION - 5000, NOW, DURATION)).toBe(0);
  });
});

describe("splitRemaining", () => {
  it("descompone la duración completa", () => {
    expect(splitRemaining(DURATION)).toEqual({
      hours: 48,
      minutes: 0,
      seconds: 0,
      expired: false,
    });
  });

  it("redondea hacia arriba para no mostrar 00:00:00 antes de tiempo", () => {
    expect(splitRemaining(1)).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 1,
      expired: false,
    });
  });

  it("marca expirado en cero", () => {
    expect(splitRemaining(0).expired).toBe(true);
  });
});

describe("formatRemaining", () => {
  it("rellena con dos dígitos", () => {
    expect(formatRemaining({ hours: 7, minutes: 3, seconds: 9, expired: false })).toBe(
      "07:03:09",
    );
  });
});

describe("resolveStartedAt", () => {
  it("usa ahora cuando no hay valor", () => {
    expect(resolveStartedAt(null, NOW)).toBe(NOW);
  });

  it("descarta valores no numéricos o negativos", () => {
    expect(resolveStartedAt("no-es-un-numero", NOW)).toBe(NOW);
    expect(resolveStartedAt("-500", NOW)).toBe(NOW);
    expect(resolveStartedAt("0", NOW)).toBe(NOW);
  });

  it("acepta un timestamp pasado", () => {
    expect(resolveStartedAt(String(NOW - 1000), NOW)).toBe(NOW - 1000);
  });

  it("ancla al presente un timestamp futuro fuera del margen de reloj", () => {
    expect(resolveStartedAt(String(NOW + 3_600_000), NOW)).toBe(NOW);
  });

  it("tolera una desincronización menor al margen", () => {
    expect(resolveStartedAt(String(NOW + 1000), NOW)).toBe(NOW);
  });
});

describe("createSafeStorage", () => {
  it("prueba el storage con la clave real del consumidor", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    createSafeStorage("campaign.custom", [() => storage]);

    expect(storage.setItem).toHaveBeenCalledWith("campaign.custom:probe", "1");
    expect(storage.removeItem).toHaveBeenCalledWith("campaign.custom:probe");
  });

  it("cae al siguiente candidato cuando el primero está bloqueado", () => {
    const session = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    const safe = createSafeStorage("k", [blocked, () => session]);
    safe.set("k", "value");

    expect(session.setItem).toHaveBeenCalledWith("k", "value");
  });

  it("sigue funcionando en memoria cuando todo está bloqueado", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    const safe = createSafeStorage("k", [blocked, blocked]);
    safe.set("k", "value");

    expect(safe.get("k")).toBe("value");
  });
});

describe("initCountdown", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("arranca en 48:00:00 y persiste el primer acceso", () => {
    const root = mountCountdown();
    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: KEY,
    });

    expect(clockOf(root)).toBe("48:00:00");
    expect(localStorage.getItem(KEY)).toBe(String(NOW));

    controller.destroy();
  });

  it("retoma desde el valor persistido", () => {
    localStorage.setItem(KEY, String(NOW - 60 * 60 * 1000));
    const root = mountCountdown();
    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: KEY,
    });

    expect(clockOf(root)).toBe("47:00:00");
    expect(root.dataset.state).toBe("active");

    controller.destroy();
  });

  it("avanza cada segundo", () => {
    const root = mountCountdown();
    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: KEY,
    });

    vi.advanceTimersByTime(1000);

    expect(clockOf(root)).toBe("47:59:59");

    controller.destroy();
  });

  it("notifica el estado expirado una sola vez", () => {
    localStorage.setItem(KEY, String(NOW - DURATION - 1000));
    const root = mountCountdown();
    const onStateChange = vi.fn();

    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: KEY,
      onStateChange,
    });

    expect(clockOf(root)).toBe("Expirado");
    expect(root.dataset.state).toBe("expired");
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls[0][0].expired).toBe(true);

    controller.destroy();
  });

  it("detiene el timer al destruirse y es idempotente", () => {
    const root = mountCountdown();
    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: KEY,
    });

    vi.advanceTimersByTime(2000);
    const before = clockOf(root);

    controller.destroy();
    controller.destroy();
    vi.advanceTimersByTime(10_000);

    expect(clockOf(root)).toBe(before);
  });

  it("aísla campañas con claves distintas", () => {
    localStorage.setItem("campaign.a", String(NOW - 60 * 60 * 1000));

    const root = mountCountdown();
    const controller = initCountdown({
      root,
      durationMs: DURATION,
      storageKey: "campaign.b",
    });

    expect(clockOf(root)).toBe("48:00:00");
    expect(localStorage.getItem("campaign.b")).toBe(String(NOW));

    controller.destroy();
  });

  it("rechaza duraciones inválidas", () => {
    const root = mountCountdown();

    expect(() => initCountdown({ root, durationMs: 0, storageKey: KEY })).toThrow(
      RangeError,
    );
  });
});
