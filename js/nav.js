// ==========================================================================
// Shared navbar behavior — used by all 17 pages
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDesktopDropdowns();
  initMobileNav();
  highlightActiveLinks();
  initScrollShadow();
});

function initDesktopDropdowns(){
  const groups = document.querySelectorAll('.nav-group');
  const setExpanded = (group, isOpen) => {
    group.classList.toggle('open', isOpen);
    const btn = group.querySelector('button');
    if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  };
  groups.forEach(group => {
    const btn = group.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = group.classList.contains('open');
      groups.forEach(g => setExpanded(g, false));
      if (!wasOpen) setExpanded(group, true);
    });
  });
  document.addEventListener('click', () => groups.forEach(g => setExpanded(g, false)));
}

function initMobileNav(){
  const toggle = document.getElementById('navToggle');
  const mobile = document.getElementById('navMobile');
  if (!toggle || !mobile) return;

  toggle.addEventListener('click', () => {
    const isOpen = mobile.classList.toggle('open');
    toggle.classList.toggle('is-active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  const mobileGroups = mobile.querySelectorAll('.nav-mobile-group');
  const setMobileExpanded = (group, isOpen) => {
    group.classList.toggle('open', isOpen);
    const btn = group.querySelector('button');
    if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  };
  mobileGroups.forEach(group => {
    const btn = group.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const wasOpen = group.classList.contains('open');
      mobileGroups.forEach(g => setMobileExpanded(g, false));
      if (!wasOpen) setMobileExpanded(group, true);
    });
  });

  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobile.classList.remove('open');
    toggle.classList.remove('is-active');
  }));
}

function highlightActiveLinks(){
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a[href], .nav-mobile a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
}

function initScrollShadow(){
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const onScroll = () => {
    nav.style.boxShadow = window.scrollY > 8 ? '0 8px 24px rgba(0,0,0,0.3)' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* Generic reveal-on-scroll used by every page */
function initReveal(selector){
  const els = document.querySelectorAll(selector);
  els.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

/* Generic animated counter used by stat cards across pages */
function initCounters(selector){
  const els = document.querySelectorAll(selector);
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ animate(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}
