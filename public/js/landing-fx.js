// Efectos dinámicos de la landing: scroll reveals, parallax y blur-up.
// Sin dependencias de Firebase — si este módulo no carga, la página queda
// completamente visible (el CSS de reveals solo aplica bajo html.fx-ready).
document.documentElement.classList.add('fx-ready');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Scroll reveals con stagger ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

// Stagger en grids: cada hijo se revela con un pequeño retraso incremental
document.querySelectorAll('[data-reveal-group]').forEach(group => {
  Array.from(group.children).forEach((child, i) => {
    child.style.transitionDelay = `${i * 0.08}s`;
    child.setAttribute('data-reveal', '');
  });
});

document.querySelectorAll('[data-reveal]').forEach(el => {
  if (reduceMotion) el.classList.add('revealed');
  else revealObserver.observe(el);
});

/* ── Parallax sutil en fotos al hacer scroll (ACOTADO a ±15px) ──
   La versión anterior movía el contenedor sin límite y las fotos se montaban
   sobre la sección siguiente. Ahora el desplazamiento máximo es ±15px y un
   scale(1.05) da margen para que el movimiento no muestre fondo. */
if (!reduceMotion) {
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        parallaxEls.forEach(el => {
          const speed = parseFloat(el.dataset.parallax) || 0.1;
          const rect  = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const centro = rect.top + rect.height / 2 - window.innerHeight / 2;
            const offset = Math.max(-15, Math.min(15, centro * speed * -0.08));
            el.style.transform = `translateY(${offset}px) scale(1.05)`;
          }
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── Blur-up al cargar imágenes ── */
document.querySelectorAll('.gallery-item img, .collage-main img, .collage-sm img, .directiva-photo img')
  .forEach(img => {
    img.classList.add('photo-loading');
    if (img.complete) img.classList.replace('photo-loading', 'photo-loaded');
    else img.addEventListener('load', () =>
      img.classList.replace('photo-loading', 'photo-loaded'));
  });
