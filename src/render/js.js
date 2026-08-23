/**
 * Client runtime for generated sites. Vanilla, no dependencies, and written so
 * that every feature degrades gracefully if it is absent from the page.
 */
export const RUNTIME_JS = `
(function () {
  'use strict';
  var doc = document;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Mobile navigation ─────────────────────────────────────────── */
  var toggle = doc.querySelector('[data-nav-toggle]');
  var drawer = doc.querySelector('[data-mobile-nav]');
  if (toggle && drawer) {
    var setNav = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      drawer.hidden = !open;
      doc.body.classList.toggle('nav-open', open);
      if (open) {
        var first = drawer.querySelector('a, button');
        if (first) first.focus();
      }
    };
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        toggle.focus();
      }
    });
    // Close the drawer if the viewport grows past the desktop breakpoint.
    window.matchMedia('(min-width: 64em)').addEventListener('change', function (e) {
      if (e.matches) setNav(false);
    });
  }

  /* ── Header shadow on scroll ───────────────────────────────────── */
  var header = doc.querySelector('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Colour scheme toggle ──────────────────────────────────────── */
  var themeToggle = doc.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = doc.documentElement.getAttribute('data-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = current ? (current === 'dark' ? 'light' : 'dark') : (prefersDark ? 'light' : 'dark');
      doc.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('avo-theme', next); } catch (err) {}
      themeToggle.setAttribute('aria-pressed', String(next === 'dark'));
    });
  }

  /* ── Gallery lightbox ──────────────────────────────────────────── */
  var triggers = doc.querySelectorAll('[data-lightbox]');
  if (triggers.length && typeof HTMLDialogElement === 'function') {
    var dialog = doc.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">' +
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
      '</button><div><img alt=""><p class="lightbox__caption"></p></div>';
    doc.body.appendChild(dialog);
    var img = dialog.querySelector('img');
    var caption = dialog.querySelector('.lightbox__caption');

    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        img.src = btn.getAttribute('data-lightbox');
        img.alt = btn.getAttribute('data-caption') || '';
        caption.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
      });
    });
    dialog.querySelector('.lightbox__close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
  }

  /* ── Contact form ──────────────────────────────────────────────── */
  var form = doc.querySelector('.contact-form');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var provider = form.getAttribute('data-form-provider');

    var showError = function (field, message) {
      var slot = form.querySelector('[data-error-for="' + field.id + '"]');
      field.setAttribute('aria-invalid', 'true');
      if (slot) { slot.textContent = message; slot.hidden = false; }
    };
    var clearError = function (field) {
      var slot = form.querySelector('[data-error-for="' + field.id + '"]');
      field.removeAttribute('aria-invalid');
      if (slot) { slot.hidden = true; slot.textContent = ''; }
    };

    var validate = function () {
      var ok = true;
      var firstBad = null;
      form.querySelectorAll('[required]').forEach(function (field) {
        clearError(field);
        var value = String(field.value || '').trim();
        if (!value) {
          showError(field, 'Please fill this in.');
          ok = false;
          firstBad = firstBad || field;
        } else if (field.type === 'email' && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$/.test(value)) {
          showError(field, 'Please enter a valid email address.');
          ok = false;
          firstBad = firstBad || field;
        }
      });
      if (firstBad) firstBad.focus();
      return ok;
    };

    form.addEventListener('submit', function (e) {
      if (!validate()) { e.preventDefault(); return; }

      // Endpoints that accept a JSON/XHR POST get an inline success message
      // instead of a full page navigation.
      var ajax = provider === 'formspree' || provider === 'custom-ajax';
      if (!ajax) return;

      e.preventDefault();
      var button = form.querySelector('button[type=submit]');
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      if (status) { status.hidden = true; status.className = 'form-status'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        if (status) {
          status.textContent = 'Thanks — your message is on its way. We will be in touch shortly.';
          status.className = 'form-status is-ok';
          status.hidden = false;
        }
      }).catch(function () {
        if (status) {
          status.textContent = 'Sorry, that did not send. Please call us instead, or email directly.';
          status.className = 'form-status is-error';
          status.hidden = false;
        }
      }).finally(function () {
        if (button) { button.disabled = false; button.textContent = 'Send enquiry'; }
      });
    });

    form.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') clearError(field);
      });
    });
  }

  /* ── Scroll reveal ─────────────────────────────────────────────── */
  var revealables = doc.querySelectorAll('.section, .hero__copy, .card');
  if (!reduceMotion && 'IntersectionObserver' in window && revealables.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });

    var pending = [];
    revealables.forEach(function (el) {
      // Anything already on screen at load stays visible — no flash of blank.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.setAttribute('data-reveal', '');
      observer.observe(el);
      pending.push(el);
    });

    // Failsafe: if the observer never fires (print, screenshot tooling, an
    // odd browser), reveal everything rather than leaving the page blank.
    setTimeout(function () {
      pending.forEach(function (el) { el.classList.add('is-visible'); });
    }, 2500);
    window.addEventListener('beforeprint', function () {
      pending.forEach(function (el) { el.classList.add('is-visible'); });
    });
  }

  /* ── Open / closed status ──────────────────────────────────────── */
  var statusEl = doc.querySelector('[data-open-status]');
  var hoursData = doc.getElementById('avo-hours');
  if (statusEl && hoursData) {
    try {
      var hours = JSON.parse(hoursData.textContent);
      var now = new Date();
      var names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      var today = hours[names[now.getDay()]];
      if (!today || today.closed) {
        statusEl.textContent = 'Closed today';
      } else {
        var minutes = now.getHours() * 60 + now.getMinutes();
        var open = today.open, close = today.close;
        statusEl.textContent = (minutes >= open && minutes < close)
          ? 'Open now'
          : 'Closed — opens ' + today.openLabel;
      }
    } catch (err) {}
  }
})();
`;

/** Same crude-but-safe approach as the CSS minifier: only our own code. */
export function minifyJs(js) {
  return js
    .split('\n')
    .map((line) => line.replace(/^\s+/, '').replace(/\s*\/\*.*?\*\/\s*/g, ' '))
    .filter((line) => line && !/^\/\//.test(line))
    .join('\n');
}
