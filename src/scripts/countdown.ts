/**
 * Lógica de la cuenta regresiva del cupón.
 *
 * Las funciones puras (cálculo y formateo) no tocan el DOM ni el storage,
 * lo que las hace fáciles de testear. El controlador `initCountdown` es el
 * único punto que conoce el documento y el reloj del sistema.
 */

export const COUPON_DURATION_MS = 48 * 60 * 60 * 1000;
export const STORAGE_KEY = "bajocero.coupon.v1.startedAt";

export interface SafeStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface RemainingTime {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export interface CountdownState extends RemainingTime {
  startedAt: number;
  expiresAt: number;
  remainingMs: number;
}

export interface CountdownController {
  destroy: () => void;
  getState: () => CountdownState;
}

export interface InitCountdownOptions {
  root: HTMLElement;
  durationMs?: number;
  storageKey?: string;
  now?: () => number;
  onReady?: (state: CountdownState) => void;
  onExpire?: () => void;
}

const isPositiveNumber = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

/**
 * Diferencia real entre la expiración y el momento actual.
 * Se recalcula siempre desde `Date.now()` para no acumular drift.
 */
export const getRemainingMs = (
  startedAt: number,
  now: number,
  durationMs: number = COUPON_DURATION_MS,
): number => Math.max(0, startedAt + durationMs - now);

/**
 * Recupera el primer acceso. Si el valor guardado es inválido, está en el
 * futuro (reloj del sistema cambiado) o no existe, arranca ahora.
 */
export const resolveStartedAt = (
  stored: string | null,
  now: number,
): number => {
  if (!stored) return now;

  const parsed = Number(stored);

  if (!isPositiveNumber(parsed) || parsed > now) return now;

  return parsed;
};

/**
 * Convierte milisegundos restantes en partes de reloj.
 * Usa `ceil` para que el primer render muestre 48:00:00 y el último
 * segundo se vea como 00:00:01 hasta expirar exactamente en cero.
 */
export const splitRemaining = (remainingMs: number): RemainingTime => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remainingMs <= 0,
  };
};

export const formatRemaining = (remaining: RemainingTime): string => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
};

const createMemoryStorage = (): SafeStorage => {
  const memory = new Map<string, string>();

  return {
    get: (key) => memory.get(key) ?? null,
    set: (key, value) => {
      memory.set(key, value);
    },
  };
};

/**
 * Si el storage del navegador falla en cualquier momento (modo privado,
 * cookies bloqueadas, quota), el valor igual queda en memoria durante la
 * sesión. Así el contador nunca rompe la landing.
 */
const createWebStorage = (storage: Storage): SafeStorage => {
  const fallback = new Map<string, string>();

  return {
    get: (key) => {
      try {
        return storage.getItem(key) ?? fallback.get(key) ?? null;
      } catch {
        return fallback.get(key) ?? null;
      }
    },
    set: (key, value) => {
      fallback.set(key, value);

      try {
        storage.setItem(key, value);
      } catch {
        // Sin persistencia real: seguimos con el fallback en memoria.
      }
    },
  };
};

/**
 * localStorage -> sessionStorage -> memoria.
 * Nunca lanza: el primer acceso siempre queda registrado de alguna forma.
 */
export const createSafeStorage = (): SafeStorage => {
  const candidates = [
    () => window.localStorage,
    () => window.sessionStorage,
  ];

  for (const getStorage of candidates) {
    try {
      const storage = getStorage();
      const probeKey = `${STORAGE_KEY}:probe`;

      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);

      return createWebStorage(storage);
    } catch {
      // Probamos el siguiente mecanismo disponible.
    }
  }

  return createMemoryStorage();
};

const emptyState = (): CountdownState => ({
  hours: 0,
  minutes: 0,
  seconds: 0,
  expired: true,
  startedAt: 0,
  expiresAt: 0,
  remainingMs: 0,
});

/**
 * Controlador del contador. Devuelve `destroy` para liberar listeners y
 * timers, y `getState` para consultar el último estado renderizado.
 */
export const initCountdown = ({
  root,
  durationMs = COUPON_DURATION_MS,
  storageKey = STORAGE_KEY,
  now = Date.now,
  onReady,
  onExpire,
}: InitCountdownOptions): CountdownController => {
  const clock = root.querySelector<HTMLElement>("[data-countdown-clock]");
  const label = root.querySelector<HTMLElement>("[data-countdown-label]");
  const status = root.querySelector<HTMLElement>("[data-countdown-status]");

  if (!clock || !label) {
    return {
      destroy: () => {},
      getState: emptyState,
    };
  }

  const safeDuration = isPositiveNumber(durationMs)
    ? durationMs
    : COUPON_DURATION_MS;
  const storage = createSafeStorage();
  const startedAt = resolveStartedAt(storage.get(storageKey), now());
  const expiresAt = startedAt + safeDuration;

  storage.set(storageKey, String(startedAt));

  let state: CountdownState = {
    ...splitRemaining(safeDuration),
    startedAt,
    expiresAt,
    remainingMs: safeDuration,
  };
  let timeoutId: number | undefined;
  let destroyed = false;
  let expireNotified = false;

  const render = (remainingMs: number) => {
    const remaining = splitRemaining(remainingMs);

    state = {
      ...remaining,
      startedAt,
      expiresAt,
      remainingMs,
    };

    if (remaining.expired) {
      root.dataset.state = "expired";
      label.textContent = "Tu cupón";
      clock.textContent = "Expirado";
      clock.setAttribute("aria-label", "Cupón expirado");

      if (!expireNotified) {
        expireNotified = true;

        if (status) {
          status.textContent =
            "Tu cupón expiró. Escaneá un nuevo código QR en el local.";
        }

        onExpire?.();
      }

      return;
    }

    root.dataset.state = "active";
    label.textContent = "Tu cupón vence en";
    clock.textContent = formatRemaining(remaining);
    clock.setAttribute(
      "aria-label",
      `Quedan ${remaining.hours} horas, ${remaining.minutes} minutos y ${remaining.seconds} segundos`,
    );
  };

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const tick = () => {
    if (destroyed) return;

    const current = now();
    const remainingMs = getRemainingMs(startedAt, current, safeDuration);

    render(remainingMs);

    if (remainingMs <= 0) {
      clearTimer();
      return;
    }

    // Nos alineamos al borde del segundo para que el reloj no se atrase.
    timeoutId = window.setTimeout(
      tick,
      Math.max(1, 1000 - (current % 1000)),
    );
  };

  const handleVisibility = () => {
    if (destroyed) return;

    clearTimer();

    if (!document.hidden) tick();
  };

  const destroy = () => {
    destroyed = true;
    clearTimer();
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", clearTimer);
    window.removeEventListener("pageshow", handleVisibility);
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", clearTimer);
  window.addEventListener("pageshow", handleVisibility);

  tick();
  onReady?.(state);

  return {
    destroy,
    getState: () => state,
  };
};
