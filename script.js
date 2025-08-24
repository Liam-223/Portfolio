// ===== Helpers =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// ===== Theme apply (system-aware) =====
(function applyTheme(){
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  function apply(mode){
    const m = (mode === 'system' || !mode) ? (mql.matches ? 'dark' : 'light') : mode;
    document.body.classList.toggle('dark-mode', m === 'dark');
    if (window.__bg && window.__bg.setMode) window.__bg.setMode(m);
  }
  const saved = localStorage.getItem('theme');
  apply(saved);

  function onChange(){ const cur = localStorage.getItem('theme'); if (!cur || cur === 'system') apply('system'); }
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else if (mql.addListener) mql.addListener(onChange);

  window.__setThemePref = (pref)=>{
    if (pref === 'light' || pref === 'dark' || pref === 'system') {
      localStorage.setItem('theme', pref);
      apply(pref);
    } else {
      localStorage.removeItem('theme'); // treat as system
      apply('system');
    }
  };
})();
// ===== Mobile menu (simple hide/show of nav links) =====
(function mobileMenu(){
  const toggle = $('.menu-toggle');
  const list = $('nav ul');
  toggle?.addEventListener('click', () => {
    const open = list.style.display === 'flex';
    list.style.display = open ? 'none' : 'flex';
    toggle.setAttribute('aria-expanded', String(!open));
  });

  // close on link click (mobile)
  $$('nav a').forEach(a => a.addEventListener('click', () => {
    if (window.innerWidth < 768) list.style.display = 'none';
  }));
})();



// ===== Accent color =====
(function accentColor(){
  const DEF = 275; // default purple hue
  function setHue(h){
    // Update CSS variables based on hue
    const medium = `hsl(${h}, 72%, 56%)`;
    const dark = `hsl(${h}, 65%, 40%)`;
    const light = `hsl(${h}, 70%, 78%)`;
    const glow = `hsla(${h}, 72%, 56%, .30)`;
    const root = document.documentElement.style;
    root.setProperty('--purple-medium', medium);
    root.setProperty('--purple-dark', dark);
    root.setProperty('--purple-light', light);
    root.setProperty('--purple-glow', glow);
    if (window.__bg && window.__bg.setHue) window.__bg.setHue(h);
    // Update small preview dot if present
    const dot = document.querySelector('.accent-dot'); if (dot) dot.style.background = medium;
  }
  const saved = localStorage.getItem('accentHue');
  const hue = saved ? +saved : DEF;
  setHue(hue);
  window.__setAccentHue = (h)=>{ localStorage.setItem('accentHue', h); setHue(h); };
})();
// ===== Typing effect =====
(function typing(){
  const el = $('.typing-effect');
  if (!el) return;

  const phrases = [
    '2D & 3D games',
    'Helpful tools',
    'Roblox experiences',
    'Godot projects'
  ];

  let i = 0, j = 0, deleting = false;

  function render(text){ el.textContent = text; }

  const tick = () => {
    const word = phrases[i];
    const current = word.slice(0, j);
    render(current);

    if (!deleting && j < word.length) j++;
    else if (deleting && j > 0) j--;
    else {
      if (!deleting){ deleting = true; setTimeout(tick, 1000); return; }
      deleting = false; i = (i + 1) % phrases.length;
    }
    setTimeout(tick, deleting ? 40 : 90);
  };
  tick();
})();


// ===== GitHub repos =====
(function github(){
  const grid = $('#github-grid');
  const loadMoreBtn = $('#github-load-more');
  if (!grid || !loadMoreBtn) return;

  const username = 'Liam-223';
  let page = 1;

  async function fetchRepos(p=1){
    const url = `https://api.github.com/users/${username}/repos?sort=updated&per_page=12&page=${p}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('GitHub API limit or error');
    return res.json();
  }

  function langDot(color){
    return `<span class="lang-dot" style="background:${color || '#888'}"></span>`;
  }

  const langColors = {
    JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5', Lua:'#000080',
    GDScript:'#355570', HTML:'#e34c26', CSS:'#563d7c'
  };

  function repoCard(r){
    const updated = new Date(r.updated_at).toLocaleDateString();
    const desc = r.description || '';
    const lang = r.language || 'Other';
    return `
      <article class="project-card repo-card">
        <div class="project-info">
          <h3><a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a></h3>
          <p class="repo-desc">${desc}</p>
          <div class="repo-meta">
            <span class="badge">${langDot(langColors[lang])}${lang}</span>
            <span class="badge"><i class="fa-regular fa-star"></i> ${r.stargazers_count}</span>
            <span class="badge"><i class="fa-solid fa-code-fork"></i> ${r.forks_count}</span>
            <span class="badge" title="${r.updated_at}">Updated ${updated}</span>
          </div>
        </div>
      </article>
    `;
  }

  async function addPage(){
    try{
      loadMoreBtn.disabled = true;
      const repos = await fetchRepos(page);
      if (repos.length === 0){
        loadMoreBtn.textContent = 'No more repos';
        return;
      }
      grid.insertAdjacentHTML('beforeend', repos.map(repoCard).join(''));
      page += 1;
      loadMoreBtn.disabled = false;
    }catch(err){
      loadMoreBtn.textContent = 'Error loading';
      console.error(err);
    }
  }

  // initial + button
  addPage();
  loadMoreBtn.addEventListener('click', addPage);
})();

// ===== BACKGROUND: ultra-light particle field =====
(function background(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
  let w=0, h=0, particles=[], hueBase=270, running=true, externallyEnabled=true;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReduced.matches) return; // CSS also hides canvas

  function resize(){
    w = canvas.width = Math.floor(window.innerWidth * DPR);
    h = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    // regenerate a density proportional to area, but small
    const target = Math.floor((w*h) / (180000 * DPR)); // ~60–120 on typical screens
    particles = Array.from({length: target}, () => spawn());
  }

  function rand(a,b){return Math.random()*(b-a)+a}

  function spawn(){
    const speed = rand(.02, .08) * DPR; // slow drift
    const angle = rand(0, Math.PI*2);
    return {
      x: rand(0, w), y: rand(0, h),
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      r: rand(0.6, 1.8) * DPR,
      twinkle: rand(0.4, 1),
    };
  }

  function color(alpha = .6){
    // subtle purple/blue range
    const h = hueBase + Math.sin(Date.now()/5000)*8; // gentle hue shift
    return `hsla(${h}, 70%, 70%, ${alpha})`;
  }

  function step(){
    if (!running || !externallyEnabled) return;
    ctx.clearRect(0,0,w,h);

    // Soft vignette glow
    const grad = ctx.createRadialGradient(w*0.6, h*0.3, 10, w*0.5, h*0.5, Math.max(w,h)*0.7);
    grad.addColorStop(0, 'rgba(138,43,226,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    // Particles
    ctx.fillStyle = color();
    for (const p of particles){
      p.x += p.vx; p.y += p.vy;

      // wrap around edges
      if (p.x < -5) p.x = w+5; if (p.x > w+5) p.x = -5;
      if (p.y < -5) p.y = h+5; if (p.y > h+5) p.y = -5;

      // twinkle via globalAlpha
      ctx.globalAlpha = p.twinkle * (0.7 + 0.3*Math.sin((p.x+p.y)*0.002 + Date.now()*0.002));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Sparse connecting lines (constellation vibe)
    const maxDist = 110 * DPR;
    ctx.strokeStyle = color(0.12);
    ctx.lineWidth = 0.7 * DPR;
    for (let i=0;i<particles.length;i++){
      const a = particles[i];
      for (let j=i+1;j<i+7 && j<particles.length;j++){ // only a few neighbors
        const b = particles[j];
        const dx=a.x-b.x, dy=a.y-b.y;
        const d = Math.hypot(dx,dy);
        if (d < maxDist){
          ctx.globalAlpha = 1 - (d/maxDist);
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(step);
  }

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) requestAnimationFrame(step);
  });

  // react to theme
  function setMode(mode){
    hueBase = mode === 'dark' ? 270 : 275; // small shift for contrast
  }
  window.__bg = { setMode, setHue: (h)=>{ hueBase = Number(h) || hueBase; }, setEnabled: (on)=>{
    externallyEnabled = !!on;
    const grad = document.querySelector('.bg-gradient');
    if (grad) grad.style.display = on ? '' : 'none';
    canvas.style.display = on ? '' : 'none';
    running = on && document.visibilityState === 'visible';
    if (running) requestAnimationFrame(step);
  } };

  window.addEventListener('resize', resize);
  resize();
  // set initial hue based on current theme
  setMode(document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  requestAnimationFrame(step);
})();


// ===== Settings Panel =====
(function settingsPanel(){
  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true }); else fn(); }
  ready(function(){
    const panel = $('#settings-panel');
    const backdrop = $('#settings-backdrop');
    const closeBtn = $('#settings-close');
    const optBg = $('#opt-animated-bg');
    const themeRadios = $$('.segmented input[name="theme"]');
    const accent = $('#opt-accent');
    const optAnalytics = $('#opt-analytics');

    function open(){
      if (!panel || !backdrop) return;
      panel.hidden = false; backdrop.hidden = false;
      const btn = $('#settings-button'); if (btn) btn.setAttribute('aria-expanded', 'true');
    }
    function close(){
      if (!panel || !backdrop) return;
      panel.hidden = true; backdrop.hidden = true;
      const btn = $('#settings-button'); if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    // Delegated click so it works even if button re-renders
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest && e.target.closest('#settings-button');
      if (btn){ e.preventDefault(); open(); }
    });
    closeBtn && closeBtn.addEventListener('click', close);
    backdrop && backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

    // Initialize theme radios
    const savedTheme = localStorage.getItem('theme') || 'system';
    themeRadios.forEach(r=>{ r.checked = (r.value === (savedTheme || 'system')); });
    function updateThemeFromRadios(){
      const picked = (themeRadios.find(r=>r.checked) || {}).value || 'system';
      window.__setThemePref(picked);
    }
    themeRadios.forEach(r=> r.addEventListener('change', updateThemeFromRadios));

    // Init accent slider
    const savedHue = localStorage.getItem('accentHue') || '275';
    if (accent) { accent.value = savedHue; }
    accent && accent.addEventListener('input', (e)=> window.__setAccentHue(e.target.value));

    // Analytics consent
    const consent = localStorage.getItem('analytics') === 'on';
    if (optAnalytics) optAnalytics.checked = consent;
    if (consent) window.__analytics && window.__analytics.enable();
    optAnalytics && optAnalytics.addEventListener('change', (e)=>{
      const on = !!e.target.checked;
      localStorage.setItem('analytics', on ? 'on' : 'off');
      if (!window.__analytics) return;
      on ? window.__analytics.enable() : window.__analytics.disable();
    });

    // Wire up background toggle
    optBg && optBg.addEventListener('change', (e)=>{
      const on = !!e.target.checked;
      localStorage.setItem('animatedBg', on ? 'on' : 'off');
      document.body.classList.toggle('no-animated-bg', !on);
      if (window.__bg && typeof window.__bg.setEnabled === 'function') window.__bg.setEnabled(on);
      else {
        const grad = document.querySelector('.bg-gradient');
        const canvas = document.getElementById('bg-canvas');
        if (grad) grad.style.display = on ? '' : 'none';
        if (canvas) canvas.style.display = on ? '' : 'none';
      }
    });

    // Load saved values for bg toggle
    const bgEnabled = localStorage.getItem('animatedBg') !== 'off';
    if (!bgEnabled){ document.body.classList.add('no-animated-bg'); window.__bg && window.__bg.setEnabled(false); }
    if (optBg) optBg.checked = bgEnabled;

    // Reset button
    const resetBtn = $('#settings-reset');
    resetBtn && resetBtn.addEventListener('click', ()=>{
      ['theme', 'animatedBg', 'accentHue', 'analytics'].forEach(k => localStorage.removeItem(k));
      // Defaults
      window.__setThemePref('system');
      themeRadios.forEach(r=> r.checked = (r.value==='system'));
      document.body.classList.remove('no-animated-bg');
      if (optBg) optBg.checked = true;
      if (window.__bg && window.__bg.setEnabled) window.__bg.setEnabled(true);
      if (accent) accent.value = '275'; if (window.__setAccentHue) window.__setAccentHue(275);
      if (optAnalytics) optAnalytics.checked = false;
    });
  });
})();;


// ===== Tiny analytics (consent-based) =====
(function tinyAnalytics(){
  const storeKey = 'analytics';
  const enabled = () => localStorage.getItem(storeKey) === 'on';
  let eventsBound = false;

  function send(payload){
    // If you set window.ANALYTICS_ENDPOINT = 'https://your-endpoint/collect',
    // we'll POST a small JSON payload using sendBeacon.
    try{
      const ep = window.ANALYTICS_ENDPOINT;
      if (ep) navigator.sendBeacon(ep, new Blob([JSON.stringify(payload)], { type:'application/json' }));
    }catch(e){ /* no-op */ }
    // Also keep a rolling local log for quick checks
    const key = 'analyticsLocal';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(payload); if (arr.length > 50) arr.shift();
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function trackPage(){
    send({t:'page', path:location.pathname + location.hash, ts:Date.now(), ref:document.referrer});
  }
  function trackClick(e){
    const a = e.target.closest('a,button');
    if (!a) return;
    const label = a.getAttribute('aria-label') || a.textContent.trim().slice(0,60);
    send({t:'click', label, href: a.href || null, ts:Date.now()});
  }

  function bind(){
    if (eventsBound) return;
    eventsBound = true;
    window.addEventListener('click', trackClick, true);
    window.addEventListener('hashchange', trackPage);
    document.addEventListener('visibilitychange', ()=>{
      if (document.visibilityState === 'visible') trackPage();
    });
    trackPage();
    console.log('%cAnalytics enabled (local + optional beacon)', 'color: #888');
  }
  function unbind(){
    if (!eventsBound) return;
    eventsBound = false;
    window.removeEventListener('click', trackClick, true);
    window.removeEventListener('hashchange', trackPage);
    console.log('%cAnalytics disabled', 'color: #888');
  }

  window.__analytics = {
    enable(){ if (!enabled()) localStorage.setItem(storeKey,'on'); bind(); },
    disable(){ localStorage.setItem(storeKey,'off'); unbind(); },
  };
  // Auto-enable if consent already on
  if (enabled()) bind();
})();


