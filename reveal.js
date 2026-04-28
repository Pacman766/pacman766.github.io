(function () {
  // Sticky-nav border on scroll
  const nav = document.getElementById('topnav');
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Intersection-based reveal
  const els = document.querySelectorAll('.reveal, .reveal-line');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => io.observe(el));

  // Stagger reveal children that are siblings
  document.querySelectorAll('.about-points, .skills-grid, .hero-stats').forEach((group) => {
    [...group.querySelectorAll('.reveal')].forEach((el, i) => {
      el.style.transitionDelay = (i * 0.06) + 's';
    });
  });
})();
