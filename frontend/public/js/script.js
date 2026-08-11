(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sticky header state */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile navigation */
  var toggle = document.getElementById('navToggle');
  toggle.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.main-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* Active nav link */
  var page = document.body.getAttribute('data-page');
  document.querySelectorAll('[data-nav]').forEach(function (link) {
    if (link.getAttribute('data-nav') === page) link.classList.add('active');
  });

  /* Motion */
  if (window.gsap && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis) {
      var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    var lines = document.querySelectorAll('.hero-title .line > span, .page-title .line > span');
    if (lines.length) {
      gsap.to(lines, { y: 0, duration: 1.25, ease: 'power4.out', stagger: 0.1, delay: 0.2 });
    }
    var fades = document.querySelectorAll('.hero-fade');
    if (fades.length) {
      gsap.to(fades, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.75 });
    }

    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 42 },
        { opacity: 1, y: 0, duration: 1.05, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 87%' } });
    });

    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      gsap.to(el, {
        yPercent: -7, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  } else {
    document.documentElement.classList.add('no-motion');
  }

  /* Contact form */
  var form = document.getElementById('contactForm');
  if (form) {
    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('contactSubmit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      var data = {
        nama: form.nama.value.trim(),
        perusahaan: form.perusahaan.value.trim(),
        email: form.email.value.trim(),
        telepon: form.telepon.value.trim(),
        pesan: form.pesan.value.trim()
      };

      var valid = true;
      ['nama', 'perusahaan', 'email', 'pesan'].forEach(function (key) {
        var field = form[key];
        field.classList.remove('invalid');
        if (!data[key] || (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[key]))) {
          field.classList.add('invalid');
          valid = false;
        }
      });
      if (!valid) {
        status.textContent = 'Mohon lengkapi seluruh kolom yang wajib diisi dengan benar.';
        status.classList.add('error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          return res.json();
        })
        .then(function () {
          status.textContent = 'Pesan Anda telah terkirim. Tim PATSI akan segera menghubungi Anda.';
          status.classList.add('success');
          form.reset();
        })
        .catch(function () {
          status.textContent = 'Pesan gagal terkirim. Silakan coba lagi atau email langsung ke pengurus@patsi.id.';
          status.classList.add('error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Kirim Pesan';
        });
    });
  }
})();
