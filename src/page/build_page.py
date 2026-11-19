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
    out = []
    for ch in text:
        if ch == ' ':
            out.append('<span style="display: inline-block; width: 0.28em"></span>')
        else:
            out.append(f'<span data-sk-letter="1" style="display: inline-block; will-change: transform">{E(ch)}</span>')
    return ''.join(out)


def words(text):
    return ' '.join(f'<span data-sk-word="1" style="display: inline-block; margin-right: 0.22em; will-change: transform">{E(w)}</span>'
                    for w in text.split())


def nav(base=''):
    spy = 'spy' if not base else 'links'
    return f'''
<div class="sk-topblur sk-blurfx" data-sk-ui="1" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<header data-sk-ui="1" style="position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; gap: 19px; padding: 19px {PADX}; pointer-events: none">
<a class="sk-logo" href="{base}#inicio" style="pointer-events: auto">SITR3N.</a>
<nav aria-label="Seções" style="pointer-events: auto; display: flex; align-items: center; gap: 10px">
<div class="sk-glass sk-track sk-navlinks" data-sk-glass="{spy}">
<span class="sk-lens" aria-hidden="true"></span>
<a class="sk-seg" href="{base}#inicio">Início</a>
<a class="sk-seg" href="{base}#sobre">Sobre</a>
<a class="sk-seg" href="{base}#projetos">Projetos</a>
<a class="sk-seg" href="{base}#trajetoria">Trajetória</a>
</div>
<a class="sk-lens-btn" href="{base}#contato">Contato +</a>
</nav>
</header>'''

HERO = f'''
<section id="inicio" data-sk-view="hero" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 96px {PADX} 76px; box-sizing: border-box">
<h1 aria-label="Código, jogos e imagem." style="margin: 0; font-weight: 400; font-size: clamp(48px, 7.4vw, 112px); line-height: 0.8; letter-spacing: -0.015em; text-transform: uppercase; color: {INK}">
<span aria-hidden="true" style="display: block; margin-left: 2%">{letters("CÓDIGO,")}</span>
<span aria-hidden="true" style="display: block; margin-left: 42%; margin-top: 0.62em">{letters("JOGOS")}</span>
<span aria-hidden="true" style="display: block; margin-left: 14%; margin-top: 0.62em">{letters("& IMAGEM.")}</span>
</h1>
</section>'''

MANIFESTO = f'''
<section id="manifesto" data-sk-view="manifesto" style="position: relative; height: 1700px">
<div style="position: sticky; top: 0; height: 100vh; display: flex; align-items: center; padding: 0 {PADX}; box-sizing: border-box">
<p style="margin: 0; max-width: 17em; font-size: clamp(30px, 3.6vw, 54px); line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; color: {INK}">{words("Do sistema invisível à interface que encanta. Engenharia, design e movimento em cada detalhe.")}</p>
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
<div data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-start">
<div style="flex: 1 1 300px; display: flex; flex-direction: column; gap: 19px">
<p style="margin: 0; font-size: 15px; line-height: 1.4; letter-spacing: 0.013em; text-transform: uppercase; max-width: 26em">Desenvolvedor full-stack e formado em Jogos Digitais no IESB, em Brasília.</p>
<a class="sk-link" href="https://github.com/Sitr3n01" style="align-self: flex-start; font-size: 15px; color: {INK}; text-decoration: none; border-radius: 10px; padding: 5px 0">GitHub ↗</a>
</div>
<div style="flex: 1 1 420px; max-width: 640px">
<p style="margin: 0; font-size: 18px; line-height: 1.4; letter-spacing: 0.013em">Da lógica que sustenta um sistema à interface que o torna intuitivo, desenvolvo produtos digitais com atenção à técnica e à experiência. Atuo com web, desktop e jogos, com experiência nos projetos Loopia e ExoBeast durante seis meses no Brasília Game Hub. A fotografia amplia minha perspectiva sobre estética, composição e comunicação visual.</p>
</div>
</div>
<div data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 19px; align-items: flex-start">
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


def card(p):
    slug = p['slug']
    return f'''<article class="sk-card" data-sk-reveal="1" style="background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 24px 24px; min-height: 560px; padding: 30px; box-sizing: border-box; display: flex; flex-direction: column; gap: 19px">
<div style="display: flex; justify-content: space-between; align-items: center">
<span style="{CAP}">{E(p['cap'])}</span>
<span class="sk-open" aria-hidden="true" style="{CAP}; display: inline-flex; align-items: center; gap: 10px">Ver projeto <span class="sk-plus" style="font-size: 24px; line-height: 1; display: inline-block">+</span></span>
</div>
<div style="flex: 1 1 auto; display: flex; align-items: center; justify-content: center; min-height: 220px">
<span class="sk-glyph" aria-hidden="true" style="font-family: {JP}; font-size: clamp(120px, 13vw, 210px); line-height: 1; color: {INK}; display: inline-block; view-transition-name: sk-glyph-{slug}">{p['kanji']}</span>
</div>
<h3 style="margin: 0; font-weight: 400; font-size: clamp(34px, 3.2vw, 46px); line-height: 1; letter-spacing: 0.006em"><a class="sk-card-link" href="projetos/{slug}/" data-sk-project="{slug}"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></a></h3>
<p style="margin: 0; font-size: 15px; line-height: 1.4; max-width: 34em">{E(p['card'])}</p>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</article>'''


colA = '\n'.join(card(p) for p in PROJECTS[0::2])
colB = '\n'.join(card(p) for p in PROJECTS[1::2])
WORK = f'''
<section id="projetos" data-sk-view="work" style="position: relative; padding: 119px {PADX} 160px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 46px">
<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 19px">
<h2 style="margin: 0; font-weight: 400; {CAP}">Projetos em destaque</h2>
<a class="sk-lens-btn" href="https://github.com/Sitr3n01" rel="noopener">Todos no GitHub +</a>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 19px; align-items: flex-start">
<div style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 19px">
{colA}
</div>
<div data-sk-parallax="0.16" style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 19px; padding-top: 180px; will-change: transform">
{colB}
</div>
</div>
</div>
</section>'''

CHIPS = ['async def', 'SELECT *', 'useEffect()', 'docker compose up', 'FastAPI', 'Django ORM', 'React 18', 'PostgreSQL',
         'NetworkObject', 'Unity 6', 'C#', 'EOS', 'RAG', 'MCP', 'embeddings', 'LLM local', 'Electron', 'SOUL.md',
         'f/2.8', '1/250 s', 'ISO 400', '35 mm', '知', '獣', '光', '輪']


def chip(t):
    if len(t) == 1:
        return (f'<span data-sk-chip="1" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; '
                f'background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 8px 8px; '
                f'border: 1px solid {ASH}; font-family: {JP}; font-size: 30px; color: {INK}">{t}</span>')
    return (f'<span data-sk-chip="1" aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block; padding: 8px 12px; background-color: {PAPER}; border: 1px solid {ASH}; '
            f'font-family: {MONO}; font-size: 12px; line-height: 1.2; white-space: nowrap; color: {INK}">{E(t)}</span>')


chips = '\n'.join(chip(t) for t in CHIPS)
LBL = f"position: absolute; margin: 0; font-size: 15px; line-height: 1.1; letter-spacing: 0.013em; text-transform: uppercase; color: {INK}"
AREAS = f'''
<section id="areas" data-sk-view="areas" aria-label="Áreas de trabalho" style="position: relative; height: 2600px">
<div style="position: sticky; top: 0; height: 100vh; overflow: hidden">
<div data-sk-orbit="1" style="position: absolute; left: 50%; top: 48%; width: 0; height: 0">
{chips}
</div>
<p data-sk-orbit-label="1" style="{LBL}; left: 18%; top: 24%">Full-<br>stack</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 72%; top: 20%">Jogos<br>Unity</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 76%; top: 66%">IA<br>local</p>
<p data-sk-orbit-label="1" style="{LBL}; left: 26%; top: 70%">Foto-<br>grafia</p>
<h2 style="position: absolute; left: {PADX}; bottom: 46px; margin: 0; font-weight: 400; font-size: clamp(44px, 5vw, 76px); line-height: 0.8; letter-spacing: -0.01em; text-transform: uppercase; color: {INK}">Frentes de<br>trabalho.</h2>
</div>
</section>'''

PATH_ROWS = [
    ('01', 'Brasília Game Hub', ['6 meses', 'Loopia', 'ExoBeast']),
    ('02', 'IESB', ['Tecnólogo em Jogos Digitais', 'Concluído em 2026']),
    ('03', 'Game jams', ['2 participações']),
    ('04', 'IESB pittyday', ['2 edições', 'Várias categorias']),
    ('05', 'kelly_sys', ['Portal de notícias', 'No ar desde jun. 2026']),
]
rows = '\n'.join(f'''<li class="sk-row" data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 8px 19px; align-items: flex-start; padding: 30px 0; border-top: 1px solid {ASH}">
<span style="flex: 0 0 48px; {CAP}">{n}</span>
<span class="sk-row-t" style="flex: 1 1 260px; font-size: clamp(24px, 2.6vw, 34px); line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; display: inline-block">{E(t)}</span>
<span style="flex: 0 1 260px; margin-left: auto; {CAP}; text-align: right">{'<br>'.join(E(d) for d in ds)}</span>
</li>''' for n, t, ds in PATH_ROWS)

PATH = f'''
<section id="trajetoria" data-sk-view="path" style="position: relative; padding: 119px {PADX}">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px">
<h2 style="flex: 0 0 200px; margin: 0; font-weight: 400; {CAP}">Trajetória<br>+ formação</h2>
<ol style="flex: 1 1 560px; list-style: none; margin: 0; padding: 0; border-bottom: 1px solid {ASH}">
{rows}
</ol>
</div>
</section>'''

CONTACT = f'''
<section id="contato" data-sk-view="contact" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 119px {PADX} 30px; box-sizing: border-box">
<h2 data-sk-reveal="1" style="margin: 0; font-weight: 400; font-size: clamp(56px, 7.4vw, 112px); line-height: 0.8; letter-spacing: -0.015em; text-transform: uppercase">Vamos<br>conversar.</h2>
<div class="sk-glass sk-track sk-track-lg" data-sk-glass="links" data-sk-glass-rest="0" style="align-self: flex-start">
<span class="sk-lens" aria-hidden="true"></span>
<a class="sk-seg" href="https://github.com/Sitr3n01">GitHub <span class="sk-seg-sub">Sitr3n01</span> ↗</a>
<a class="sk-seg" href="https://www.linkedin.com/in/sitr3n">LinkedIn <span class="sk-seg-sub">/in/sitr3n</span> ↗</a>
<span class="sk-seg" tabindex="0">[SEU E-MAIL]</span>
</div>
<footer class="sk-footblur">
<div class="sk-blurfx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<span style="{CAP}">© 2026 Sitr3n</span>
</footer>
</section>'''

# "Scroll" centralizado na base, com a seta descendo e subindo (para em prefers-reduced-motion)
HINT = f'''<div data-sk-hint="1" data-sk-ui="3" aria-hidden="true" class="sk-hint">
<span style="{CAP}; color: {INK}">Scroll</span>
<svg class="sk-hint-arrow" width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="{INK}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1v19M1.5 14.5 7 20l5.5-5.5"/></svg>
</div>'''

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
    return f'''<figure class="sk-video" data-sk-video="1" data-sk-reveal="1" data-sk-title="{title}"{attrs}>
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
        secs.append(f'<div class="sk-sec" data-sk-reveal="1"><h2>{E(sec["title"])}</h2><div>{inner}</div></div>')
    links = []
    if p.get('repo'):
        links.append(f'<a class="sk-seg" href="{E(p["repo"])}" rel="noopener">Repositório <span class="sk-seg-sub">GitHub</span> ↗</a>')
    if p.get('site'):
        host = p['site'].split('//', 1)[-1].split('/', 1)[0]
        links.append(f'<a class="sk-seg" href="{E(p["site"])}" rel="noopener">Site <span class="sk-seg-sub">{E(host)}</span> ↗</a>')
    links_html = (f'''<div class="sk-glass sk-track sk-track-lg" data-sk-glass="links" data-sk-glass-rest="0" data-sk-reveal="1" style="align-self: flex-start">
<span class="sk-lens" aria-hidden="true"></span>
{''.join(links)}
</div>''') if links else ''
    ns = nxt['slug']
    return f'''
<section id="inicio" data-sk-view="proj" style="position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 120px {PADX} 76px; box-sizing: border-box">
<div style="max-width: 1400px; width: 100%; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-end; justify-content: space-between">
<div style="flex: 1 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 30px">
<a class="sk-link" href="{base}#projetos" style="align-self: flex-start; {CAP}; color: {INK}; text-decoration: none; padding: 5px 0">← Todos os projetos</a>
<p style="margin: 0; {CAP}">{E(p['cap'])} · {inline(p.get('status', ''))}</p>
<h1 style="margin: 0; font-weight: 400; font-size: clamp(44px, 7.4vw, 120px); line-height: 0.9; letter-spacing: -0.015em; overflow-wrap: anywhere"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></h1>
<div class="sk-lead">{p['lead']}</div>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</div>
<div class="sk-tile" style="{GRID_BG}" aria-hidden="true"><span style="font-family: {JP}; font-size: clamp(110px, 13vw, 210px); line-height: 1; display: inline-block; view-transition-name: sk-glyph-{slug}">{p['kanji']}</span></div>
</div>
</section>
<section id="detalhes" data-sk-view="projbody" style="position: relative; padding: 46px {PADX} 119px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 76px">
{video_block(p, base)}
<div class="sk-cq" data-sk-reveal="1"><div class="sk-facts" {grid_attrs(len(facts))}>
{facts_html}
</div></div>
{''.join(secs)}
{links_html}
</div>
</section>
<section id="proximo" data-sk-view="projnext" style="position: relative; min-height: 70vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 119px {PADX} 30px; box-sizing: border-box">
<a class="sk-next" href="../{ns}/">
<span style="flex: 1 1 100%; {CAP}">Próximo projeto · {E(nxt['cap'])}</span>
<span class="sk-next-t"><span style="display: inline-block; view-transition-name: sk-title-{ns}">{E(nxt['titulo'])}</span> →</span>
<span class="sk-next-k" aria-hidden="true" style="view-transition-name: sk-glyph-{ns}">{nxt['kanji']}</span>
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
.sk-card .sk-glyph{{transition:transform .7s cubic-bezier(.2,.7,.2,1)}}.sk-card:hover .sk-glyph{{transform:translateY(-8px) scale(1.05)}}
.sk-cell{{transition:background-color .25s ease,color .25s ease}}.sk-cell:hover{{background-color:{INK}!important;color:{PARCH}}}
.sk-cap{{color:#5f5f5d}}.sk-cell:hover .sk-cap{{color:{ASH}}}
.sk-row .sk-row-t{{transition:transform .45s cubic-bezier(.2,.7,.2,1)}}.sk-row:hover .sk-row-t{{transform:translateX(19px)}}
@media (max-width:720px){{.sk-navlinks{{display:none!important}}}}
@media (prefers-reduced-motion:reduce){{[data-sk-scroller]{{scroll-behavior:auto!important}}}}''' + '''
/* ---- vidro líquido: trilho fosco + lente refrativa (nav e contato) ---- */
@property --rim{syntax:'<angle>';inherits:true;initial-value:0deg}
.sk-glass{position:relative;border-radius:999px;background-color:rgba(229,228,224,.55);
  -webkit-backdrop-filter:blur(14px) saturate(1.25);backdrop-filter:blur(14px) saturate(1.25);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),inset 0 1px 3px rgba(29,29,29,.07),0 0 0 1px rgba(29,29,29,.06),0 1px 0 rgba(255,255,255,.8)}
.sk-logo{display:inline-block;padding:12px 0;font-size:22px;font-weight:700;line-height:1;letter-spacing:-.02em;text-decoration:none;color:#1d1d1d}
.sk-track{display:inline-flex;align-items:center;gap:2px;padding:4px}
.sk-track-lg{flex-wrap:wrap;max-width:100%;box-sizing:border-box}
.sk-seg{position:relative;z-index:1;display:inline-block;padding:10px 18px;border-radius:999px;font-size:11px;line-height:1.4;letter-spacing:.05em;text-transform:uppercase;
  color:#5f5f5d;text-decoration:none;white-space:nowrap;transition:color .35s ease}
.sk-seg.is-on,.sk-seg:hover{color:#1d1d1d}
.sk-track-lg .sk-seg{padding:14px 24px;font-size:15px;letter-spacing:.013em;text-transform:none}
.sk-seg-sub{color:#8a8986;transition:color .35s ease}.sk-seg.is-on .sk-seg-sub{color:#5f5f5d}
.sk-seg:focus-visible,.sk-lens-btn:focus-visible,.sk-logo:focus-visible{outline:2px solid #1d1d1d;outline-offset:3px}

/* lente: corpo claro, borda grossa que refrata, reflexo quente no topo e brilho iridescente girando nos cantos */
.sk-lens,.sk-lens-btn{--sx:1;--sy:1;border-radius:999px;
  background:radial-gradient(120% 90% at 50% 50%,rgba(236,235,232,.92) 55%,rgba(250,250,248,.75) 78%,rgba(255,255,255,.95) 100%);
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
@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}

/* ---- cards da home viram links ---- */
.sk-card{position:relative}
.sk-card-link{color:inherit;text-decoration:none}
.sk-card-link::after{content:"";position:absolute;inset:0;z-index:2}
.sk-card-link:focus-visible{outline:none}
.sk-card:has(.sk-card-link:focus-visible){outline:2px solid #1d1d1d;outline-offset:3px}
.sk-card .sk-open{color:#5f5f5d;transition:color .3s ease}.sk-card:hover .sk-open{color:#1d1d1d}

/* ---- página de projeto ---- */
.sk-lead{max-width:34em;font-size:clamp(18px,1.6vw,22px);line-height:1.4;letter-spacing:.006em}
.sk-lead p{margin:0}
.sk-tile{flex:0 0 auto;width:clamp(180px,24vw,340px);aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid #bfbebe;box-sizing:border-box}
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
.sk-next-k{display:inline-block;font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;font-size:clamp(60px,7vw,110px);line-height:1}
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
  background:linear-gradient(to top,rgba(229,228,224,.72) 0%,rgba(229,228,224,.38) 45%,rgba(229,228,224,0) 100%)}
.sk-footblur>.sk-blurfx{position:absolute;inset:0;pointer-events:none}
.sk-footblur>:not(.sk-blurfx){position:relative}
@media (max-width:720px){.sk-topblur{height:128px}.sk-logo{font-size:19px}.sk-footblur{min-height:128px}}

/* ---- indicador de scroll: centro da base, seta animada ---- */
.sk-hint{position:absolute;left:50%;width:120px;margin:0 0 0 -60px;bottom:22px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.sk-hint::before{content:"";position:absolute;inset:-26px -34px -14px;z-index:-1;border-radius:50%;
  background:radial-gradient(closest-side,rgba(229,228,224,.92) 35%,rgba(229,228,224,0));
  -webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);
  -webkit-mask-image:radial-gradient(closest-side,#000 45%,transparent);mask-image:radial-gradient(closest-side,#000 45%,transparent)}
.sk-hint-arrow{display:block;animation:sk-bob 1.6s cubic-bezier(.45,0,.55,1) infinite}
@keyframes sk-bob{0%,100%{transform:translateY(-3px)}50%{transform:translateY(5px)}}
@media (prefers-reduced-motion:reduce){.sk-hint-arrow{animation:none}}'''

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
