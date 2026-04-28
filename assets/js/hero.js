/**
 * Hero scroll animation
 */
(function () {
  'use strict';

  const heroStage   = document.getElementById('hero-stage');
  const heroBg      = document.getElementById('hero-bg');
  const flyGreeting = document.getElementById('fly-greeting');
  const flyName     = document.getElementById('fly-name');
  const flyPhoto    = document.getElementById('fly-photo');
  const flyBio      = document.getElementById('fly-bio');
  const scrollHint  = document.getElementById('scroll-hint');
  const mainCard    = document.getElementById('main-card');
  const cardName    = document.getElementById('card-name');
  const cardPhoto   = document.getElementById('card-photo-wrap');
  const cardBio     = document.getElementById('card-bio');

  if (!heroStage || !flyName || !mainCard) return;

  const MORPH_RANGE   = 700;
  const BG_FADE_START = 500;
  const BG_FADE_END   = 800;
  const HERO_HIDE     = 860;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  let R = null;

  function measure() {
    R = {
      flyName:   flyName.getBoundingClientRect(),
      flyPhoto:  flyPhoto.getBoundingClientRect(),
      flyBio:    flyBio.getBoundingClientRect(),
      cardName:  cardName.getBoundingClientRect(),
      cardPhoto: cardPhoto.getBoundingClientRect(),
      cardBio:   cardBio.getBoundingClientRect(),
    };
  }

  function morphEl(el, startRect, endRect, p) {
    const sCx = startRect.left + startRect.width  / 2;
    const sCy = startRect.top  + startRect.height / 2;
    const eCx = endRect.left   + endRect.width    / 2;
    const eCy = endRect.top    + endRect.height   / 2;
    const dx    = lerp(0, eCx - sCx, p);
    const dy    = lerp(0, eCy - sCy, p);
    const scale = lerp(1, endRect.width / startRect.width, p);
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  function tick() {
    const scrollY = window.scrollY;
    if (scrollY >= HERO_HIDE) {
      heroStage.style.visibility = 'hidden';
      heroStage.style.pointerEvents = 'none';
      mainCard.style.opacity = '1';
      cardName.style.opacity  = '1';
      cardPhoto.style.opacity = '1';
      cardBio.style.opacity   = '1';
      return;
    }
    heroStage.style.visibility = '';
    const raw = scrollY / MORPH_RANGE;
    const p   = clamp(raw, 0, 1);
    const greetP = ease(clamp(p / 0.28, 0, 1));
    flyGreeting.style.opacity   = String(1 - greetP);
    flyGreeting.style.transform = `translateY(${lerp(0, 22, greetP)}px)`;
    const mp = ease(p);
    if (R) {
      morphEl(flyName,  R.flyName,  R.cardName,  mp);
      morphEl(flyPhoto, R.flyPhoto, R.cardPhoto, mp);
      morphEl(flyBio,   R.flyBio,   R.cardBio,   mp);
    }
    const colorP = ease(clamp(raw / 0.85, 0, 1));
    const gray   = Math.round(lerp(255, 17, colorP));
    flyName.style.color = `rgb(${gray},${gray},${gray})`;
    const nameFadeP        = ease(clamp((p - 0.91) / 0.06, 0, 1));
    flyName.style.opacity  = String(1 - nameFadeP);
    cardName.style.opacity = String(nameFadeP);
    const photoFadeP        = ease(clamp((p - 0.91) / 0.08, 0, 1));
    flyPhoto.style.opacity  = String(1 - photoFadeP);
    cardPhoto.style.opacity = String(photoFadeP);
    const flyBioOp = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    flyBio.style.opacity = String(Math.max(0, flyBioOp));
    const cardBioP       = ease(clamp((p - 0.88) / 0.08, 0, 1));
    cardBio.style.opacity = String(cardBioP);
    const cardShellP = ease(clamp((p - 0.25) / 0.25, 0, 1));
    mainCard.style.opacity = String(cardShellP);
    if (scrollHint) scrollHint.style.opacity = String(Math.max(0, 1 - scrollY / 120));
    const bgT  = clamp((scrollY - BG_FADE_START) / (BG_FADE_END - BG_FADE_START), 0, 1);
    const bgEt = ease(bgT);
    heroBg.style.opacity = String(1 - bgEt);
    heroStage.style.pointerEvents = bgEt > 0.5 ? 'none' : 'auto';
  }

  let rafId = null;
  function onScroll() { if (!rafId) rafId = requestAnimationFrame(() => { rafId = null; tick(); }); }

  window.addEventListener('load', () => {
    if (history.scrollRestoration) history.scrollRestoration = 'manual';
    if (window.scrollY !== 0) window.scrollTo(0, 0);
    mainCard.style.opacity  = '0';
    cardName.style.opacity  = '0';
    cardPhoto.style.opacity = '0';
    cardBio.style.opacity   = '0';
    measure();
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      flyGreeting.style.transform = '';
      flyName.style.transform     = '';
      flyPhoto.style.transform    = '';
      flyBio.style.transform      = '';
      measure();
      tick();
    });
  });
})();
