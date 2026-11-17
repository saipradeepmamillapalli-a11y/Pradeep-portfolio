(() => {
  'use strict';

  const root = document.documentElement;
  const preloading = root.classList.contains('is-preloading');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';
  const motion = hasGSAP && !reduceMotion;

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------- Smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });

    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- In-page links (brand, side rail, back to top, buttons) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -20 });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
      history.pushState(null, '', '#' + id);
    });
  });

  /* ---------- Active section in the side rail ---------- */
  const navLinks = document.querySelectorAll('[data-nav]');

  const setActive = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.dataset.nav === id;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  document.querySelectorAll('main section[id]').forEach((section) => navObserver.observe(section));

  /* ---------- Scroll progress and back-to-top visibility ---------- */
  const progressBar = document.querySelector('.scroll-progress');
  const toTop = document.querySelector('.to-top');

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    }
    if (toTop) {
      toTop.classList.toggle('is-visible', window.scrollY > 600);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Copy buttons (email and phone) ---------- */
  const fallbackCopy = (text) => {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    field.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  };

  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  };

  document.querySelectorAll('.copy-btn').forEach((button) => {
    const original = button.textContent;
    let timer = null;

    const flash = (label, copied) => {
      button.textContent = label;
      button.classList.toggle('is-copied', copied);
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-copied');
      }, 1800);
    };

    button.addEventListener('click', () => {
      copyText(button.dataset.copy).then(
        () => flash('Copied', true),
        () => flash('Copy failed', false)
      );
    });
  });

  /* ---------- Local time in Guntur (India Standard Time) ---------- */
  const localTime = document.getElementById('local-time');
  if (localTime) {
    let formatter = null;
    try {
      formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (err) {
      formatter = null;
    }

    const updateTime = () => {
      if (formatter) {
        localTime.textContent = 'Guntur, ' + formatter.format(new Date()) + ' IST';
      }
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  /* ---------- Typing title in the hero ---------- */
  const typedEl = document.getElementById('typed');
  const phrases = ['Software Developer', 'Python Developer', 'Full Stack Developer'];

  if (typedEl && !reduceMotion) {
    let phraseIndex = 0;
    let charCount = phrases[0].length;
    let deleting = true;

    const typeTick = () => {
      const word = phrases[phraseIndex];

      if (!deleting) {
        charCount++;
        typedEl.textContent = word.slice(0, charCount);
        if (charCount === word.length) {
          deleting = true;
          setTimeout(typeTick, 1800);
          return;
        }
        setTimeout(typeTick, 90);
      } else {
        charCount--;
        typedEl.textContent = word.slice(0, charCount);
        if (charCount === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(typeTick, 350);
          return;
        }
        setTimeout(typeTick, 45);
      }
    };
    setTimeout(typeTick, 1800);
  }

  /* ---------- Mouse spotlight ---------- */
  const spotlight = document.querySelector('.spotlight');
  if (spotlight && finePointer && !reduceMotion) {
    window.addEventListener(
      'pointermove',
      (event) => {
        spotlight.style.setProperty('--mx', event.clientX + 'px');
        spotlight.style.setProperty('--my', event.clientY + 'px');
      },
      { passive: true }
    );
  }

  /* ---------- Custom cursor (smooth dot and lagging ring) ---------- */
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');

  if (motion && finePointer && dot && ring) {
    root.classList.add('has-cursor');

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

    let shown = false;
    window.addEventListener(
      'pointermove',
      (event) => {
        if (!shown) {
          shown = true;
          gsap.to([dot, ring], { opacity: 1, duration: 0.4 });
        }
        dotX(event.clientX);
        dotY(event.clientY);
        ringX(event.clientX);
        ringY(event.clientY);
      },
      { passive: true }
    );

    document.addEventListener('pointerover', (event) => {
      const hot = event.target.closest && event.target.closest('a, button, .id-card, .row, .project, .stat');
      ring.classList.toggle('is-hover', Boolean(hot));
    });
  }

  /* ---------- 3D tilt with glare (pointer only) ---------- */
  if (motion && finePointer) {
    document.querySelectorAll('.tilt').forEach((card) => {
      gsap.set(card, { transformPerspective: 1000 });
      const tiltX = gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      const tiltY = gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3.out' });

      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        tiltX((0.5 - py) * 12);
        tiltY((px - 0.5) * 14);
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });

      card.addEventListener('pointerleave', () => {
        tiltX(0);
        tiltY(0);
      });
    });
  }

  /* ---------- GSAP motion ---------- */
  let intro = null;

  if (motion) {
    gsap.set('.hero-visual, .id-card, .section-title, .mega, .stagger > *', {
      transformPerspective: 1100,
    });

    /* Hero intro: paused here, played once the preloader hands over */
    intro = gsap
      .timeline({ paused: true, defaults: { ease: 'expo.out' } })
      .from('.status-row', { opacity: 0, y: 14, duration: 0.8 }, 0.1)
      .from('.name .line', { opacity: 0, rotationX: -75, y: 50, transformOrigin: '50% 100%', stagger: 0.12, duration: 1.4 }, 0.2)
      .from('.role, .hero-line, .cta, .facts', { opacity: 0, y: 18, stagger: 0.08, duration: 0.9 }, 0.6)
      .from('.id-card', { opacity: 0, y: 70, rotationX: 22, duration: 1.4 }, 0.45);

    /* Hero photo drifts in 3D as you scroll past the hero */
    gsap.to('.hero-visual', {
      rotationY: -14,
      rotationX: 6,
      y: -90,
      ease: 'none',
      scrollTrigger: {
        trigger: '#home',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    });

    /* Section titles turn into place as they reach the viewport */
    gsap.utils.toArray('.section-title').forEach((title) => {
      gsap.fromTo(
        title,
        { opacity: 0.15, rotationX: -55, y: 60 },
        {
          opacity: 1,
          rotationX: 0,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: title,
            start: 'top 92%',
            end: 'top 55%',
            scrub: 0.6,
          },
        }
      );
    });

    /* Rows, jobs, projects and stats rise in 3D, one after another */
    gsap.utils.toArray('.stagger').forEach((group) => {
      gsap.from(group.children, {
        opacity: 0,
        y: 44,
        rotationX: -14,
        transformOrigin: '50% 0%',
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: group,
          start: 'top 86%',
          once: true,
        },
      });
    });

    /* Certificate rows fade in (table rows do not take 3D transforms reliably) */
    gsap.from('.ledger tbody tr', {
      opacity: 0,
      stagger: 0.08,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.ledger',
        start: 'top 86%',
        once: true,
      },
    });

    /* Footer name rotates up from the page as you reach the bottom */
    gsap.fromTo(
      '.mega',
      { rotationX: 60, opacity: 0, transformOrigin: '50% 100%' },
      {
        rotationX: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.footer',
          start: 'top 95%',
          end: 'top 40%',
          scrub: 0.6,
        },
      }
    );

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Open the site: after the preloader, or straight away ---------- */
  const startSite = () => {
    if (lenis) lenis.start();
    if (motion) ScrollTrigger.refresh();
    if (intro) intro.play();
  };

  if (preloading) {
    if (lenis) lenis.stop();
    window.addEventListener('site:ready', startSite, { once: true });
  } else {
    startSite();
  }
})();
