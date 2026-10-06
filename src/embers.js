// Glowing embers drifting up the background. Light on CPU: a few dozen
// particles, paused when the tab is hidden, off with reduced motion.

export function startEmbers(canvas) {
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = 1;
  const embers = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial = false) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.8 + Math.random() * 2.2,
      vy: 0.25 + Math.random() * 0.7,
      drift: Math.random() * Math.PI * 2,
      life: 0.4 + Math.random() * 0.6,
      hue: 18 + Math.random() * 28,
    };
  }

  resize();
  const count = Math.round(Math.min(55, Math.max(20, w / 28)));
  for (let i = 0; i < count; i++) embers.push(spawn(true));
  window.addEventListener("resize", resize);

  let raf = 0;
  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.y -= e.vy;
      e.x += Math.sin(t / 1400 + e.drift) * 0.35;
      const fade = Math.max(0, Math.min(1, e.y / h)) * e.life;
      const flicker = 0.7 + Math.sin(t / 180 + e.drift * 10) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${e.hue}, 100%, 60%, ${fade * flicker})`;
      ctx.shadowColor = `hsla(${e.hue}, 100%, 55%, ${fade})`;
      ctx.shadowBlur = 8;
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      if (e.y < -10) embers[i] = spawn();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
}
