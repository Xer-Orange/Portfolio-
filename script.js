/* ==================== LENIS SMOOTH SCROLL ==================== */
(function() {
  'use strict';

  // Check if Lenis is available
  if (typeof Lenis === 'undefined') {
    console.warn('Lenis not loaded — smooth scroll disabled');
    return;
  }

  // Initialize Lenis with gentle, premium-feel settings
  const lenis = new Lenis({
    // Duration of the scroll animation (higher = slower, more delayed feel)
    duration: 1.4,

    // Easing function for the scroll animation
    // This creates the "delayed catch-up" momentum effect
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

    // Lerp (linear interpolation) factor — lower = smoother, more inertia
    // 0.08 gives a buttery, slightly delayed feel
    lerp: 0.04,

    // Smooth scroll for anchor links (e.g., nav clicks)
    smoothWheel: true,

    // Sync with touch devices
    touchMultiplier: 1.5,

    // Infinite scroll prevention
    infinite: false,
  });

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Add Lenis's RAF loop into GSAP's ticker for perfect sync
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Disable GSAP's lag smoothing to prevent conflicts with Lenis
  gsap.ticker.lagSmoothing(0);

  // Expose lenis globally for anchor-link smooth scrolling
  window.lenis = lenis;
})();

/* ==================== NAVIGATION ==================== */
(function() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    
    // Close mobile menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
  
  // Smooth scroll for nav links (via Lenis if available, fallback to native)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = document.getElementById('main-nav')?.offsetHeight || 64;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        if (window.lenis) {
          window.lenis.scrollTo(targetPosition, { offset: 0 });
        } else {
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      }
    });
  });
})();

/* ==================== ABOUT PHOTO TILT ==================== */
(function() {
  const wrap = document.getElementById('photoWrap');
  const frame = document.getElementById('photoFrame');
  if (!wrap || !frame) return;
  const maxTilt = 7;

  function handleMove(e) {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const rotateX = ((centerY - y) / centerY) * maxTilt;
    frame.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handleLeave() {
    frame.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  wrap.addEventListener('mousemove', handleMove);
  wrap.addEventListener('mouseleave', handleLeave);
})();

/* ==================== JOURNEY TIMELINE ANIMATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const timelineContainer = document.getElementById('timeline-container');
  const progressLine = document.getElementById('timeline-progress');
  const header = document.getElementById('journey-header');
  const items = document.querySelectorAll('.timeline-item');

  if (!timelineContainer || !progressLine) return;

  const itemData = Array.from(items).map(item => ({
    el: item,
    node: item.querySelector('.timeline-node'),
    card: item.querySelector('.timeline-card')
  }));

  function isInViewport(el, thresholdPercent) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * thresholdPercent;
  }

  /* Header Entrance */
  if (header) {
    ScrollTrigger.create({
      trigger: header,
      start: 'top 85%',
      onEnter: () => header.classList.add('is-visible'),
      once: true
    });
    if (isInViewport(header, 0.85)) {
      header.classList.add('is-visible');
    }
  }

  /* Card Entrance */
  items.forEach((item) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 85%',
      onEnter: () => item.classList.add('is-visible'),
      once: true
    });
    if (isInViewport(item, 0.85)) {
      item.classList.add('is-visible');
    }
  });

  /* Threshold Calculation */
  function getThresholds() {
    const containerRect = timelineContainer.getBoundingClientRect();
    const containerHeight = containerRect.height;
    if (!containerHeight) return [];

    return itemData.map(({ node }) => {
      const originalTransform = node.style.transform;
      node.style.transform = 'none';
      const nodeRect = node.getBoundingClientRect();
      node.style.transform = originalTransform;

      const nodeCenter = (nodeRect.top + nodeRect.height / 2) - containerRect.top;
      return Math.max(0, Math.min(1, nodeCenter / containerHeight));
    });
  }

  let thresholds = getThresholds();

  ScrollTrigger.addEventListener('refresh', () => {
    thresholds = getThresholds();
  });

  /* Scroll-Linked Progress + Activation */
  function updateActiveStates(progress) {
    itemData.forEach((data, index) => {
      const shouldBeActive = progress >= thresholds[index];
      const isActive = data.el.classList.contains('active');
      if (shouldBeActive && !isActive) {
        data.el.classList.add('active');
      } else if (!shouldBeActive && isActive) {
        data.el.classList.remove('active');
      }
    });
  }

  const progressTween = gsap.to(progressLine, {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: timelineContainer,
      start: 'top center',
      end: 'bottom center',
      scrub: 0.6,
      fastScrollEnd: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => updateActiveStates(self.progress)
    }
  });

  if (progressTween.scrollTrigger) {
    updateActiveStates(progressTween.scrollTrigger.progress);
  }
});

/* ==================== PROJECTS SCROLL & SKILL HIGHLIGHTING ==================== */
(function () {
  'use strict';
  const slides = document.querySelectorAll('.project-slide');
  const skillTags = document.querySelectorAll('.skill-tag');
  const dotsContainer = document.getElementById('scrollDots');
  let currentIndex = 0;
  let isDesktop = window.innerWidth > 620;
  let observer = null;

  function initDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => scrollToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  function getDots() { return document.querySelectorAll('.dot'); }

  function scrollToSlide(index) {
    if (index < 0 || index >= slides.length) return;
    const navHeight = document.getElementById('main-nav')?.offsetHeight || 64;
    const targetTop = slides[index].getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
    if (window.lenis) {
      window.lenis.scrollTo(targetTop, { offset: 0 });
    } else {
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }

  function updateSkills(activeSkills) {
    if (!isDesktop) return;
    const skillsArray = activeSkills ? activeSkills.split(',') : [];
    skillTags.forEach((tag) => {
      const skillName = tag.dataset.skill;
      tag.classList.remove('glow', 'dimmed');
      if (skillsArray.includes(skillName)) tag.classList.add('glow');
      else tag.classList.add('dimmed');
    });
  }

  function setActiveSlide(index) {
    if (index === currentIndex) return; // GUARD: prevent flicker re-trigger
    currentIndex = index;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    getDots().forEach((dot, i) => dot.classList.toggle('active', i === index));
    if (slides[index]) updateSkills(slides[index].dataset.skills);
  }

  let debounceTimer = null;
  function debouncedSetActiveSlide(index) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setActiveSlide(index), 80);
  }

  /* Find which slide is closest to the vertical center of the viewport */
  function getCenteredSlideIndex() {
    const viewportCenter = window.innerHeight / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.top + rect.height / 2;
      const dist = Math.abs(slideCenter - viewportCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    return closestIndex;
  }

  function initObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    if (!isDesktop) {
      slides.forEach(s => s.classList.add('active'));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          debouncedSetActiveSlide(Array.from(slides).indexOf(entry.target));
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: '-10% 0px -10% 0px'
    });
    slides.forEach((slide) => observer.observe(slide));
  }

  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!isDesktop) return;
      const projectsSection = document.getElementById('projects');
      if (!projectsSection) return;
      const rect = projectsSection.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToSlide(Math.min(currentIndex + 1, slides.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToSlide(Math.max(currentIndex - 1, 0));
      }
    });
  }

  function initHover() {
    slides.forEach((slide) => {
      slide.addEventListener('mouseenter', () => {
        if (!isDesktop) return;
        updateSkills(slide.dataset.skills);
      });
      /* mouseleave removed — it fights scroll-driven state and causes flicker */
    });
  }

  function handleResize() {
    const newIsDesktop = window.innerWidth > 620;
    if (newIsDesktop === isDesktop) return;
    isDesktop = newIsDesktop;

    if (isDesktop) {
      slides.forEach(s => s.classList.remove('active'));
      initObserver();
      setActiveSlide(getCenteredSlideIndex());
    } else {
      if (observer) { observer.disconnect(); observer = null; }
      skillTags.forEach(tag => tag.classList.remove('glow', 'dimmed'));
      slides.forEach(s => s.classList.add('active'));
    }
  }

  function init() {
    if (!slides.length) return;
    initDots();
    initObserver();
    initKeyboard();
    initHover();
    if (isDesktop) setActiveSlide(0);
    else slides.forEach(s => s.classList.add('active'));
    window.addEventListener('resize', handleResize);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ==================== CERTIFICATES & ACHIEVEMENTS ==================== */
(function() {
  const CERTS = [
    {
      id: "01",
      title: "Google Gen AI Hackathon 2025",
      subtitle: "3rd Runner Up — National Finalist",
      issuer: "Google Developer Groups",
      date: "Nov 2025",
      description: "Recognized among 500+ teams for building Legalaxis, an AI-powered legal assistant with contract risk analysis and fairness scoring.",
      image: "https://kimi-web-img.moonshot.cn/img/res.cloudinary.com/934df163e0ef908f1dbb7d9e6c03023a07f68919.webp",
      link: { label: "View Certificate", href: "#" },
      accent: "var(--gold)",
    },
    {
      id: "02",
      title: "AWS Certified Cloud Practitioner",
      subtitle: "Foundational Certification",
      issuer: "Amazon Web Services",
      date: "Aug 2025",
      description: "Validated core understanding of AWS Cloud concepts, services, security, architecture, pricing, and support models.",
      image: "https://kimi-web-img.moonshot.cn/img/miro.medium.com/4cc5142548c11475510ddbe5b26615f99d3832e5.png",
      link: { label: "View Credential", href: "#" },
      accent: "var(--gold)",
    },
    {
      id: "03",
      title: "Meta Front-End Developer",
      subtitle: "Professional Certificate — 9 Course Series",
      issuer: "Meta (via Coursera)",
      date: "Mar 2025",
      description: "Completed an in-depth program covering React, version control, UI/UX principles, and a front-end capstone project.",
      image: "https://kimi-web-img.moonshot.cn/img/miro.medium.com/92dd24994a2418f47fe08493017ac6d68a62febb.jpeg",
      link: { label: "View Credential", href: "#" },
      accent: "var(--gold)",
    },
    {
      id: "04",
      title: "UI/UX Design Workshop",
      subtitle: "2-Day Intensive Training",
      issuer: "Design Guild",
      date: "Jun 2025",
      description: "Hands-on workshop covering user research, wireframing, and prototyping, capped with a live design critique session.",
      image: "https://kimi-web-img.moonshot.cn/img/cdn.dribbble.com/df32e9a5e224e49d0aa1cff1f26d61d59a027531.png",
      link: { label: "View Certificate", href: "#" },
      accent: "var(--gold)",
    },
  ];

  const container = document.getElementById('cert-container');
  const previewWrap = document.getElementById('preview-wrap');
  const previewCard = document.getElementById('preview-card');
  let closeTimeout = null;

  if (!container || !previewWrap || !previewCard) return;

  function buildPreview(cert) {
    if (!cert.image) {
      return `<div style="padding:40px 20px; text-align:center; color:var(--gray); font-size:13px;">No preview image</div>`;
    }
    return `
      <img src="${cert.image}" alt="${cert.title}">
      <a href="${cert.link.href}" class="preview-link" target="_blank" rel="noopener">
        ${cert.link.label}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    `;
  }

  CERTS.forEach((cert, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.animationDelay = `${0.15 + i * 0.12}s`;
    row.innerHTML = `
      <div class="row-inner">
        <div class="row-main">
          <span class="num">${cert.id}</span>
          <div class="content">
            <h3><span class="accent-dot" style="background:${cert.accent}"></span>${cert.title}</h3>
            <p class="subtitle">${cert.subtitle}</p>
            <p class="desc">${cert.description}</p>
          </div>
          <div class="meta">
            <p class="meta-label">Issuer</p>
            <p class="meta-value">${cert.issuer}</p>
            <p class="meta-date">${cert.date}</p>
          </div>
        </div>
        <a href="${cert.link.href}" class="mobile-link" target="_blank" rel="noopener">
          ${cert.link.label}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    `;

    row.addEventListener('mouseenter', () => {
      if (window.innerWidth < 768) return;
      clearTimeout(closeTimeout);
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      let top = rowRect.top - containerRect.top;
      const previewHeight = 320;
      const maxTop = container.offsetHeight - previewHeight - 8;
      top = Math.max(8, Math.min(top, Math.max(8, maxTop)));
      previewWrap.style.top = top + 'px';
      previewCard.innerHTML = buildPreview(cert);
      previewWrap.classList.add('active');
    });

    row.addEventListener('mouseleave', () => {
      if (window.innerWidth < 768) return;
      closeTimeout = setTimeout(() => previewWrap.classList.remove('active'), 180);
    });

    container.insertBefore(row, previewWrap);
  });

  previewWrap.addEventListener('mouseenter', () => clearTimeout(closeTimeout));
  previewWrap.addEventListener('mouseleave', () => {
    closeTimeout = setTimeout(() => previewWrap.classList.remove('active'), 180);
  });

  /* Scroll-triggered fade-in for rows */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('#certificates .row').forEach(row => observer.observe(row));
})();

/* ==================== CONTACT SECTION ==================== */
(function() {
  // Generate Twinkling Dots dynamically
  const dotsData = [
    {top:"3%",left:"40%",size:2,opacity:0.25}, {top:"6%",left:"68%",size:3,opacity:0.2},
    {top:"9%",left:"12%",size:2,opacity:0.18}, {top:"14%",left:"88%",size:2,opacity:0.25},
    {top:"18%",left:"55%",size:3,opacity:0.15}, {top:"22%",left:"5%",size:2,opacity:0.22},
    {top:"27%",left:"76%",size:2,opacity:0.2}, {top:"31%",left:"33%",size:3,opacity:0.18},
    {top:"35%",left:"93%",size:2,opacity:0.25}, {top:"40%",left:"20%",size:2,opacity:0.15},
    {top:"44%",left:"61%",size:3,opacity:0.22}, {top:"48%",left:"8%",size:2,opacity:0.2},
    {top:"52%",left:"84%",size:2,opacity:0.18}, {top:"57%",left:"46%",size:3,opacity:0.2},
    {top:"61%",left:"70%",size:2,opacity:0.15}, {top:"65%",left:"15%",size:2,opacity:0.25},
    {top:"69%",left:"58%",size:3,opacity:0.18}, {top:"73%",left:"90%",size:2,opacity:0.2},
    {top:"77%",left:"28%",size:2,opacity:0.15}, {top:"81%",left:"80%",size:3,opacity:0.22},
    {top:"85%",left:"50%",size:2,opacity:0.18}, {top:"89%",left:"10%",size:2,opacity:0.2},
    {top:"93%",left:"66%",size:3,opacity:0.15}
  ];
  
  const dotsContainer = document.getElementById('cs-dots');
  if (dotsContainer) {
    dotsData.forEach((d, i) => {
      const span = document.createElement('span');
      span.className = 'cs-dot';
      span.style.cssText = `top:${d.top}; left:${d.left}; width:${d.size}px; height:${d.size}px; opacity:${d.opacity}; animation-delay:${(i%7)*0.4}s; animation-duration:${3.5+(i%4)*0.7}s;`;
      dotsContainer.appendChild(span);
    });
  }

  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields = ['name', 'email', 'subject', 'message'];
  const state = { name: '', email: '', subject: '', message: '' };
  const touched = {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(values) {
    const errors = {};
    if (!values.name.trim() || values.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!values.email.trim() || !EMAIL_RE.test(values.email.trim())) errors.email = "Please enter a valid email address";
    if (!values.subject.trim() || values.subject.trim().length < 4) errors.subject = "Subject must be at least 4 characters";
    if (!values.message.trim() || values.message.trim().length < 20) errors.message = "Message must be at least 20 characters";
    return errors;
  }

  function showError(name, msg) {
    const errEl = document.getElementById(`error-${name}`);
    const input = document.getElementById(name);
    if (!errEl || !input) return;
    input.classList.add('cs-error');
    errEl.querySelector('.err-txt').textContent = msg;
    errEl.style.display = 'flex';
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError(name) {
    const input = document.getElementById(name);
    const errEl = document.getElementById(`error-${name}`);
    if (!input || !errEl) return;
    input.classList.remove('cs-error');
    errEl.style.display = 'none';
    input.setAttribute('aria-invalid', 'false');
  }

  function triggerShake(name) {
    const wrap = document.getElementById(`wrap-${name}`);
    if (!wrap) return;
    wrap.classList.remove('cs-shake');
    void wrap.offsetWidth;
    wrap.classList.add('cs-shake');
    setTimeout(() => wrap.classList.remove('cs-shake'), 450);
  }

  function triggerPulse(name) {
    const container = document.getElementById(`pulse-container-${name}`);
    if (!container) return;
    container.innerHTML = '<span class="cs-typing-ring"></span>';
  }

  fields.forEach(name => {
    const el = document.getElementById(name);
    if (!el) return;
    
    el.addEventListener('input', (e) => {
      state[name] = e.target.value;
      triggerPulse(name);
      const errorBanner = document.getElementById('cs-error-banner');
      if (errorBanner) errorBanner.style.display = 'none';
      if (touched[name]) {
        const err = validate(state)[name];
        if (err) showError(name, err); else clearError(name);
      }
    });

    el.addEventListener('blur', (e) => {
      touched[name] = true;
      const err = validate(state)[name];
      if (err) { showError(name, err); triggerShake(name); }
      else clearError(name);
    });
  });

  let successTimeout;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    fields.forEach(f => touched[f] = true);
    const errs = validate(state);
    const invalid = Object.keys(errs).filter(k => errs[k]);

    if (invalid.length > 0) {
      const successBanner = document.getElementById('cs-success-banner');
      const errorBanner = document.getElementById('cs-error-banner');
      if (successBanner) successBanner.style.display = 'none';
      if (errorBanner) errorBanner.style.display = 'block';
      invalid.forEach(f => { showError(f, errs[f]); triggerShake(f); });
      return;
    }

    const mailBody = `From: ${state.name} (${state.email})\n\n${state.message}`;
    const mailtoLink = `mailto:orange974746@gmail.com?subject=${encodeURIComponent(state.subject)}&body=${encodeURIComponent(mailBody)}`;
    window.location.href = mailtoLink;

    const errorBanner = document.getElementById('cs-error-banner');
    const successBanner = document.getElementById('cs-success-banner');
    if (errorBanner) errorBanner.style.display = 'none';
    if (successBanner) successBanner.style.display = 'block';
    
    form.reset();
    fields.forEach(f => { state[f] = ''; touched[f] = false; clearError(f); });

    if (successTimeout) clearTimeout(successTimeout);
    successTimeout = setTimeout(() => {
      if (successBanner) successBanner.style.display = 'none';
    }, 4000);
  });

  // Intersection Observer for contact section reveal
  const contactSection = document.getElementById('contact');
  if (contactSection) {
    const contactObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          contactSection.classList.add('cs-mounted');
          contactObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    contactObserver.observe(contactSection);
    
    // Fallback: if already in viewport, trigger immediately
    const rect = contactSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      contactSection.classList.add('cs-mounted');
    }
  }
})();

/* ==================== FOOTER ==================== */
(function() {
  'use strict';
  
  var yearEl = document.getElementById('mi-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
  
  var btn = document.getElementById('miBackToTop');
  if (!btn) return;
  
  var scrollThreshold = 400;

  function toggleVisibility() {
    if (window.scrollY > scrollThreshold) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        toggleVisibility();
        ticking = false;
      });
      ticking = true;
    }
  });

  toggleVisibility();

  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();