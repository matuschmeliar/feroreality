/* ───────────────────────────────────────────
   FERO — landing interactions
   ─────────────────────────────────────────── */

(function () {
  'use strict';

  /* ─────────  STICKY BAR (po scrolle)  ───────── */
  const stickyBar   = document.getElementById('stickyBar');
  const stickyClose = document.getElementById('stickyClose');
  let stickyDismissed = sessionStorage.getItem('fero_sticky_closed') === '1';

  function onScroll() {
    if (!stickyBar || stickyDismissed) return;
    const show = window.scrollY > window.innerHeight * 0.8;
    stickyBar.hidden = !show;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (stickyClose) {
    stickyClose.addEventListener('click', function () {
      stickyDismissed = true;
      stickyBar.hidden = true;
      sessionStorage.setItem('fero_sticky_closed', '1');
    });
  }

  /* ─────────  EXIT-INTENT POPUP  ───────── */
  const popup      = document.getElementById('exitPopup');
  const exitForm   = document.getElementById('exitForm');
  const exitThanks = document.getElementById('exitThanks');
  let exitShown    = sessionStorage.getItem('fero_exit_shown') === '1';
  let exitArmed    = false;   // arm only after user has engaged

  function showExit() {
    if (exitShown || !popup || !exitArmed) return;
    exitShown = true;
    sessionStorage.setItem('fero_exit_shown', '1');
    popup.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function hideExit() {
    if (!popup) return;
    popup.hidden = true;
    document.body.style.overflow = '';
  }

  // arm exit-intent only after user has scrolled past hero AND moved mouse inside
  let userMoved = false;
  document.addEventListener('mousemove', function () { userMoved = true; }, { once: true });
  window.addEventListener('scroll', function () {
    if (!exitArmed && userMoved && window.scrollY > window.innerHeight * 0.6) {
      exitArmed = true;
    }
  }, { passive: true });

  // fire only when mouse leaves the viewport at the TOP (close-tab gesture)
  document.addEventListener('mouseleave', function (e) {
    if (e.clientY <= 0) showExit();
  });

  // touch fallback — after 60 s if armed
  setTimeout(function () {
    if (exitArmed && !exitShown) showExit();
  }, 60000);

  if (popup) {
    popup.addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.close !== undefined) hideExit();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popup && !popup.hidden) hideExit();
    });
  }

  if (exitForm) {
    exitForm.addEventListener('submit', function (e) {
      e.preventDefault();
      exitForm.hidden = true;
      exitThanks.hidden = false;
    });
  }

  /* ─────────  WAITLIST FORM  ───────── */
  const form         = document.getElementById('waitlistForm');
  const formSuccess  = document.getElementById('formSuccess');
  const queueNumber  = document.getElementById('queueNumber');

  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorBox  = document.createElement('div');
    errorBox.className = 'form__error';
    errorBox.hidden = true;
    submitBtn.insertAdjacentElement('beforebegin', errorBox);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errorBox.hidden = true;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data    = new FormData(form);
      const payload = {
        name:          data.get('name'),
        email:         data.get('email'),
        phone:         data.get('phone') || '',
        company:       data.get('company'),
        size:          data.get('size'),
        currentSystem: data.get('system'),
        pain:          data.get('pain'),
        source:        data.get('source') || '',
        interview:     !!data.get('interview'),
        website:       data.get('website') || '', // honeypot
      };

      const originalLabel = submitBtn.innerHTML;
      submitBtn.disabled  = true;
      submitBtn.innerHTML = 'Posielam…';

      try {
        const res = await fetch('/api/waitlist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        const result = await res.json().catch(function () { return {}; });

        if (!res.ok) {
          throw new Error(result.error || 'Neznáma chyba');
        }

        if (queueNumber && result.position) {
          queueNumber.textContent = result.position;
        }
        const inputs = form.querySelectorAll('.form__row, .field, .check-row, button[type="submit"], .form__foot, .form__error');
        inputs.forEach(function (el) { el.style.display = 'none'; });
        formSuccess.hidden = false;
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalLabel;
        errorBox.textContent = (err && err.message)
          ? err.message
          : 'Niečo sa pokazilo. Skúste znova alebo napíšte na zakladatel@feroreality.sk.';
        errorBox.hidden = false;
      }
    });
  }

  /* ─────────  SMOOTH SCROLL FOR ANCHORS  ───────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ─────────  REVEAL ON SCROLL  ───────── */
  const revealEls = document.querySelectorAll('.pain, .moment, .feature, .nots li, .roadmap__item, .perks, .founder, .trust__logo');
  revealEls.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
