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
    const st = { track, lens, segs, spy, rest: restIdx != null ? segs[+restIdx] : null, cur: null, rim: 0, hover: null, timer: 0 };

    st.place = (seg, instant) => {
      segs.forEach(s => s.classList.toggle('is-on', s === seg));
      if (!seg) { lens.classList.add('is-off'); st.cur = null; return; }
      const prev = st.cur, x = seg.offsetLeft, y = seg.offsetTop, w = seg.offsetWidth, h = seg.offsetHeight;
      if (instant || reduceG || !prev) lens.classList.add('no-anim');
      lens.classList.remove('is-off');
      lens.style.setProperty('--x', x + 'px'); lens.style.setProperty('--y', y + 'px');
      lens.style.setProperty('--w', w + 'px'); lens.style.setProperty('--h', h + 'px');
      if (prev && prev !== seg && !instant && !reduceG) {
        const dist = Math.abs(x - prev.offsetLeft) + Math.abs(y - prev.offsetTop);
        const dir = Math.sign(x - prev.offsetLeft || y - prev.offsetTop);
        st.rim += dir * Math.min(160, 60 + dist * 0.35);
        lens.style.setProperty('--rim', st.rim + 'deg');
        lens.style.setProperty('--sx', String(1 + Math.min(0.2, dist / 700)));
        lens.style.setProperty('--sy', String(1 - Math.min(0.14, dist / 1000)));
        clearTimeout(st.timer);
        st.timer = setTimeout(() => { lens.style.setProperty('--sx', '1'); lens.style.setProperty('--sy', '1'); }, 170);
      }
      st.cur = seg;
      if (lens.classList.contains('no-anim')) { void lens.offsetWidth; lens.classList.remove('no-anim'); }
    };
    st.settle = instant => st.place(st.hover || st.rest, instant);

    segs.forEach(seg => {
      on(seg, 'pointerenter', () => { st.hover = seg; st.settle(); });
      on(seg, 'focus', () => { st.hover = seg; st.settle(); });
      on(seg, 'blur', () => { if (st.hover === seg) st.hover = null; st.settle(); });
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

  // scroll spy: a seção que cruza 40% da altura da tela é a ativa
  const spies = tracks.filter(t => t.spy);
  let sraf = 0;
  const spyNow = () => {
    sraf = 0;
    const probe = scroller.scrollTop + scroller.clientHeight * 0.4;
    for (const t of spies) {
      let found = null;
      for (const seg of t.segs) {
        const href = seg.getAttribute('href') || '';
        const target = href.startsWith('#') && href.length > 1 ? root.querySelector(href) : null;
        if (target && target.offsetTop <= probe && probe < target.offsetTop + target.offsetHeight) found = seg;
      }
      if (found !== t.rest) { t.rest = found; t.settle(); }
    }
  };
  if (spies.length) { on(scroller, 'scroll', () => { if (!sraf) sraf = requestAnimationFrame(spyNow); }, { passive: true }); spyNow(); }

  const relayout = () => tracks.forEach(t => t.settle(true));
  tracks.forEach(t => t.settle(true));
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
  if (ro) tracks.forEach(t => ro.observe(t.track));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  return {
    destroy() { offs.forEach(f => f()); if (ro) ro.disconnect(); cancelAnimationFrame(sraf); tracks.forEach(t => clearTimeout(t.timer)); },
  };
}
