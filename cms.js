// Lightweight content-driven renderer reading content.md
(function () {
  const SECTION_RE = /^# (.+)$/gm;

  // Inline markdown: **bold**, _italic_, `code`, [text](href)
  function inline(s) {
    if (!s) return '';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\b_([^_]+)_\b/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) return { fm: {}, rest: text };
    const fm = {};
    m[1].split('\n').forEach((line) => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      fm[k] = v;
    });
    return { fm, rest: text.slice(m[0].length) };
  }

  function splitSections(text) {
    const sections = {};
    const parts = text.split(/^# /gm).slice(1);
    parts.forEach((part) => {
      const nl = part.indexOf('\n');
      const name = part.slice(0, nl).trim();
      sections[name] = part.slice(nl + 1);
    });
    return sections;
  }

  function getSubsections(text) {
    const subs = {};
    const parts = text.split(/^## /gm).slice(1);
    parts.forEach((part) => {
      const nl = part.indexOf('\n');
      const name = part.slice(0, nl).trim();
      subs[name] = part.slice(nl + 1).trim();
    });
    return subs;
  }

  function getH3Items(text) {
    // Returns array of {title, body}
    const items = [];
    const parts = text.split(/^### /gm).slice(1);
    parts.forEach((part) => {
      const nl = part.indexOf('\n');
      const title = part.slice(0, nl).trim();
      items.push({ title, body: part.slice(nl + 1).trim() });
    });
    return items;
  }

  // Parses bullet lists with `- key: value` and nested `- item` lines.
  function parseFieldsAndBullets(body) {
    const lines = body.split('\n');
    const fields = {};
    let currentList = null;
    lines.forEach((raw) => {
      if (!raw.trim()) { currentList = null; return; }
      // Nested bullet (2+ space indent)
      if (/^\s{2,}-\s/.test(raw)) {
        if (currentList) {
          currentList.push(raw.replace(/^\s+-\s/, '').trim());
        }
        return;
      }
      // Top-level bullet "- key: value" or "- key:" (list follows)
      const m = raw.match(/^-\s+([\w]+):\s*(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (val === '') {
          fields[key] = [];
          currentList = fields[key];
        } else {
          // comma-separated chip-like values become arrays for `chips` and `stack`
          if (key === 'chips' || key === 'stack') {
            fields[key] = val.split(',').map((s) => s.trim()).filter(Boolean);
          } else {
            // typed coercion
            if (val === 'true') fields[key] = true;
            else if (val === 'false') fields[key] = false;
            else fields[key] = val;
          }
          currentList = null;
        }
        return;
      }
      // Plain bullet line outside fields
      if (/^-\s/.test(raw)) {
        if (!fields._bullets) fields._bullets = [];
        fields._bullets.push(raw.replace(/^-\s+/, '').trim());
      }
    });
    return fields;
  }

  function parseBulletList(body) {
    return body.split('\n').filter((l) => /^-\s/.test(l)).map((l) => l.replace(/^-\s+/, '').trim());
  }

  // ============= LOAD =============
  fetch('content.md', { cache: 'no-cache' })
    .then((r) => r.text())
    .then((text) => render(text))
    .catch((err) => {
      console.error('Failed to load content.md', err);
      document.getElementById('cms-loader').innerHTML =
        '<div class="cms-loader-inner"><div>Failed to load content.md</div></div>';
    });

  function render(text) {
    const { fm, rest } = parseFrontmatter(text);
    const sections = splitSections(rest);
    const data = { profile: fm };

    // Derived profile fields
    data.profile.initials = (fm.name || '')
      .split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    data.profile.emailHref = fm.email ? 'mailto:' + fm.email : '#';
    data.profile.copyright = '© ' + new Date().getFullYear() + ' ' + (fm.name || '');

    // ---- Hero ----
    const hero = getSubsections(sections['Hero'] || '');
    const titleLines = (hero['Title'] || '').split('|').map((s) => s.trim()).filter(Boolean);
    document.getElementById('hero-title-slot').innerHTML = titleLines
      .map((line) => `<span class="reveal-line"><span>${inline(line)}</span></span>`)
      .join('');
    document.getElementById('hero-sub-slot').innerHTML = inline(hero['Subtitle'] || '');

    const stats = parseBulletList(hero['Stats'] || '');
    document.getElementById('hero-stats-slot').innerHTML = stats.map((row) => {
      const [num, lblRaw] = row.split('|').map((s) => s.trim());
      const lbl = (lblRaw || '').split('/').map((s) => s.trim()).join('<br/>');
      return `<div class="stat reveal"><span class="stat-num">${num}</span><span class="stat-lbl">${lbl}</span></div>`;
    }).join('');

    // ---- About ----
    const about = getSubsections(sections['About'] || '');
    document.getElementById('about-heading').textContent = about['Heading'] || '';
    document.getElementById('about-lead').innerHTML = inline(about['Lead'] || '');
    document.getElementById('about-points').innerHTML = parseBulletList(about['Points'] || '')
      .map((p) => `<li class="reveal">${inline(p)}</li>`).join('');

    // ---- Skills ----
    const skills = getSubsections(sections['Skills'] || '');
    document.getElementById('skills-heading').textContent = skills['Heading'] || '';
    document.getElementById('skills-sub').textContent = skills['Subtitle'] || '';
    const skillGroups = getH3Items(skills['Groups'] || '');
    const letters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    document.getElementById('skills-grid').innerHTML = skillGroups.map((g, i) => `
      <div class="skill-card reveal">
        <div class="skill-num">${letters[i] || (i + 1)}</div>
        <h3>${inline(g.title)}</h3>
        <ul>${parseBulletList(g.body).map((it) => `<li>${inline(it)}</li>`).join('')}</ul>
      </div>
    `).join('');

    // ---- Experience ----
    const exp = getSubsections(sections['Experience'] || '');
    document.getElementById('experience-heading').textContent = exp['Heading'] || '';
    const roles = getH3Items(exp['Roles'] || '');
    document.getElementById('experience-list').innerHTML = roles.map((role) => {
      const f = parseFieldsAndBullets(role.body);
      const bullets = (f.bullets || []).map((b) => `<li>${inline(b)}</li>`).join('');
      const chips = (f.chips || []).map((c) => `<span>${c}</span>`).join('');
      return `
        <li class="tl-item reveal">
          <div class="tl-rail"><span class="tl-dot"></span></div>
          <div class="tl-body">
            <div class="tl-head">
              <span class="tl-when">${f.when || ''}</span>
              ${f.current ? '<span class="tl-tag">Current role</span>' : ''}
            </div>
            <h3 class="tl-role">${inline(role.title)}</h3>
            <p class="tl-org">${f.org || ''}</p>
            ${f.stack ? `<p class="tl-stack"><em>${f.stack}</em></p>` : ''}
            ${f.summary ? `<p>${inline(f.summary)}</p>` : ''}
            ${bullets ? `<ul class="tl-bullets">${bullets}</ul>` : ''}
            ${chips ? `<div class="tl-chips">${chips}</div>` : ''}
          </div>
        </li>
      `;
    }).join('');

    // ---- Projects ----
    const proj = getSubsections(sections['Projects'] || '');
    document.getElementById('projects-heading').textContent = proj['Heading'] || '';
    const projects = getH3Items(proj['Items'] || '');
    document.getElementById('projects-list').innerHTML = projects.map((p, i) => {
      const f = parseFieldsAndBullets(p.body);
      const did = (f.did || []).map((b) => `<li>${inline(b)}</li>`).join('');
      const stack = (f.stack || []).map((s) => `<span>${s}</span>`).join('');
      const num = String(i + 1).padStart(2, '0');
      return `
        <article class="project reveal">
          <div class="project-meta">
            <span class="project-num">${num}</span>
            <span class="project-when">${f.when || ''}</span>
            <span class="project-role">${f.role || ''}</span>
          </div>
          <h3 class="project-title">${inline(p.title)}</h3>
          <p class="project-lead">${inline(f.lead || '')}</p>
          <div class="project-cols">
            <div>
              <h4>What I did</h4>
              <ul>${did}</ul>
            </div>
            <div class="project-stack">
              <h4>Stack</h4>
              <div class="chips">${stack}</div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // ---- Education ----
    const edu = getSubsections(sections['Education'] || '');
    const eduItems = getH3Items(edu['Items'] || '');
    document.getElementById('education-list').innerHTML = eduItems.map((e) => {
      const f = parseFieldsAndBullets(e.body);
      return `
        <div class="edu-card">
          <div class="edu-when">${f.when || ''}</div>
          <div class="edu-what">
            <h3>${inline(e.title)}</h3>
            <p>${inline(f.degree || '')}</p>
          </div>
        </div>
      `;
    }).join('');

    // ---- Languages ----
    const langs = getSubsections(sections['Languages'] || '');
    const langItems = parseBulletList(langs['Items'] || '');
    document.getElementById('languages-list').innerHTML = langItems.map((row) => {
      const [name, level, pctRaw] = row.split('|').map((s) => s.trim());
      const pct = parseInt(pctRaw, 10) || 0;
      return `
        <li>
          <span>${name}</span>
          <span class="lang-level">${level}</span>
          <span class="lang-bar"><span style="width:${pct}%"></span></span>
        </li>
      `;
    }).join('');

    // ---- Contact ----
    const contact = getSubsections(sections['Contact'] || '');
    document.getElementById('contact-heading').textContent = contact['Heading'] || '';
    document.getElementById('contact-sub').textContent = contact['Subtitle'] || '';

    const cards = [];
    if (fm.email) cards.push({ label: 'Email', value: fm.email, href: 'mailto:' + fm.email });
    if (fm.telegram) cards.push({ label: 'Telegram', value: '@' + fm.telegram, href: 'https://t.me/' + fm.telegram });
    if (fm.linkedin) cards.push({ label: 'LinkedIn', value: '/in/' + fm.linkedin, href: 'https://www.linkedin.com/in/' + fm.linkedin + '/' });
    if (fm.github) cards.push({ label: 'GitHub', value: '@' + fm.github, href: 'https://github.com/' + fm.github });
    if (fm.phone) cards.push({ label: 'Phone', value: fm.phone, href: 'tel:' + String(fm.phone).replace(/\s|-/g, '') });
    if (fm.location) cards.push({ label: 'Location', value: fm.location, href: null });

    document.getElementById('contact-grid').innerHTML = cards.map((c) => {
      if (c.href) {
        return `<a class="contact-card" href="${c.href}"${/^https?:/.test(c.href) ? ' target="_blank" rel="noopener"' : ''}>
          <span class="contact-label">${c.label}</span>
          <span class="contact-value">${c.value}</span>
          <span class="contact-arrow">→</span>
        </a>`;
      }
      return `<div class="contact-card contact-card--static">
        <span class="contact-label">${c.label}</span>
        <span class="contact-value">${c.value}</span>
        <span class="contact-arrow">·</span>
      </div>`;
    }).join('');

    // ---- Bind global slots ----
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const path = el.getAttribute('data-bind');
      const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), data);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-bind-attr]').forEach((el) => {
      const spec = el.getAttribute('data-bind-attr'); // e.g. "href:profile.cvFile"
      const [attr, path] = spec.split(':');
      const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), data);
      if (v != null) el.setAttribute(attr, v);
    });

    // Page title
    if (fm.name) document.title = fm.name + ' — ' + (fm.role || 'Web Developer');

    // ---- Photo ----
    if (fm.photo && String(fm.photo).trim()) {
      const slot = document.getElementById('portrait-slot');
      if (slot) {
        const img = document.createElement('img');
        img.className = 'portrait-img';
        img.alt = fm.name || 'Photo';
        img.src = String(fm.photo).trim();
        img.onload = () => slot.classList.add('has-photo');
        slot.appendChild(img);
      }
    }

    // ---- Init reveal + sticky nav ----
    initInteractions();
    requestAnimationFrame(() => {
      document.getElementById('cms-loader').classList.add('hide');
    });
  }

  function initInteractions() {
    const nav = document.getElementById('topnav');
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    document.querySelectorAll('.about-points, .skills-grid, .hero-stats').forEach((group) => {
      [...group.querySelectorAll('.reveal')].forEach((el, i) => {
        el.style.transitionDelay = (i * 0.06) + 's';
      });
    });

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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            el.classList.add('is-in');
            io.unobserve(el);
          }
        });
      });
    });
  }
})();
