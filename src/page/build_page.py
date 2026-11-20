"""Gera o site a partir da mesma marcação:
   - index.html                    (página inicial)
   - projetos/<slug>/index.html    (uma página por projeto, de src/content/projetos/*.md)
   - Main.dc.html                  (artboard do canvas de Design, opcional)
"""
import html, json, urllib.parse
from content import inline, load_projects

INK, PARCH, PAPER, ASH = '#1d1d1d', '#e5e4e0', '#ffffff', '#bfbebe'
SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace"
JP = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif"
PADX = 'clamp(19px, 4vw, 76px)'
CAP = f"font-size: 11px; line-height: 1.4; letter-spacing: 0.05em; text-transform: uppercase"
E = html.escape


def letters(text):
    """Uma letra por span (animadas uma a uma); as palavras ficam inteiras e separadas por espaço de verdade,
    para a linha poder quebrar entre palavras em telas estreitas."""
    letter = '<span data-sk-letter="1" style="display: inline-block; will-change: transform">{}</span>'
    return ' '.join(f'<span style="display: inline-block; white-space: nowrap">{"".join(letter.format(E(ch)) for ch in w)}</span>'
                    for w in text.split())


def words(text):
    return ' '.join(f'<span data-sk-word="1" style="display: inline-block; margin-right: 0.22em; will-change: transform">{E(w)}</span>'
                    for w in text.split())


MENU_LINKS = (
    ('inicio', 'Início', 'm2 8 6-5 6 5v6H2zM7 14v-4h2v4'),
    ('sobre', 'Sobre', 'M10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0ZM3 14v-1a5 3.5 0 0 1 10 0v1'),
    ('projetos', 'Projetos', 'M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z'),
    ('trajetoria', 'Trajetória', 'M4 5.5v5m0-8A1.5 1.5 0 1 0 4 5.5a1.5 1.5 0 0 0 0-3ZM4 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8 4h5m-5 8h5'),
    ('contato', 'Contato', 'M2 4h12v8H2zm0 0 6 4 6-4'),
)


def nav_icon(path):
    return (f'<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
            f'stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{path}"/></svg>')


def nav(base=''):
    spy = 'spy' if not base else 'links'
    mobile_links = ''.join(f'<a href="{base}#{id}">{nav_icon(icon)}<span>{label}</span></a>'
                           for id, label, icon in MENU_LINKS)
    return f'''
<div class="sk-topblur sk-blurfx" data-sk-ui="1" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<header class="sk-toolbar" data-sk-ui="1" style="position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; gap: 19px; padding: 19px {PADX}; pointer-events: none">
<a class="sk-logo" href="{base}#inicio" style="pointer-events: auto">SITR3N.</a>
<nav class="sk-desktop-nav" aria-label="Seções" style="pointer-events: auto; display: flex; align-items: center; gap: 10px">
<div class="sk-glass sk-track sk-navlinks" data-sk-glass="{spy}">
<span class="sk-lens" aria-hidden="true"></span>
<a class="sk-seg" href="{base}#inicio">Início</a>
<a class="sk-seg" href="{base}#sobre">Sobre</a>
<a class="sk-seg" href="{base}#projetos">Projetos</a>
<a class="sk-seg" href="{base}#trajetoria">Trajetória</a>
</div>
<a class="sk-lens-btn" href="{base}#contato">Contato +</a>
</nav>
<button type="button" class="sk-menu-toggle sk-lens-btn" data-sk-menu-open aria-controls="sk-mobile-menu" aria-expanded="false">Menu {nav_icon('M2 5h12M2 8h12M2 11h12')}</button>
<dialog id="sk-mobile-menu" class="sk-menu" data-sk-menu aria-label="Menu de navegação">
<div class="sk-menu-head">
<span class="sk-logo" aria-hidden="true">SITR3N.</span>
<button type="button" class="sk-menu-close sk-lens-btn" data-sk-menu-close autofocus aria-label="Fechar menu">{nav_icon('m3.5 3.5 9 9m0-9-9 9')}</button>
</div>
<nav class="sk-menu-links" aria-label="Seções e contato">
{mobile_links}
<a href="{E(WA_HREF)}" target="_blank" rel="noopener" aria-label="WhatsApp (abre em nova aba)">{WA_ICON}<span>WhatsApp</span><span class="sk-menu-external" aria-hidden="true">↗</span></a>
</nav>
</dialog>
</header>'''

HERO = f'''
<section id="inicio" data-sk-view="hero" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 96px {PADX} 96px; box-sizing: border-box">
<h1 aria-label="Penso como artista. Construo como engenheiro." style="margin: 0; font-weight: 400; font-size: clamp(36px, 5.4vw, 96px); line-height: 0.96; letter-spacing: -0.015em; text-transform: uppercase; color: {INK}">
<span aria-hidden="true" style="display: block">{letters("PENSO COMO ARTISTA.")}</span>
<span aria-hidden="true" style="display: block">{letters("CONSTRUO COMO ENGENHEIRO.")}</span>
</h1>
</section>'''

MANIFESTO = f'''
<section id="manifesto" data-sk-view="manifesto" style="position: relative; height: max(1700px, 150vh)">
<div style="position: sticky; top: 0; height: 100vh; display: flex; align-items: center; padding: 0 {PADX}; box-sizing: border-box">
<p style="margin: 0; max-width: 17em; line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; color: {INK}">{words("Do sistema invisível à interface que encanta. Engenharia, design e movimento em cada detalhe.")}</p>
</div>
</section>'''

# cada item precisa aparecer em algum projeto do site; 10 itens = 2 linhas de 5 (ou 5 de 2), ver .sk-stack
STACK = [('Python', 'Back-end'), ('Django + Wagtail', 'Web e CMS'), ('PostgreSQL', 'Dados'), ('Go', 'Servidores'),
         ('llama.cpp + MCP', 'IA local'), ('C#', 'Jogos e desktop'), ('Unity 6', 'Jogos'), ('Netcode + EOS', 'Multiplayer'),
         ('three.js + GSAP', 'Movimento'), ('Docker + CI', 'Infra')]
cells = '\n'.join(f'''<div class="sk-cell" style="background-color: {PAPER}; min-width: 0; min-height: 112px; padding: 19px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box">
<span style="font-size: 18px; line-height: 1.2">{E(n)}</span>
<span class="sk-cap" style="{CAP}">{E(c)}</span>
</div>''' for n, c in STACK)

ABOUT = f'''
<section id="sobre" data-sk-view="about" style="position: relative; padding: 119px {PADX}">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 119px">
<div data-sk-read data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-start">
<div style="flex: 1 1 300px; display: flex; flex-direction: column; gap: 19px">
<p style="margin: 0; font-size: 15px; line-height: 1.4; letter-spacing: 0.013em; text-transform: uppercase; max-width: 26em">Desenvolvedor full-stack e formado em Jogos Digitais no IESB, em Brasília.</p>
<a class="sk-link" href="https://github.com/Sitr3n01" style="align-self: flex-start; font-size: 15px; color: {INK}; text-decoration: none; border-radius: 10px; padding: 5px 0">GitHub ↗</a>
</div>
<div style="flex: 1 1 420px; max-width: 640px">
<p style="margin: 0; font-size: 18px; line-height: 1.4; letter-spacing: 0.013em">Da lógica que sustenta um sistema à interface que o torna intuitivo, desenvolvo produtos digitais com atenção à técnica e à experiência. Atuo com web, desktop e jogos, com experiência nos projetos Loopia e ExoBeast durante seis meses no Brasília Game Hub. A fotografia amplia minha perspectiva sobre estética, composição e comunicação visual.</p>
</div>
</div>
<div data-sk-read data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 19px; align-items: flex-start">
<p style="flex: 0 0 140px; margin: 0; {CAP}">Stack<br>de trabalho</p>
<div class="sk-cq" style="flex: 1 1 560px; min-width: 0; max-width: 1200px">
<div class="sk-stack" style="display: flex; flex-wrap: wrap; gap: 1px; background-color: {ASH}; border: 1px solid {ASH}">
{cells}
</div>
</div>
</div>
</div>
</section>'''

PROJECTS = load_projects()


def ascii_stage(slug, base, style):
    """Palco dos objetos do projeto em ASCII (src/js/ascii.js). O nome de transição é o mesmo no card e na página
    do projeto: o palco voa de um para o outro e continua girando de onde parou."""
    return (f'<div class="sk-ascii" data-sk-ascii="{slug}" data-sk-ascii-src="{base}assets/ascii/" aria-hidden="true" '
            f'style="{style}; view-transition-name: sk-glyph-{slug}; view-transition-class: sk-ascii"><canvas></canvas></div>')


def card(p):
    slug = p['slug']
    return f'''<article class="sk-card" data-sk-read data-sk-reveal="1" style="background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 24px 24px; min-height: 560px; padding: 30px; box-sizing: border-box; display: flex; flex-direction: column; gap: 19px">
<div style="display: flex; justify-content: space-between; align-items: center">
<span style="{CAP}">{E(p['cap'])}</span>
<span class="sk-open" aria-hidden="true" style="{CAP}; display: inline-flex; align-items: center; gap: 10px">Ver projeto <span class="sk-plus" style="font-size: 24px; line-height: 1; display: inline-block">+</span></span>
</div>
{ascii_stage(slug, '', 'flex: 1 1 auto; min-height: 340px; margin: 0 -30px')}
<h3 style="margin: 0; font-weight: 400; font-size: clamp(34px, 3.2vw, 46px); line-height: 1; letter-spacing: 0.006em"><a class="sk-card-link" href="projetos/{slug}/" data-sk-project="{slug}"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></a></h3>
<p style="margin: 0; font-size: 15px; line-height: 1.4; max-width: 34em">{E(p['card'])}</p>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</article>'''


colA = '\n'.join(card(p) for p in PROJECTS[0::2])
colB = '\n'.join(card(p) for p in PROJECTS[1::2])
WORK = f'''
<section id="projetos" data-sk-view="work" style="position: relative; padding: 119px {PADX} 160px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 46px">
<div data-sk-read style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 19px">
<h2 style="margin: 0; font-weight: 400; {CAP}">Projetos em destaque</h2>
<a class="sk-lens-btn" href="https://github.com/Sitr3n01" rel="noopener">Todos no GitHub +</a>
</div>
<div data-sk-card-columns style="display: flex; flex-wrap: wrap; gap: 19px; align-items: flex-start">
<div style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 19px">
{colA}
</div>
<div data-sk-parallax="0.16" style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 19px; padding-top: 180px; will-change: transform">
{colB}
</div>
</div>
</div>
</section>'''

# termos que aparecem nos projetos do site (web, IA local, XGB, jogos) + fotografia; a órbita espalha pelo
# índice (ângulo áureo), então grupos vizinhos na lista não ficam juntos na tela
CHIPS = ['Django 5.2', 'Go', 'Unity 6', 'WPF', 'f/2.8',
         'Wagtail 7.4', 'llama.cpp', 'C#', 'DualSense', '1/250 s',
         'SELECT *', 'MCP', 'NetworkObject', 'steam://', 'ISO 400',
         'PostgreSQL', 'LLM local', 'EOS', 'HTMX', '35 mm',
         'Django ORM', '127.0.0.1', 'FMOD', 'three.js', 'GSAP',
         'docker compose up', '/v1/messages', 'NavMesh', 'CodeQL']


def chip(t):
    return (f'<span data-sk-chip="1" aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block; padding: 8px 12px; background-color: {PAPER}; border: 1px solid {ASH}; '
            f'font-family: {MONO}; font-size: 12px; line-height: 1.2; white-space: nowrap; color: {INK}">{E(t)}</span>')


chips = '\n'.join(chip(t) for t in CHIPS)
LBL = f"margin: 0; font-size: 15px; line-height: 1.1; letter-spacing: 0.013em; text-transform: uppercase; color: {INK}"
AREAS = f'''
<section id="areas" data-sk-view="areas" aria-label="Áreas de trabalho" style="position: relative; height: max(2600px, 120vh)">
<div style="position: sticky; top: 0; height: 100vh; overflow: hidden">
<div data-sk-orbit="1" style="position: absolute; left: 50%; top: 48%; width: 0; height: 0">
{chips}
</div>
<div class="sk-area-labels">
<p data-sk-orbit-label="1" style="{LBL}; left: 18%; top: 24%">Full-<br>stack</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 72%; top: 20%">Jogos<br>Unity</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 76%; top: 66%">IA<br>local</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 26%; top: 70%">Foto-<br>grafia</p>
</div>
<h2 class="sk-area-title" style="position: absolute; left: {PADX}; margin: 0; font-weight: 400; line-height: 0.8; letter-spacing: -0.01em; text-transform: uppercase; color: {INK}">Frentes de<br>trabalho.</h2>
</div>
</section>'''

PATH_ROWS = [
    ('01', 'Brasília Game Hub', ['6 meses', 'Loopia', 'ExoBeast']),
    ('02', 'IESB', ['Tecnólogo em Jogos Digitais', 'Concluído em 2026']),
    ('03', 'Game jams', ['2 participações']),
    ('04', 'Komuniki e Blog da Kelly', ['Dois sites para um cliente real', 'No ar desde jun. 2026']),
]
rows = '\n'.join(f'''<li class="sk-row" data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 8px 19px; align-items: flex-start; padding: 30px 0; border-top: 1px solid {ASH}">
<span style="flex: 0 0 48px; {CAP}">{n}</span>
<span class="sk-row-t" style="flex: 1 1 260px; font-size: clamp(24px, 2.6vw, 34px); line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; display: inline-block">{E(t)}</span>
<span style="flex: 0 1 260px; margin-left: auto; {CAP}; text-align: right">{'<br>'.join(E(d) for d in ds)}</span>
</li>''' for n, t, ds in PATH_ROWS)

PATH = f'''
<section id="trajetoria" data-sk-view="path" style="position: relative; padding: 119px {PADX}">
<div data-sk-read style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px">
<h2 style="flex: 0 0 200px; margin: 0; font-weight: 400; {CAP}">Trajetória<br>+ formação</h2>
<ol style="flex: 1 1 560px; list-style: none; margin: 0; padding: 0; border-bottom: 1px solid {ASH}">
{rows}
</ol>
</div>
</section>'''

CONTACT = f'''
<section id="contato" data-sk-read data-sk-view="contact" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 119px {PADX} 30px; box-sizing: border-box">
<h2 data-sk-reveal="1" style="margin: 0; font-weight: 400; line-height: 0.8; letter-spacing: -0.015em; text-transform: uppercase">Vamos<br>conversar.</h2>
<div class="sk-glass sk-track sk-track-lg" data-sk-glass="links" data-sk-glass-rest="0" style="align-self: flex-start">
<span class="sk-lens" aria-hidden="true"></span>
<a class="sk-seg" href="https://github.com/Sitr3n01">GitHub <span class="sk-seg-sub">Sitr3n01</span> ↗</a>
<a class="sk-seg" href="https://www.linkedin.com/in/sitr3n">LinkedIn <span class="sk-seg-sub">/in/sitr3n</span> ↗</a>
<a class="sk-seg" href="mailto:zegilfarias@outlook.com">E-mail <span class="sk-seg-sub">zegilfarias@outlook.com</span></a>
</div>
<footer class="sk-footblur">
<div class="sk-blurfx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<span style="{CAP}">© 2026 Sitr3n</span>
</footer>
</section>'''

# "Scroll" centralizado na base, com a seta descendo e subindo (para em prefers-reduced-motion). É um botão: cada
# clique avança até uma próxima parada de leitura; some no fim da página (controller.js)
HINT = f'''<button type="button" data-sk-hint="1" data-sk-ui="3" class="sk-hint" aria-label="Ir para a próxima seção">
<span style="{CAP}; color: {INK}">Scroll</span>
<svg class="sk-hint-arrow" width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="{INK}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 1v19M1.5 14.5 7 20l5.5-5.5"/></svg>
</button>'''

# WhatsApp fixo no canto inferior direito (fora do scroller, como a nav), em vidro líquido. A logo é
# monocromática, na tinta do site: a paleta não tem o verde da marca. Abre a conversa com a mensagem pronta.
WA_PHONE = '5561996805059'
WA_TEXT = 'Olá! Vi seu portfólio e quero conversar sobre um projeto.'
WA_HREF = f'https://wa.me/{WA_PHONE}?text={urllib.parse.quote(WA_TEXT)}'
# logo: anel com o rabicho numa peça só (contorno externo menos o círculo interno, sem emenda) e o fone no meio
WA_RING = 'M2.1 21.9l1.35-5.05A9.9 9.9 0 1 1 7.2 20.55zM12 3.9a8.1 8.1 0 1 0 0 16.2a8.1 8.1 0 1 0 0-16.2z'
WA_PHONE_ICON = ('M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20'
                 'c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z')
WA_ICON = (f'<svg class="sk-wa-i" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">'
           f'<path d="{WA_RING}" fill="{INK}" fill-rule="evenodd"/>'
           f'<path d="{WA_PHONE_ICON}" fill="{INK}" transform="translate(12 12) scale(0.44) translate(-12 -12)"/></svg>')
# a entrada da interface (data-sk-ui) fica no invólucro: no próprio botão, a transição dela substituiria a do vidro
WA = (f'<div class="sk-wa-wrap" data-sk-ui="2"><a class="sk-lens-btn sk-wa" href="{E(WA_HREF)}" target="_blank" rel="noopener" '
      f'aria-label="Fale comigo no WhatsApp: orçamentos e contratações (abre em nova aba)">{WA_ICON}</a></div>')

RINGS = f'''<svg data-sk-rings="1" aria-hidden="true" width="1" height="1" style="position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none">
<circle cx="0" cy="0" r="230" style="fill: none; stroke: {ASH}; stroke-width: 1"></circle>
<circle cx="0" cy="0" r="360" style="fill: none; stroke: {ASH}; stroke-width: 1"></circle>
<circle cx="0" cy="0" r="520" style="fill: none; stroke: {ASH}; stroke-width: 1; stroke-opacity: 0.6"></circle>
</svg>'''


def body(ref=''):
    return f'''<div data-sk-root="1"{ref} style="position: relative; height: 100vh; overflow: hidden; background-color: {PARCH}; color: {INK}; font-family: {SANS}">
{RINGS}
<canvas data-sk-canvas="1" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block"></canvas>
<div data-sk-scroller="1" style="position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth">
<main>
{HERO}
{MANIFESTO}
{ABOUT}
{WORK}
{AREAS}
{PATH}
{CONTACT}
</main>
</div>
{nav()}
{HINT}
{WA}
</div>'''


GRID_BG = f"background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 24px 24px"


def video_block(p, base):
    title = E(p['titulo'])
    attrs, play = '', ''
    if p['video']:
        poster = f' poster="{base}{p["poster"]}"' if p['poster'] else ''
        media = f'<video class="sk-video-media" preload="metadata" playsinline{poster} src="{base}{p["video"]}" aria-label="Vídeo de apresentação: {title}"></video>'
        play = '<div class="sk-play-wrap"><button type="button" class="sk-lens-btn" data-sk-play="1">▶ Assistir apresentação</button></div>'
    elif p['youtube']:
        yt = E(p['youtube'])
        thumb = f'{base}{p["poster"]}' if p['poster'] else f'https://i.ytimg.com/vi/{yt}/hqdefault.jpg'
        media = f'<img class="sk-video-media" src="{thumb}" alt="" loading="lazy">'
        play = '<div class="sk-play-wrap"><button type="button" class="sk-lens-btn" data-sk-play="1">▶ Assistir apresentação</button></div>'
        attrs = f' data-sk-youtube="{yt}"'
    else:
        media = (f'<div class="sk-video-empty"><span class="sk-video-k" aria-hidden="true">{p["kanji"]}</span>'
                 f'<p style="margin: 0; {CAP}; color: #5f5f5d">Vídeo de apresentação em produção</p></div>')
    return f'''<figure class="sk-video" data-sk-read data-sk-video="1" data-sk-reveal="1" data-sk-title="{title}"{attrs}>
<div class="sk-video-frame" style="{GRID_BG}">{media}{play}</div>
<figcaption style="{CAP}">Apresentação — {title}</figcaption>
</figure>'''


def grid_attrs(n):
    """Células por linha de uma grade de fatos/números: todas numa linha só até 4, senão duas linhas
    equilibradas (5 → 3 + 2, 6 → 3 + 3). Com pouco espaço, só contagens pares passam por 2 por linha,
    para nenhuma célula ficar sozinha e esticada."""
    per_row = n if n <= 4 else -(-n // 2)
    pair = ' data-pair' if n % 2 == 0 and per_row > 2 else ''
    return f'data-c="{per_row}"{pair}'


def project_body(p, nxt):
    slug, base = p['slug'], '../../'
    facts = [('Papel', p.get('papel', '')), ('Período', p.get('periodo', '')), ('Status', p.get('status', '')), ('Stack', ', '.join(p['stack']))]
    facts = [(k, v) for k, v in facts if v]
    facts_html = '\n'.join(f'<div class="sk-fact"><span style="{CAP}; color: #5f5f5d">{k}</span><span class="sk-fact-v">{inline(v)}</span></div>'
                           for k, v in facts)
    secs = []
    for sec in p['sections']:
        if 'stats' in sec:
            inner = f'<div class="sk-cq"><div class="sk-stats" {grid_attrs(len(sec["stats"]))}>' + ''.join(
                f'<div class="sk-stat"><span class="sk-stat-v">{E(v)}</span><span style="{CAP}">{inline(l)}</span></div>' for v, l in sec['stats']) + '</div></div>'
        else:
            inner = f'<div class="sk-prose">{sec["html"]}</div>'
        secs.append(f'<div class="sk-sec" data-sk-read data-sk-reveal="1"><h2>{E(sec["title"])}</h2><div>{inner}</div></div>')
    links = []
    if p.get('repo'):
        links.append(f'<a class="sk-seg" href="{E(p["repo"])}" rel="noopener">Repositório <span class="sk-seg-sub">GitHub</span> ↗</a>')
    for site in (u.strip() for u in p.get('site', '').split(',')):  # um ou mais sites, separados por vírgula
        if not site:
            continue
        host = site.split('//', 1)[-1].split('/', 1)[0]
        links.append(f'<a class="sk-seg" href="{E(site)}" rel="noopener">Site <span class="sk-seg-sub">{E(host)}</span> ↗</a>')
    # um link só: botão de vidro avulso, que cresce e gira o reflexo no hover (num trilho, a lente já estaria parada
    # nele e nada mudaria). A entrada (data-sk-reveal) fica no invólucro, para o transform dela não travar o hover.
    if len(links) == 1:
        solo = links[0].replace('class="sk-seg"', 'class="sk-lens-btn sk-lens-btn-lg"')
        links_html = f'<div data-sk-read data-sk-reveal="1" style="align-self: flex-start">{solo}</div>'
    else:
        links_html = (f'''<div class="sk-glass sk-track sk-track-lg" data-sk-read data-sk-glass="links" data-sk-glass-rest="0" data-sk-reveal="1" style="align-self: flex-start">
<span class="sk-lens" aria-hidden="true"></span>
{''.join(links)}
</div>''') if links else ''
    ns = nxt['slug']
    return f'''
<section id="inicio" data-sk-view="proj" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--sk-project-top,184px) {PADX} 150px; box-sizing: border-box">
<div class="sk-project-hero" style="max-width: 1400px; width: 100%; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-end; justify-content: space-between">
<div class="sk-project-copy" data-sk-read style="flex: 1 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 30px">
<a class="sk-link sk-project-back" href="{base}#projetos" style="align-self: flex-start; {CAP}; color: {INK}; text-decoration: none; padding: 5px 0">← Todos os projetos</a>
<p style="margin: 0; {CAP}">{E(p['cap'])} · {inline(p.get('status', ''))}</p>
<h1 style="margin: 0; font-weight: 400; font-size: clamp(44px, 7.4vw, 120px); line-height: 0.9; letter-spacing: -0.015em; overflow-wrap: anywhere"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></h1>
<div class="sk-lead">{p['lead']}</div>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</div>
<div class="sk-tile" style="{GRID_BG}" aria-hidden="true">{ascii_stage(slug, base, 'position: absolute; inset: 0')}</div>
</div>
</section>
<section id="detalhes" data-sk-view="projbody" style="position: relative; padding: 46px {PADX} 119px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 76px">
{video_block(p, base)}
<div class="sk-cq" data-sk-read data-sk-reveal="1"><div class="sk-facts" {grid_attrs(len(facts))}>
{facts_html}
</div></div>
{''.join(secs)}
{links_html}
</div>
</section>
<section id="proximo" data-sk-view="projnext" style="position: relative; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 30px {PADX} 30px; box-sizing: border-box">
<a class="sk-next" data-sk-read href="../{ns}/">
<span style="flex: 1 1 100%; {CAP}">Próximo projeto · {E(nxt['cap'])}</span>
<span class="sk-next-t"><span style="display: inline-block; view-transition-name: sk-title-{ns}">{E(nxt['titulo'])}</span> →</span>
</a>
<footer class="sk-footblur">
<div class="sk-blurfx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<span style="{CAP}">© 2026 Sitr3n</span>
<a class="sk-link" href="{base}#contato" style="{CAP}; text-decoration: none">Vamos conversar ↗</a>
</footer>
</section>'''


def project_root(p, nxt):
    return f'''<div data-sk-root="1" style="position: relative; height: 100vh; overflow: hidden; background-color: {PARCH}; color: {INK}; font-family: {SANS}">
{RINGS}
<canvas data-sk-canvas="1" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block"></canvas>
<div data-sk-scroller="1" style="position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth">
<main>
{project_body(p, nxt)}
</main>
</div>
{nav('../../')}
{HINT}
{WA}
</div>'''


JP_CHARS = '桜木林森さくらヽゝ゜' + ''.join(dict.fromkeys(p['kanji'] for p in PROJECTS))
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet">\n'
         f'<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&amp;text={urllib.parse.quote(JP_CHARS)}&amp;display=swap" rel="stylesheet">')
CSS = f'''body{{margin:0;background:{PARCH}}}
a{{color:{INK}}}a:hover{{color:{INK}}}
a:focus-visible{{outline:2px solid {INK};outline-offset:3px}}
[data-sk-scroller]{{scrollbar-width:thin;scrollbar-color:{ASH} transparent}}
.sk-link:hover{{text-decoration:underline;text-underline-offset:4px}}
.sk-pill{{transition:background-color .25s ease,color .25s ease}}.sk-pill:hover{{background-color:{INK};color:{PARCH}}}
.sk-card .sk-plus{{transition:transform .45s cubic-bezier(.2,.7,.2,1)}}.sk-card:hover .sk-plus{{transform:rotate(90deg)}}
.sk-cell{{transition:background-color .25s ease,color .25s ease}}.sk-cell:hover{{background-color:{INK}!important;color:{PARCH}}}
.sk-cap{{color:#5f5f5d}}.sk-cell:hover .sk-cap{{color:{ASH}}}
.sk-row .sk-row-t{{transition:transform .45s cubic-bezier(.2,.7,.2,1)}}.sk-row:hover .sk-row-t{{transform:translateX(19px)}}
@media (prefers-reduced-motion:reduce){{[data-sk-scroller]{{scroll-behavior:auto!important}}}}''' + '''
/* ---- vidro líquido: trilho fosco + lente refrativa ---- */
@property --rim{syntax:'<angle>';inherits:true;initial-value:0deg}
.sk-toolbar{--sk-track-tint:.55;--sk-track-blur:14px;--sk-lens-center:.92;--sk-lens-mid:.75}
.sk-glass{position:relative;border-radius:999px;background-color:rgba(229,228,224,var(--sk-track-tint,.44));
  -webkit-backdrop-filter:blur(var(--sk-track-blur,9px)) saturate(1.25);backdrop-filter:blur(var(--sk-track-blur,9px)) saturate(1.25);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),inset 0 1px 3px rgba(29,29,29,.07),0 0 0 1px rgba(29,29,29,.06),0 1px 0 rgba(255,255,255,.8)}
.sk-logo{display:inline-block;padding:12px 0;font-size:22px;font-weight:700;line-height:1;letter-spacing:-.02em;text-decoration:none;color:#1d1d1d}
.sk-track{display:inline-flex;align-items:center;gap:2px;padding:4px}
.sk-track-lg{flex-wrap:wrap;max-width:100%;box-sizing:border-box}
.sk-seg{position:relative;z-index:1;display:inline-block;padding:10px 18px;border-radius:999px;font-size:11px;line-height:1.4;letter-spacing:.05em;text-transform:uppercase;
  color:#5f5f5d;text-decoration:none;white-space:nowrap;transition:color .35s ease}
.sk-seg.is-on,.sk-seg:hover{color:#1d1d1d}
.sk-track-lg .sk-seg{padding:14px 24px;font-size:15px;letter-spacing:.013em;text-transform:none}
.sk-seg-sub{color:#5f5f5d;transition:color .35s ease}
.sk-lens-btn.sk-lens-btn-lg{padding:18px 28px;font-size:15px;letter-spacing:.013em;text-transform:none}
.sk-seg:focus-visible,.sk-lens-btn:focus-visible,.sk-logo:focus-visible{outline:2px solid #1d1d1d;outline-offset:3px}

/* lente: corpo claro, borda grossa que refrata, reflexo quente no topo e brilho iridescente girando nos cantos */
.sk-lens,.sk-lens-btn{--sx:1;--sy:1;border-radius:999px;
  background:radial-gradient(120% 90% at 50% 50%,rgba(236,235,232,var(--sk-lens-center,.76)) 55%,rgba(250,250,248,var(--sk-lens-mid,.63)) 78%,rgba(255,255,255,.95) 100%);
  -webkit-backdrop-filter:blur(2px) saturate(1.8) brightness(1.05);backdrop-filter:blur(2px) saturate(1.8) brightness(1.05);
  box-shadow:inset 0 0 0 1px #fff,inset 0 0 2px 3px rgba(255,255,255,.8),inset 0 0 6px 5px rgba(29,29,29,.07),
    inset 0 5px 6px -3px #fff,inset 0 -6px 8px -4px rgba(29,29,29,.2),
    inset 7px 0 9px -7px rgba(29,29,29,.16),inset -7px 0 9px -7px rgba(29,29,29,.16),
    0 0 0 1px rgba(29,29,29,.05),0 1px 1px rgba(29,29,29,.08),0 8px 18px -8px rgba(29,29,29,.3)}
.sk-lens{position:absolute;left:0;top:0;z-index:0;pointer-events:none;width:var(--w,0);height:var(--h,0);
  transform:translate3d(var(--x,0),var(--y,0),0) scale(var(--sx),var(--sy));
  transition:transform .62s cubic-bezier(.3,1.45,.5,1),width .62s cubic-bezier(.3,1.35,.5,1),height .62s cubic-bezier(.3,1.35,.5,1),opacity .3s ease,--rim .9s cubic-bezier(.3,1,.4,1)}
.sk-lens.is-off{opacity:0;transform:translate3d(var(--x,0),var(--y,0),0) scale(.6,.6)}
.sk-lens.no-anim{transition:none}
.sk-lens-btn{position:relative;display:inline-block;padding:13px 22px;font-size:11px;line-height:1.4;letter-spacing:.05em;text-transform:uppercase;
  color:#1d1d1d;text-decoration:none;white-space:nowrap;transition:transform .5s cubic-bezier(.3,1.5,.5,1),--rim .9s cubic-bezier(.3,1,.4,1)}
.sk-lens-btn:hover{transform:scale(1.04)}.sk-lens-btn:active{transform:scale(.97)}
.sk-lens::before,.sk-lens-btn::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:2.5px;pointer-events:none;
  background:conic-gradient(from var(--rim),rgba(255,255,255,0) 18deg,rgba(250,203,14,.55) 30deg,rgba(240,107,168,.5) 38deg,rgba(120,186,230,.6) 46deg,rgba(255,255,255,0) 58deg,
    rgba(255,255,255,0) 198deg,rgba(120,186,230,.5) 210deg,rgba(240,107,168,.45) 218deg,rgba(250,203,14,.5) 226deg,rgba(255,255,255,0) 238deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;filter:blur(.7px)}
.sk-lens::after,.sk-lens-btn::after{content:"";position:absolute;left:16%;right:16%;top:2px;height:4px;border-radius:4px;pointer-events:none;
  background:linear-gradient(90deg,rgba(255,246,220,0),rgba(255,246,220,.95) 22%,#fff 50%,rgba(255,246,220,.95) 78%,rgba(255,246,220,0));filter:blur(1.2px)}
@media (max-width:720px){.sk-track-lg{flex-direction:column;align-items:stretch;align-self:stretch!important;border-radius:30px}
  .sk-track-lg .sk-seg{padding:14px 20px}}
@media (prefers-reduced-motion:reduce){.sk-lens,.sk-lens-btn,.sk-seg{transition:none!important}}

/* ---- abertura: a interface entra depois que a sakura floresce ---- */
[data-sk-ui]{transition:opacity .9s ease,transform 1s cubic-bezier(.2,.7,.2,1)}
[data-sk-ui="2"]{transition-delay:.15s}[data-sk-ui="3"]{transition-delay:.3s}
[data-sk-intro="on"] [data-sk-ui]{opacity:0!important;transform:translate3d(0,-10px,0);transition:none}
[data-sk-rings]{transition:opacity 1.4s ease}
[data-sk-intro="on"] [data-sk-rings]{opacity:0;transition:none}

/* ---- transição entre páginas: kanji e título do card voam até a página do projeto ---- */
@view-transition{navigation:auto}
::view-transition-group(*){animation-duration:.6s;animation-timing-function:cubic-bezier(.2,.7,.2,1)}
/* o palco do card é largo e o da página é quadrado: as duas imagens ficam inteiras e centradas durante o voo */
::view-transition-old(*.sk-ascii),::view-transition-new(*.sk-ascii){width:100%;height:100%;object-fit:contain}

/* ---- objetos dos projetos em ASCII (canvas por cima do quadriculado do card) ---- */
.sk-ascii{position:relative;display:block}
.sk-ascii canvas{position:absolute;left:0;top:0;display:block;pointer-events:none}
@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}

/* ---- cards da home viram links ---- */
.sk-card{position:relative}
/* a coluna com parallax sobe por cima do botão "Todos no GitHub": a margem vazia dela não pega o mouse, só os cards */
[data-sk-parallax]{pointer-events:none}[data-sk-parallax]>*{pointer-events:auto}
.sk-card-link{color:inherit;text-decoration:none}
.sk-card-link::after{content:"";position:absolute;inset:0;z-index:2}
.sk-card-link:focus-visible{outline:none}
.sk-card:has(.sk-card-link:focus-visible){outline:2px solid #1d1d1d;outline-offset:3px}
.sk-card .sk-open{color:#5f5f5d;transition:color .3s ease}.sk-card:hover .sk-open{color:#1d1d1d}

/* ---- página de projeto ---- */
.sk-lead{max-width:34em;font-size:clamp(18px,1.6vw,22px);line-height:1.4;letter-spacing:.006em}
.sk-lead p{margin:0}
.sk-tile{position:relative;flex:0 0 auto;width:clamp(180px,24vw,340px);aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid #bfbebe;box-sizing:border-box}
/* flex com quebra: cada linha estica as células até fechar a largura, então o fundo (as linhas de 1px)
   nunca aparece como célula vazia. data-c = células por linha com espaço (grid_attrs); a largura do
   contêiner (.sk-cq) decide entre 1, 2 (só contagens pares, data-pair) e data-c por linha */
.sk-cq{container-type:inline-size}
.sk-facts,.sk-stats{display:flex;flex-wrap:wrap;gap:1px;background-color:#bfbebe;border:1px solid #bfbebe}
.sk-fact,.sk-stat{flex:1 1 100%}
@container (min-width:400px){.sk-stats[data-pair]>.sk-stat{flex-basis:calc((100% - 2px) / 2)}}
@container (min-width:480px){.sk-facts[data-pair]>.sk-fact{flex-basis:calc((100% - 2px) / 2)}}
@container (min-width:560px){.sk-stats[data-c="2"]>.sk-stat{flex-basis:calc((100% - 2px) / 2)}.sk-stats[data-c="3"]>.sk-stat{flex-basis:calc((100% - 3px) / 3)}}
@container (min-width:740px){.sk-facts[data-c="2"]>.sk-fact{flex-basis:calc((100% - 2px) / 2)}.sk-facts[data-c="3"]>.sk-fact{flex-basis:calc((100% - 3px) / 3)}}
@container (min-width:780px){.sk-stats[data-c="4"]>.sk-stat{flex-basis:calc((100% - 4px) / 4)}}
@container (min-width:980px){.sk-facts[data-c="4"]>.sk-fact{flex-basis:calc((100% - 4px) / 4)}}
/* stack de trabalho: 10 células em 1, 2 ou 5 por linha, sempre linhas cheias */
.sk-stack>.sk-cell{flex:1 1 100%}
@container (min-width:420px){.sk-stack>.sk-cell{flex-basis:calc((100% - 2px) / 2)}}
@container (min-width:840px){.sk-stack>.sk-cell{flex-basis:calc((100% - 5px) / 5)}}
.sk-fact,.sk-stat{min-width:0;background-color:#fff;padding:19px;display:flex;flex-direction:column;justify-content:space-between;gap:19px;box-sizing:border-box}
.sk-fact{min-height:112px}.sk-stat{min-height:150px}
.sk-fact-v{font-size:18px;line-height:1.3}
.sk-stat-v{font-size:clamp(30px,3vw,46px);line-height:1;letter-spacing:-.01em}
.sk-sec{display:flex;flex-wrap:wrap;gap:19px;align-items:flex-start;padding-top:30px;border-top:1px solid #bfbebe}
.sk-sec>h2{flex:0 0 200px;margin:0;font-weight:400;font-size:11px;line-height:1.4;letter-spacing:.05em;text-transform:uppercase}
.sk-sec>div{flex:1 1 560px;min-width:0;max-width:820px}
.sk-prose{font-size:18px;line-height:1.5;letter-spacing:.006em}
.sk-prose p{margin:0 0 .9em}.sk-prose p:last-child{margin-bottom:0}
.sk-prose ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.7em}
.sk-prose li{position:relative;padding-left:1.4em}.sk-prose li::before{content:"+";position:absolute;left:0;color:#5f5f5d}
.sk-prose strong{font-weight:700}
.sk-prose code,.sk-lead code{font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.82em;padding:1px 5px;background-color:rgba(29,29,29,.06)}
.sk-pending{background-color:rgba(240,107,168,.2);color:inherit;padding:0 4px}
.sk-video{margin:0;display:flex;flex-direction:column;gap:12px}
.sk-video-frame{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid #bfbebe}
.sk-video-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;background-color:#1d1d1d}
.sk-video.is-playing video.sk-video-media{object-fit:contain}
.sk-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.sk-play-wrap{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center}
.sk-video.is-playing .sk-play-wrap{display:none}
.sk-play-wrap .sk-lens-btn{padding:18px 30px;font-size:12px}
.sk-video-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:19px}
.sk-video-k{font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;font-size:clamp(90px,12vw,190px);line-height:1;color:rgba(29,29,29,.13)}
.sk-next{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:19px;padding:30px 0;border-top:1px solid #bfbebe;border-bottom:1px solid #bfbebe;color:#1d1d1d;text-decoration:none}
.sk-next-t{display:inline-block;font-size:clamp(40px,6vw,96px);line-height:.9;letter-spacing:-.015em;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.sk-next:hover .sk-next-t{transform:translateX(19px)}
@media (max-width:720px){.sk-tile{width:min(60vw,240px)}.sk-sec>h2{flex-basis:100%}}

/* ---- desfoque em gradiente atrás da toolbar: forte no topo, some para baixo ---- */
.sk-topblur{position:absolute;top:0;left:0;right:0;height:168px;z-index:19;pointer-events:none;
  background:linear-gradient(to bottom,rgba(229,228,224,.72) 0%,rgba(229,228,224,.38) 45%,rgba(229,228,224,0) 100%)}
.sk-topblur{--dir:to bottom}
.sk-blurfx i{position:absolute;inset:0}
.sk-blurfx i:nth-child(1){-webkit-backdrop-filter:blur(.6px);backdrop-filter:blur(.6px);-webkit-mask-image:linear-gradient(var(--dir),#000 70%,transparent 100%);mask-image:linear-gradient(var(--dir),#000 70%,transparent 100%)}
.sk-blurfx i:nth-child(2){-webkit-backdrop-filter:blur(1.5px);backdrop-filter:blur(1.5px);-webkit-mask-image:linear-gradient(var(--dir),#000 52%,transparent 82%);mask-image:linear-gradient(var(--dir),#000 52%,transparent 82%)}
.sk-blurfx i:nth-child(3){-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);-webkit-mask-image:linear-gradient(var(--dir),#000 36%,transparent 64%);mask-image:linear-gradient(var(--dir),#000 36%,transparent 64%)}
.sk-blurfx i:nth-child(4){-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);-webkit-mask-image:linear-gradient(var(--dir),#000 20%,transparent 46%);mask-image:linear-gradient(var(--dir),#000 20%,transparent 46%)}
.sk-blurfx i:nth-child(5){-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);-webkit-mask-image:linear-gradient(var(--dir),#000 6%,transparent 30%);mask-image:linear-gradient(var(--dir),#000 6%,transparent 30%)}
/* rodapé: o mesmo desfoque, de baixo para cima, sangrando até as bordas da tela */
.sk-footblur{--dir:to top;position:relative;margin:0 calc(-1 * clamp(19px,4vw,76px)) -30px;padding:0 clamp(19px,4vw,76px) 30px;min-height:168px;
  display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px 19px;box-sizing:border-box;
  background:linear-gradient(to top,rgba(229,228,224,.60) 0%,rgba(229,228,224,.31) 45%,rgba(229,228,224,0) 100%)}
.sk-footblur>.sk-blurfx{position:absolute;inset:0;pointer-events:none}
.sk-footblur>:not(.sk-blurfx){position:relative}
@media (max-width:720px){.sk-topblur{height:128px}.sk-logo{font-size:19px}.sk-footblur{min-height:128px}}

#manifesto p{font-size:clamp(30px,3.6vw,54px)}
.sk-area-labels{position:absolute;inset:0;pointer-events:none}
.sk-area-labels [data-sk-orbit-label]{position:absolute}
.sk-area-title{bottom:46px;font-size:clamp(44px,5vw,76px)}
#contato h2{font-size:clamp(56px,7.4vw,112px)}
@media (max-width:720px){
  [data-sk-view="proj"]{--sk-project-top:144px}
  .sk-area-labels{inset:64px 0 100px}
  .sk-area-title{bottom:100px}
  .sk-track-lg .sk-seg{min-width:0;white-space:normal;overflow-wrap:anywhere}
  #contato h2{font-size:clamp(32px,13.5vw,56px)}
}
@media (max-height:520px){
  [data-sk-view="proj"]{--sk-project-top:120px}
  .sk-topblur{height:clamp(72px,27vh,116px)}
  #manifesto p{font-size:clamp(22px,min(3.6vw,7vh),34px)}
  .sk-area-labels{inset:100px 0 165px}
  .sk-area-title{bottom:92px;font-size:clamp(26px,8vh,40px)}
}
@media (max-height:350px){
  .sk-area-labels{inset:100px clamp(19px,4vw,76px) auto;display:flex;justify-content:space-between;gap:8px}
  .sk-area-labels [data-sk-orbit-label]{position:static}
}

/* ---- WhatsApp: só a logo, num círculo de vidro de 64 px no canto inferior direito, alinhado à margem do site e
   acima da linha do rodapé (o topo das páginas de projeto termina a 150 px da base para o quadro ASCII não ficar por
   baixo dele). Abaixo de 1024 px o título ocupa a largura toda: o botão desce para a linha do "Scroll", com 56 px,
   e o rodapé reserva a largura dele à direita ---- */
.sk-wa-wrap{position:absolute;right:clamp(19px,4vw,76px);bottom:73px;z-index:21}
.sk-wa{display:inline-flex;align-items:center;justify-content:center;padding:17px;color:#1d1d1d;text-decoration:none}
.sk-wa-i{flex:0 0 auto;display:block;width:30px;height:30px}
@media (max-width:1023px){.sk-wa-wrap{bottom:22px}.sk-wa{padding:13px}.sk-footblur{padding-right:calc(clamp(19px,4vw,76px) + 76px)}}

/* ---- indicador de scroll: centro da base, seta animada ---- */
.sk-hint{position:absolute;left:50%;width:120px;margin:0 0 0 -60px;bottom:22px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:0;border:0;background:none;font:inherit;color:inherit;cursor:pointer}
.sk-hint:focus-visible{outline:2px solid #1d1d1d;outline-offset:6px;border-radius:10px}
.sk-hint:hover .sk-hint-arrow{animation-duration:.9s}
.sk-hint::before{content:"";position:absolute;inset:-26px -34px -14px;z-index:-1;border-radius:50%;
  background:radial-gradient(closest-side,rgba(229,228,224,.78) 35%,rgba(229,228,224,0));
  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  -webkit-mask-image:radial-gradient(closest-side,#000 45%,transparent);mask-image:radial-gradient(closest-side,#000 45%,transparent)}
.sk-hint-arrow{display:block;animation:sk-bob 1.6s cubic-bezier(.45,0,.55,1) infinite}
@keyframes sk-bob{0%,100%{transform:translateY(-3px)}50%{transform:translateY(5px)}}
@media (prefers-reduced-motion:reduce){.sk-hint-arrow{animation:none}}

/* A toolbar e os controles cabem em uma linha também no celular deitado. */
.sk-menu-toggle,.sk-menu{display:none}
@media (max-width:720px),(max-width:950px) and (max-height:520px) and (pointer:coarse){
  [data-sk-root]{--sk-mobile-edge:clamp(16px,4.5vw,32px);--sk-mobile-top:104px;height:100dvh!important}
  [data-sk-scroller]{scroll-padding-top:var(--sk-mobile-top)}
  [data-sk-view="hero"],#contato,[data-sk-view="proj"]{min-height:100dvh!important}
  #manifesto>div,#areas>div{height:100dvh!important}
  .sk-toolbar{padding:12px var(--sk-mobile-edge)!important}
  .sk-toolbar .sk-logo,.sk-menu .sk-logo{font-size:19px;line-height:20px}
  .sk-topblur{height:var(--sk-mobile-top)}
  [data-sk-root]:not([data-sk-menu-ready]) .sk-navlinks{display:none}
  [data-sk-menu-ready] .sk-desktop-nav,[data-sk-menu-ready] .sk-wa-wrap{display:none!important}
  [data-sk-menu-ready] .sk-menu-toggle,.sk-menu-close{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;
    gap:10px;min-height:44px;padding:0 15px;border:0;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .sk-menu-toggle[aria-expanded="true"]{opacity:0}
  .sk-menu[open]{display:block;pointer-events:auto;position:fixed;inset:12px var(--sk-mobile-edge) auto auto;
    width:min(420px,calc(100% - 2 * var(--sk-mobile-edge)));max-width:none;max-height:calc(100dvh - 24px);
    box-sizing:border-box;overflow:auto;overscroll-behavior:contain;margin:0;padding:14px 18px 8px;
    border:1px solid rgba(255,255,255,.85);border-radius:24px;color:#1d1d1d;background:rgba(246,245,242,.92);
    -webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
  .sk-menu::backdrop{background:rgba(29,29,29,.15)}
  .sk-menu-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px}
  .sk-menu-close{min-width:44px;padding:0}
  .sk-menu-links{display:grid;border-top:1px solid #bfbebe}
  .sk-menu-links a{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:12px;
    min-height:50px;padding:0 8px;color:#1d1d1d;text-decoration:none;font-size:16px}
  .sk-menu-links a+a{border-top:1px solid rgba(29,29,29,.16)}
  .sk-menu-links a:active{background:rgba(29,29,29,.06)}
  .sk-menu-links .sk-wa-i{height:19px;width:19px}
  .sk-menu-external{font-size:14px;color:#5f5f5d}
  .sk-hint{left:auto;right:var(--sk-mobile-edge);bottom:14px;width:auto;min-height:48px;margin:0;padding:0 8px 0 12px;
    flex-direction:row;justify-content:center;gap:12px}
  .sk-hint::before{inset:-10px -16px -5px}
  .sk-hint:focus-visible{outline-offset:1px}
  .sk-card .sk-ascii,.sk-tile .sk-ascii{overflow:hidden}
  [data-sk-card-columns]>[data-sk-parallax]{padding-top:0!important}
  [data-sk-card-columns]>[data-sk-parallax]:not(:has(.sk-card)){display:none!important}
  [data-sk-menu-ready] .sk-footblur{padding-right:clamp(19px,4vw,76px)}
}
@media (max-width:720px){
  [data-sk-view="hero"]{padding-bottom:max(92px,12svh)!important}
  [data-sk-view="hero"] h1{font-size:clamp(27px,9.2vw,60px)!important}
  #sobre,#projetos,#trajetoria{padding-block:84px!important}
  #sobre>div{gap:76px!important}
  #projetos .sk-lens-btn{display:inline-flex;align-items:center;min-height:44px;box-sizing:border-box}
  .sk-card{min-height:0!important;padding:20px!important;gap:16px!important}
  .sk-card .sk-ascii{min-height:clamp(220px,70vw,340px)!important;margin-inline:-20px!important}
  .sk-row{display:grid!important;grid-template-columns:28px minmax(0,1fr);gap:10px 8px!important}
  .sk-row>span:last-child{grid-column:2;margin-left:0!important;text-align:left!important}
  #contato{gap:24px!important}
  .sk-track-lg{padding:6px;border-radius:24px}
  .sk-track-lg .sk-seg{min-height:48px;box-sizing:border-box;padding:13px 16px}
  .sk-lens-btn.sk-lens-btn-lg,.sk-play-wrap .sk-lens-btn{box-sizing:border-box;max-width:100%;min-height:48px;
    padding:14px 18px;white-space:normal;overflow-wrap:anywhere}
  .sk-project-back{display:inline-flex;align-items:center;min-height:44px;box-sizing:border-box}
  .sk-project-copy h1{font-size:clamp(34px,9.8vw,64px)!important}
  [data-sk-view="projbody"]>div{gap:54px!important}
  .sk-next-t{font-size:clamp(30px,10vw,56px);overflow-wrap:anywhere}
}
@media (max-width:720px) and (min-height:521px){
  [data-sk-view="proj"]{--sk-project-top:98px;padding-bottom:76px!important;justify-content:flex-start!important}
  .sk-project-hero{display:grid!important;grid-template-columns:minmax(0,1fr);gap:16px!important}
  .sk-project-copy{display:contents!important}
  .sk-project-copy .sk-lead{grid-row:5}
  .sk-project-copy>p:last-child{grid-row:6}
  .sk-project-hero .sk-tile{grid-row:4;justify-self:center;width:min(100%,320px,43svh)}
}
@media (max-height:520px) and (max-width:720px),(max-height:520px) and (max-width:950px) and (pointer:coarse){
  [data-sk-root]{--sk-mobile-top:78px}
  [data-sk-view="hero"]{padding-bottom:92px!important}
  [data-sk-view="hero"] h1{font-size:clamp(24px,min(6.5vw,10.5vh),46px)!important}
  [data-sk-view="proj"]{--sk-project-top:92px;padding-bottom:76px!important}
  .sk-project-hero{gap:16px!important}
  .sk-project-copy{gap:12px!important}
}
@media (min-width:520px) and (max-height:520px) and (max-width:720px),(min-width:520px) and (max-height:520px) and (max-width:950px) and (pointer:coarse){
  .sk-menu-links{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sk-menu-links a+a{border-top:0}
  .sk-menu-links a:nth-child(n+3){border-top:1px solid rgba(29,29,29,.16)}
  .sk-menu-links a:nth-child(even){border-left:1px solid rgba(29,29,29,.16);padding-left:12px}
  .sk-project-hero{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,34%);align-items:center!important}
  .sk-project-hero .sk-tile{width:100%}
  .sk-project-copy h1{font-size:clamp(34px,6.3vw,60px)!important}
}'''

DC_PROPS = {
    "preset": {"editor": "enum", "options": ["kosa", "sanbon", "ogi", "itozakura", "koeda"], "default": "kosa", "section": "Sakura"},
    "kanji": {"editor": "boolean", "default": True, "section": "Sakura"},
    "wind": {"editor": "range", "min": 0, "max": 2, "step": 0.1, "default": 1, "section": "Sakura"},
    "$preview": {"width": 1440, "height": 900},
}
DC_SCRIPT = '''class Component extends DCLogic {
componentDidMount() { this.tryMount(0); }
tryMount(n) {
if (this.ctrl || !this.root) return;
if (window.SakuraSite) { this.ctrl = window.SakuraSite.mount(this.root, this.opts()); return; }
if (n < 80) this.timer = setTimeout(() => this.tryMount(n + 1), 50);
}
opts() { return { preset: this.props.preset ?? 'kosa', kanji: this.props.kanji ?? true, wind: this.props.wind ?? 1 }; }
componentDidUpdate() { if (this.ctrl) this.ctrl.update(this.opts()); }
componentWillUnmount() { clearTimeout(this.timer); if (this.ctrl) this.ctrl.destroy(); }
renderVals() { return { bindRoot: (el) => { if (el) this.root = el; } }; }
}'''


def build_dc(script_url):
    props = json.dumps(DC_PROPS, ensure_ascii=False).replace("'", '&#39;')
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Sitr3n — portfólio com sakura em ASCII</title>
<script src="./support.js"></script>
<script src="{script_url}"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
{CSS}
</style>
</helmet>
{body(' ref="{{ bindRoot }}"')}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
{DC_SCRIPT}
</script>
</body>
</html>
'''


def build_standalone(script_src, body_html=None, title='Sitr3n — portfólio com sakura em ASCII', desc=None, opts="{ preset: 'kosa' }"):
    sc = f'<script src="{script_src}"></script>'
    meta = f'\n<meta name="description" content="{E(desc)}">' if desc else ''
    return f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title>{meta}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{FONTS}
<style>
{CSS}
</style>
</head>
<body>
{body_html or body()}
{sc}
<script>window.__site = SakuraSite.mount(document.querySelector('[data-sk-root]'), {opts});</script>
</body>
</html>
'''


def write(path, text):
    # newline='\n' garante LF também no Windows (saída idêntica em qualquer SO)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


if __name__ == '__main__':
    import argparse, os
    ap = argparse.ArgumentParser(description='Gera index.html, as páginas de projeto e, opcionalmente, Main.dc.html.')
    ap.add_argument('--out', default='.', help='diretório de saída (padrão: diretório atual)')
    ap.add_argument('--dc', metavar='SCRIPT_URL', help='também gera Main.dc.html apontando para SCRIPT_URL')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    write(os.path.join(args.out, 'index.html'), build_standalone('sakura-site.js'))
    for i, p in enumerate(PROJECTS):
        nxt = PROJECTS[(i + 1) % len(PROJECTS)]
        folder = os.path.join(args.out, 'projetos', p['slug'])
        os.makedirs(folder, exist_ok=True)
        opts = "{ preset: '%s', intro: 'page' }" % p.get('sakura', 'kosa')
        write(os.path.join(folder, 'index.html'),
              build_standalone('../../sakura-site.js', project_root(p, nxt), f"{p['titulo']} — Sitr3n", p['card'], opts))
    if args.dc:
        write(os.path.join(args.out, 'Main.dc.html'), build_dc(args.dc))
    print('ok')
