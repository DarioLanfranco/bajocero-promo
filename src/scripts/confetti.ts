const COLORS = ["#0077cc", "#1b365d", "#25d366", "#8ec5f0", "#ffffff"];
const MAX_DPR = 2;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  life: number;
  decay: number;
  shape: "rect" | "circle";
}

const createParticles = (count: number, originX: number, originY: number) =>
  Array.from({ length: count }, (): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 11;

    return {
      x: originX + (Math.random() - 0.5) * 24,
      y: originY + (Math.random() - 0.5) * 18,
      vx: Math.cos(angle) * speed * 1.25,
      vy: Math.sin(angle) * speed * 0.8 - 2.5,
      size: 5 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.34,
      life: 1,
      decay: 0.006 + Math.random() * 0.005,
      shape: Math.random() < 0.65 ? "rect" : "circle",
    };
  });

export const launchConfetti = (): (() => void) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.dataset.confetti = "";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.setAttribute("aria-hidden", "true");
  context.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const particles = createParticles(width < 640 ? 70 : 110, width / 2, height * 0.42);

  let last = performance.now();
  let frameId = 0;
  let stopped = false;

  const remove = () => {
    if (stopped) return;

    stopped = true;
    window.cancelAnimationFrame(frameId);
    canvas.remove();
  };

  const frame = (timestamp: number) => {
    if (stopped) return;

    const delta = Math.min(Math.max((timestamp - last) / 16.67, 0.1), 2.2);
    last = timestamp;

    context.clearRect(0, 0, width, height);

    let alive = 0;

    for (const particle of particles) {
      if (particle.life <= 0) continue;

      particle.vy += 0.22 * delta;
      particle.vx *= 0.995;
      particle.vy *= 0.995;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.spin * delta;
      particle.life -= particle.decay * delta;

      if (particle.life <= 0) continue;

      alive += 1;

      context.save();
      context.globalAlpha = Math.min(particle.life, 1);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;

      if (particle.shape === "rect") {
        context.fillRect(
          -particle.size / 2,
          -particle.size / 4,
          particle.size,
          particle.size / 2,
        );
      } else {
        context.beginPath();
        context.arc(0, 0, particle.size / 2.4, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
    }

    if (alive > 0) {
      frameId = window.requestAnimationFrame(frame);
    } else {
      remove();
    }
  };

  frameId = window.requestAnimationFrame(frame);

  return remove;
};
