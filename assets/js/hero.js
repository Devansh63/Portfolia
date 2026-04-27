/**
 * Hero scroll animation — fixed overlay fades away, flying elements morph into sidebar card
 *
 * Architecture:
 *   #hero-stage  : position: fixed overlay, fades out on scroll
 *   #main-card   : always-present sticky sidebar (the persistent card)
 *
 * Scroll phases:
 *   0 → 700px   : flying elements track toward sidebar card positions (FLIP morph)
 *   500 → 800px : hero background fades out
 *   > 850px     : hero stage hidden (visibility: hidden), card fully visible
 */
(function () {
  'use strict';

  // ── Element references ──────────────────────────────────────────────────
  const heroStage    = document.getElementById('hero-stage');
  const heroBg       = document.getElementById('hero-bg');
  const flyGreeting  = document.getElementById('fly-greeting');
  const flyName      = document.getElementById('fly-name');
  const flyPhoto     = document.getElementById('fly-photo');
  const flyBio       = document.getElementById('fly-bio');
  const scrollHint   = document.getElementById('scroll-hint');

  // Morph targets: real elements inside the persistent sidebar card
  const mainCard     = document.getElementById('main-card');
  const cardName     = document.getElementById('card-name');
  const cardPhoto    = document.getElementById('card-photo-wrap');
  const cardBio      = document.getElementById('card-bio');

  if (!heroStage || !flyName || !mainCard) return;

  // ── Timing constants ────────────────────────────────────────────────────
  const MORPH_RANGE  = 700;  // px scrollY over which morph completes
  const BG_FADE_START = 500; // px scrollY when hero bg starts fading
  const BG_FADE_END   = 800; // px scrollY when hero bg fully gone
  const HERO_HIDE     = 860; // px scrollY after which hero stage is hidden

  // On mobile the layout stacks, so the FLIP morph targets are in completely
  // different positions — skip it and just do a simple fade instead
  const isMobile = () => window.innerWidth <= 900;

  // ── Helpers ─────────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  // ── Stored rects (measured before transforms, at scroll=0) ──────────────
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

  /**
   * Translate + scale `el` so its center tracks from startRect to endRect
   * at progress p (0 = original, 1 = fully at target).
   */
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

  // ── Main animation tick ─────────────────────────────────────────────────
  function tick() {
    const scrollY = window.scrollY;

    // ── Mobile: simple fade, no FLIP morph ──
    if (isMobile()) {
      const MOBILE_FADE_END = 220; // hero fully gone after 220px scroll
      if (scrollY >= MOBILE_FADE_END) {
        heroStage.style.visibility = 'hidden';
        heroStage.style.pointerEvents = 'none';
        heroStage.style.opacity = '';
      } else {
        heroStage.style.visibility = '';
        heroStage.style.opacity = String(1 - scrollY / MOBILE_FADE_END);
        heroStage.style.pointerEvents = scrollY > 80 ? 'none' : 'auto';
      }
      if (scrollHint) scrollHint.style.opacity = String(Math.max(0, 1 - scrollY / 80));
      return;
    }

    // ── Hero stage visibility ──
    if (scrollY >= HERO_HIDE) {
      heroStage.style.visibility = 'hidden';
      heroStage.style.pointerEvents = 'none';
      // Ensure card is fully visible
      mainCard.style.opacity = '1';
      cardName.style.opacity  = '1';
      cardPhoto.style.opacity = '1';
      cardBio.style.opacity   = '1';
      return;
    }
    heroStage.style.visibility = '';

    const raw = scrollY / MORPH_RANGE;
    const p   = clamp(raw, 0, 1);

    // ── "Hi, I'm" drops + fades (0 → 0.28) ──
    const greetP = ease(clamp(p / 0.28, 0, 1));
    flyGreeting.style.opacity   = String(1 - greetP);
    flyGreeting.style.transform = `translateY(${lerp(0, 22, greetP)}px)`;

    // ── FLIP morph: fly elements track to card positions ──
    const mp = ease(p);
    if (R) {
      morphEl(flyName,  R.flyName,  R.cardName,  mp);
      morphEl(flyPhoto, R.flyPhoto, R.cardPhoto, mp);
      morphEl(flyBio,   R.flyBio,   R.cardBio,   mp);
    }

    // ── Name color: white → #111 (by p=0.85) ──
    const colorP = ease(clamp(raw / 0.85, 0, 1));
    const gray   = Math.round(lerp(255, 17, colorP));
    flyName.style.color = `rgb(${gray},${gray},${gray})`;

    // ── Name crossfade (p=0.91 → 0.97): fly fades, card reveals ──
    const nameFadeP        = ease(clamp((p - 0.91) / 0.06, 0, 1));
    flyName.style.opacity  = String(1 - nameFadeP);
    cardName.style.opacity = String(nameFadeP);

    // ── Photo crossfade (p=0.91 → 0.99) ──
    const photoFadeP        = ease(clamp((p - 0.91) / 0.08, 0, 1));
    flyPhoto.style.opacity  = String(1 - photoFadeP);
    cardPhoto.style.opacity = String(photoFadeP);

    // ── Bio: fly fades (0.7 → 1.0), card fades in (0.88 → 0.96) ──
    const flyBioOp = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    flyBio.style.opacity = String(Math.max(0, flyBioOp));
    const cardBioP       = ease(clamp((p - 0.88) / 0.08, 0, 1));
    cardBio.style.opacity = String(cardBioP);

    // ── Card shell fades in (p=0.25 → 0.50): background/socials appear ──
    const cardShellP = ease(clamp((p - 0.25) / 0.25, 0, 1));
    mainCard.style.opacity = String(cardShellP);

    // ── Scroll hint fades as soon as user starts scrolling (0 → 120px) ──
    if (scrollHint) scrollHint.style.opacity = String(Math.max(0, 1 - scrollY / 120));

    // ── Hero background fades out (scrollY: BG_FADE_START → BG_FADE_END) ──
    const bgT  = clamp((scrollY - BG_FADE_START) / (BG_FADE_END - BG_FADE_START), 0, 1);
    const bgEt = ease(bgT);
    heroBg.style.opacity = String(1 - bgEt);

    // Block clicks while hero is mostly opaque; pass through when faded
    heroStage.style.pointerEvents = bgEt > 0.5 ? 'none' : 'auto';
  }

  // ── Scroll loop ──────────────────────────────────────────────────────────
  let rafId = null;
  function onScroll() {
    if (!rafId) rafId = requestAnimationFrame(() => { rafId = null; tick(); });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
    // Prevent browser from restoring scroll position (hero must start from 0)
    if (history.scrollRestoration) history.scrollRestoration = 'manual';
    if (window.scrollY !== 0) window.scrollTo(0, 0);

    if (isMobile()) {
      // Mobile: card is always visible — no FLIP, hero just fades on scroll
      mainCard.style.opacity  = '1';
      cardName.style.opacity  = '1';
      cardPhoto.style.opacity = '1';
      cardBio.style.opacity   = '1';
    } else {
      // Desktop: card starts invisible — hero covers everything until FLIP completes
      mainCard.style.opacity  = '0';
      cardName.style.opacity  = '0';
      cardPhoto.style.opacity = '0';
      cardBio.style.opacity   = '0';
    }
    measure();
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      // Reset transforms before re-measuring
      flyGreeting.style.transform = '';
      flyName.style.transform     = '';
      flyPhoto.style.transform    = '';
      flyBio.style.transform      = '';
      measure();
      tick();
    });
  });
})();
