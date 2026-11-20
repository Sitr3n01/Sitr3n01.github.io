// ------------------------------------------------------------------ vídeo de apresentação (páginas de projeto)
// [data-sk-video] com <video> local ou data-sk-youtube="ID". O botão de vidro [data-sk-play] inicia o vídeo;
// o YouTube só é carregado (youtube-nocookie) depois do clique.
function mountVideos(root) {
  const offs = [];
  root.querySelectorAll('[data-sk-video]').forEach(fig => {
    const btn = fig.querySelector('[data-sk-play]');
    if (!btn) return;
    const video = fig.querySelector('video'), yt = fig.getAttribute('data-sk-youtube');
    const play = () => {
      fig.classList.add('is-playing');
      if (video) {
        video.controls = true;
        const p = video.play(); if (p && p.catch) p.catch(() => {});
        video.focus({ preventScroll: true });
      } else if (yt && !fig.querySelector('iframe')) {
        const f = document.createElement('iframe');
        f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0`;
        f.title = fig.getAttribute('data-sk-label') || fig.getAttribute('data-sk-title') || ''; // rótulo no idioma da página
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        fig.querySelector('.sk-video-frame').appendChild(f);
      }
    };
    btn.addEventListener('click', play); offs.push(() => btn.removeEventListener('click', play));
  });
  return { destroy() { offs.forEach(f => f()); } };
}
