// ------------------------------------------------------------------ vidro líquido (nav e contato)
// Trilho [data-sk-glass] com uma lente .sk-lens que desliza até o item .sk-seg ativo.
// A lente estica na direção do movimento (efeito "gelatina") e gira o reflexo iridescente da borda.
//   data-sk-glass="spy"   → o item ativo segue a seção visível (href="#id"); sem seção, a lente some
//   data-sk-glass-rest=N  → índice do item onde a lente descansa quando não há hover/foco
function mountGlass(root, scroller) {
  const reduceG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offs = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };

  const tracks = Array.from(root.querySelectorAll('[data-sk-glass]')).map(track => {
    const lens = track.querySelector('.sk-lens');
    const segs = Array.from(track.querySelectorAll('.sk-seg'));
    const spy = track.dataset.skGlass === 'spy';
    const restIdx = track.dataset.skGlassRest;
    const st = { track, lens, segs, spy, rest: restIdx != null ? segs[+restIdx] : null, cur: null, rim: 0, hover: null, focus: null, timer: 0 };

    st.place = (seg, instant) => {
      segs.forEach(s => s.classList.toggle('is-on', s === seg));
      if (!seg) { lens.classList.add('is-off'); st.cur = null; return; }
      const prev = st.cur, x = seg.offsetLeft, y = seg.offsetTop, w = seg.offsetWidth, h = seg.offsetHeight;
      if (instant || reduceG || !prev) {
        clearTimeout(st.timer);
        lens.classList.add('no-anim');
        lens.style.setProperty('--sx', '1');
        lens.style.setProperty('--sy', '1');
      }
      lens.classList.remove('is-off');
      lens.style.setProperty('--x', x + 'px'); lens.style.setProperty('--y', y + 'px');
      lens.style.setProperty('--w', w + 'px'); lens.style.setProperty('--h', h + 'px');
      if (prev && prev !== seg && !instant && !reduceG) {
        const dist = Math.abs(x - prev.offsetLeft) + Math.abs(y - prev.offsetTop);
        const dir = Math.sign(x - prev.offsetLeft || y - prev.offsetTop);
        st.rim += dir * Math.min(160, 60 + dist * 0.35);
        lens.style.setProperty('--rim', st.rim + 'deg');
        const space = Math.max(0, Math.min(x, track.clientWidth - x - w));
        lens.style.setProperty('--sx', String(1 + Math.min(0.2, dist / 700, 2 * space / Math.max(1, w))));
        lens.style.setProperty('--sy', String(1 - Math.min(0.14, dist / 1000)));
        clearTimeout(st.timer);
        st.timer = setTimeout(() => { lens.style.setProperty('--sx', '1'); lens.style.setProperty('--sy', '1'); }, 170);
      }
      st.cur = seg;
      if (lens.classList.contains('no-anim')) { void lens.offsetWidth; lens.classList.remove('no-anim'); }
    };
    st.settle = instant => st.place(st.hover || (st.focus?.matches(':focus-visible') ? st.focus : st.rest), instant);

    segs.forEach(seg => {
      on(seg, 'pointerenter', event => { if (event.pointerType !== 'touch') { st.hover = seg; st.settle(); } });
      on(seg, 'focus', () => { st.focus = seg; st.settle(); });
      on(seg, 'blur', () => { st.focus = null; st.settle(); });
    });
    on(track, 'pointerleave', () => { st.hover = null; st.settle(); });
    return st;
  });

  // lente avulsa (botão "Contato +"): o reflexo gira no hover
  root.querySelectorAll('.sk-lens-btn').forEach(btn => {
    let rim = 0;
    const spin = d => { rim += d; btn.style.setProperty('--rim', rim + 'deg'); };
    on(btn, 'pointerenter', () => spin(140)); on(btn, 'pointerleave', () => spin(-140));
  });

  // scroll spy contínuo: vale o último destino da nav que já passou de 40% da tela. Seções sem botão
  // (manifesto, áreas) continuam no item anterior; um destino fora do trilho (o botão Contato) apaga a lente.
  const spies = tracks.filter(t => t.spy);
  const idOf = a => { const h = a.getAttribute('href') || ''; return h.startsWith('#') && h.length > 1 ? h.slice(1) : null; };
  // destinos da nav e seus topos ficam em cache; só são medidos de novo quando o layout muda
  let sraf = 0, anchors = null, viewH = 0;
  const measureAnchors = () => {
    viewH = scroller.clientHeight;
    anchors = Array.from(root.querySelectorAll('header a[href^="#"]'), a => {
      const id = idOf(a), target = id && root.querySelector('#' + CSS.escape(id));
      return target ? { id, top: target.offsetTop } : null;
    }).filter(Boolean);
  };
  const spyNow = () => {
    sraf = 0;
    if (!anchors) measureAnchors();
    const probe = scroller.scrollTop + viewH * 0.4;
    let last = null, lastTop = -Infinity;
    for (const a of anchors) if (a.top <= probe && a.top >= lastTop) { last = a.id; lastTop = a.top; }
    for (const t of spies) {
      const found = last ? t.segs.find(seg => idOf(seg) === last) || null : null;
      if (found !== t.rest) { t.rest = found; t.settle(); }
    }
  };
  const scrollEvents = scroller === document.scrollingElement ? window : scroller;
  if (spies.length) { on(scrollEvents, 'scroll', () => { if (!sraf) sraf = requestAnimationFrame(spyNow); }, { passive: true }); spyNow(); }

  const relayout = () => tracks.forEach(t => t.settle(true));
  tracks.forEach(t => t.settle(true));
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    if (entries.some(e => !e.target.matches('[data-sk-glass]'))) { anchors = null; if (spies.length && !sraf) sraf = requestAnimationFrame(spyNow); }
    relayout();
  }) : null;
  if (ro) {
    tracks.forEach(t => ro.observe(t.track));
    // o conteúdo que rola: a raiz quando a página rola o documento, senão o filho do scroller interno
    const content = scroller === document.scrollingElement ? root : scroller.firstElementChild;
    if (spies.length) { ro.observe(scroller); if (content) ro.observe(content); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { anchors = null; relayout(); if (spies.length) spyNow(); });

  return {
    destroy() { offs.forEach(f => f()); if (ro) ro.disconnect(); cancelAnimationFrame(sraf); tracks.forEach(t => clearTimeout(t.timer)); },
  };
}
