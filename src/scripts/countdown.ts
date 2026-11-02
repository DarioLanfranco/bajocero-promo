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

export interface CountdownOptions {
  root: HTMLElement;
  durationMs: number;
  storageKey: string;
  now?: () => number;
  onStateChange?: (state: CountdownState) => void;
}

const CLOCK_SKEW_MS = 60_000;

const isPositiveNumber = (value: number): boolean => Number.isFinite(value) && value > 0;

export const getRemainingMs = (
  startedAt: number,
  now: number,
  durationMs: number,
): number => Math.max(0, startedAt + durationMs - now);

/**
 * Un valor guardado en el futuro solo puede venir de un reloj desincronizado
 * o de una manipulación del storage. En ambos casos se ancla a `now` para
 * evitar ventanas negativas; la validez real del cupón no depende de este dato.
 */
export const resolveStartedAt = (
  stored: string | null,
  now: number,
  skewMs: number = CLOCK_SKEW_MS,
): number => {
  if (!stored) return now;

  const parsed = Number(stored);

  if (!isPositiveNumber(parsed) || parsed > now + skewMs) return now;

  return Math.min(parsed, now);
};

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
        // Persistencia no disponible: la sesión sigue con el fallback.
      }
    },
  };
};

const DEFAULT_STORAGE_CANDIDATES = [
  () => window.localStorage,
  () => window.sessionStorage,
] as const;

/**
 * localStorage -> sessionStorage -> memoria. El probe usa la misma clave que
 * el consumidor para no validar un namespace distinto del que se va a usar.
 */
export const createSafeStorage = (
  storageKey: string,
  candidates: ReadonlyArray<() => Storage> = DEFAULT_STORAGE_CANDIDATES,
): SafeStorage => {
  const probeKey = `${storageKey}:probe`;

  for (const getStorage of candidates) {
    try {
      const storage = getStorage();

      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);

      return createWebStorage(storage);
    } catch {
      // Se prueba el siguiente mecanismo disponible.
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

export const initCountdown = ({
  root,
  durationMs,
  storageKey,
  now = Date.now,
  onStateChange,
}: CountdownOptions): CountdownController => {
  if (!isPositiveNumber(durationMs)) {
    throw new RangeError("initCountdown: durationMs debe ser un número positivo");
  }

  if (!storageKey) {
    throw new RangeError("initCountdown: storageKey es obligatorio");
  }

  const clock = root.querySelector<HTMLElement>("[data-countdown-clock]");
  const label = root.querySelector<HTMLElement>("[data-countdown-label]");
  const status = root.querySelector<HTMLElement>("[data-countdown-status]");

  if (!clock || !label) {
    return {
      destroy: () => {},
      getState: emptyState,
    };
  }

  const storage = createSafeStorage(storageKey);
  const startedAt = resolveStartedAt(storage.get(storageKey), now());
  const expiresAt = startedAt + durationMs;

  storage.set(storageKey, String(startedAt));

  let state: CountdownState = {
    ...splitRemaining(durationMs),
    startedAt,
    expiresAt,
    remainingMs: durationMs,
  };
  let timeoutId: number | undefined;
  let destroyed = false;
  let lastExpired: boolean | null = null;
  let lastAnnouncedMinute = -1;

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

      if (status) {
        status.textContent = "Tu cupón expiró. Escaneá un nuevo código QR en el local.";
      }
    } else {
      root.dataset.state = "active";
      label.textContent = "Tu cupón vence en";
      clock.textContent = formatRemaining(remaining);

      if (remaining.minutes !== lastAnnouncedMinute) {
        lastAnnouncedMinute = remaining.minutes;
        clock.setAttribute(
          "aria-label",
          `Quedan ${remaining.hours} horas, ${remaining.minutes} minutos`,
        );
      }
    }

    if (remaining.expired !== lastExpired) {
      lastExpired = remaining.expired;
      onStateChange?.(state);
    }
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
    const remainingMs = getRemainingMs(startedAt, current, durationMs);

    render(remainingMs);

    if (remainingMs <= 0) {
      clearTimer();
      return;
    }

    timeoutId = window.setTimeout(tick, Math.max(1, 1000 - (current % 1000)));
  };

  const handleVisibility = () => {
    if (destroyed) return;

    clearTimer();

    if (!document.hidden) tick();
  };

  const handlePageHide = () => {
    clearTimer();
  };

  const destroy = () => {
    if (destroyed) return;

    destroyed = true;
    clearTimer();
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handleVisibility);
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handleVisibility);

  tick();

  return {
    destroy,
    getState: () => state,
  };
};
