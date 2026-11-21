"""Gera o site a partir da mesma marcação, em português (na raiz) e em inglês (em en/):
   - index.html e en/index.html                                   (página inicial)
   - projetos/<slug>/index.html e en/projects/<slug>/index.html   (uma página por projeto, de src/content/projetos/)
   - Main.dc.html                                                 (artboard do canvas de Design, opcional, em português)
Os textos da interface ficam em textos.py, em pares (português, inglês); os dos projetos, nos .md.
"""
import html, json, urllib.parse
from content import inline, load_projects
from textos import AREA_LABELS, CHIPS, IDS, LANGS, ME_FACTS, ME_NAME, MENU, PATH_ROWS, SITE, STACK, T

# Cores em tokens CSS: a marcação usa var(--sk-*) e cada tema só troca os valores (THEMES). No claro, os valores são
# exatamente os de sempre; o escuro troca os papéis da mesma paleta: a tinta vira o fundo e o fundo vira a tinta.
INK, PARCH, PAPER, ASH, MUTE = 'var(--sk-ink)', 'var(--sk-parch)', 'var(--sk-paper)', 'var(--sk-ash)', 'var(--sk-mute)'
# Tons dos objetos ASCII dos cards, da tinta ao mais apagado. No escuro, cada tom fica à mesma distância relativa do
# papel que tem no claro (o papel claro é o #ffffff).
CARD_TONES = ((29, 29, 29), (62, 62, 61), (110, 110, 108), (175, 174, 173))


def mirror_tones(ink, paper):
    return tuple(tuple(round(p + (i - p) * (255 - t) / (255 - 29)) for i, p, t in zip(ink, paper, tone)) for tone in CARD_TONES)


# Flores: o gradiente é o mesmo nos dois temas. petal_ink = tinta que se mistura ao gradiente nos glifos das pétalas (no
# claro, glifo escuro sobre a célula tingida; no escuro, o espelho: glifo claro). petal_a = fator da opacidade das
# células das flores.
THEMES = {
    'light': {'ink': (29, 29, 29), 'parch': (229, 228, 224), 'paper': (255, 255, 255), 'ash': (191, 190, 190),
              'mute': (95, 95, 93), 'tones': CARD_TONES, 'petal_ink': (29, 29, 29), 'petal_a': 1},
    'dark': {'ink': (229, 228, 224), 'parch': (29, 29, 29), 'paper': (38, 38, 37), 'ash': (59, 59, 57),
             'mute': (154, 153, 149), 'tones': mirror_tones((229, 228, 224), (38, 38, 37)), 'petal_ink': (229, 228, 224), 'petal_a': 1},
}


def theme_vars(name):
    t = THEMES[name]
    hexc = lambda c: '#' + ''.join(f'{v:02x}' for v in c)
    rgb = lambda c: ','.join(map(str, c))
    out = [f'--sk-{k}:{hexc(t[k])};--sk-{k}-rgb:{rgb(t[k])}' for k in ('ink', 'parch', 'paper', 'ash', 'mute')]
    out.append(f'--sk-petal-ink-rgb:{rgb(t["petal_ink"])};--sk-petal-a:{t["petal_a"]}')
    out.append('--sk-tones:' + ' '.join(rgb(c) for c in t['tones']))
    out.append(f'color-scheme:{name}')
    return ';'.join(out)


SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace"
JP = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif"
PADX = 'clamp(19px, 4vw, 76px)'
CAP = f"font-size: var(--sk-cap, 11px); line-height: 1.4; letter-spacing: 0.05em; text-transform: uppercase"
E = html.escape


class Lang:
    """Um idioma do site. L['chave'] devolve o lado deste idioma num par de textos.py; L.t(par) faz o mesmo com um
    par avulso (um texto igual nos dois idiomas pode vir sem par)."""

    def __init__(self, code):
        self.code, self.i = code, LANGS.index(code)
        self.dir = '' if self.i == 0 else code + '/'  # pasta do idioma, a partir da raiz do site

    def t(self, pair):
        return pair[self.i] if isinstance(pair, tuple) else pair

    def __getitem__(self, key):
        return T[key][self.i]

    def id(self, view):
        return IDS[view][self.i]

    def path(self, slug=None):
        """Caminho de uma página a partir da raiz: a home ('' ou 'en/') ou um projeto ('projetos/<slug>/', 'en/projects/<slug>/')."""
        return self.dir + (f"{self['proj_dir']}/{slug}/" if slug else '')


PT, EN = Lang('pt'), Lang('en')
PT.other, EN.other = EN, PT


def lines(parts):
    return '<br>'.join(E(s) for s in parts)


def sec_attrs(L, view):
    """id da seção e, no data-sk-alt, o id dela no outro idioma (a troca de idioma volta para a mesma seção)."""
    return f'id="{L.id(view)}" data-sk-alt="{L.other.id(view)}"'


def letters(text):
    """Uma letra por span (animadas uma a uma); as palavras ficam inteiras e separadas por espaço de verdade,
    para a linha poder quebrar entre palavras em telas estreitas."""
    letter = '<span data-sk-letter="1" style="display: inline-block; will-change: transform">{}</span>'
    return ' '.join(f'<span style="display: inline-block; white-space: nowrap">{"".join(letter.format(E(ch)) for ch in w)}</span>'
                    for w in text.split())


def words(text):
    return ' '.join(f'<span data-sk-word="1" style="display: inline-block; margin-right: 0.22em; will-change: transform">{E(w)}</span>'
                    for w in text.split())


def nav_icon(path, cls=''):
    cls = f' class="{cls}"' if cls else ''
    return (f'<svg{cls} width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
            f'stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{path}"/></svg>')


# tema: lua e sol no traço dos ícones do menu. O botão mostra o tema para o qual leva (lua no claro, sol no escuro);
# aria-pressed diz se o escuro está ligado (o controlador sincroniza todos os botões [data-sk-theme])
MOON = 'M13.3 9.8A5.6 5.6 0 0 1 6.2 2.7a5.6 5.6 0 1 0 7.1 7.1Z'
SUN = 'M8 5.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2ZM8 1.7v1.4M8 12.9v1.4M1.7 8h1.4M12.9 8h1.4M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1'


def theme_btn(L):
    return (f'<button type="button" class="sk-lens-btn sk-theme" data-sk-theme aria-pressed="false" '
            f'aria-label="{L["theme_dark"]}" title="{L["theme_dark"]}">{nav_icon(MOON, "sk-i-moon")}{nav_icon(SUN, "sk-i-sun")}</button>')


def lang_switch(L, root, slug=None):
    """PT | EN na toolbar, em vidro como a nav: a lente descansa no idioma atual. Cada item é um link para a mesma
    página no idioma dele; no clique, o controlador acrescenta a âncora da seção visível (data-sk-alt)."""
    items = []
    for O in (PT, EN):
        href = root + O.path(slug) or './'
        cur = ' aria-current="true"' if O is L else f' data-sk-lang-alt="{href}"'
        items.append(f'<a class="sk-seg" href="{href}" hreflang="{O["html_lang"]}" lang="{O["html_lang"]}" '
                     f'aria-label="{O["lang_name"]}"{cur}>{O["lang_short"]}</a>')
    return (f'<nav class="sk-glass sk-track sk-lang" data-sk-glass="links" data-sk-glass-rest="{L.i}" aria-label="{L["lang_label"]}">\n'
            f'<span class="sk-lens" aria-hidden="true"></span>\n' + '\n'.join(items) + '\n</nav>')


def nav(L, home='', root='', slug=None):
    """Toolbar. home = caminho até a home do idioma ('' na própria home, onde a nav segue a seção visível);
    root = caminho até a raiz do site (assets e o outro idioma)."""
    spy = 'spy' if not home else 'links'
    mobile_links = ''.join(f'<a href="{home}#{L.id(v)}">{nav_icon(icon)}<span>{L.t(label)}</span></a>'
                           for v, label, icon in MENU)
    desktop_links = '\n'.join(f'<a class="sk-seg" href="{home}#{L.id(v)}">{L.t(label)}</a>'
                              for v, label, _ in MENU if v != 'contact')
    wa = wa_href(L)
    return f'''
<div class="sk-topblur sk-blurfx" data-sk-ui="1" aria-hidden="true"><i></i><i></i></div>
<header class="sk-toolbar" data-sk-ui="1" style="top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; gap: 19px; padding: 19px {PADX}; pointer-events: none">
<a class="sk-logo" href="{home}#{L.id('hero')}" style="pointer-events: auto">SITR3N.</a>
<div class="sk-tools">
<nav class="sk-desktop-nav" aria-label="{L['nav_aria']}" style="pointer-events: auto; display: flex; align-items: center; gap: 10px">
<div class="sk-glass sk-track sk-navlinks" data-sk-glass="{spy}">
<span class="sk-lens" aria-hidden="true"></span>
{desktop_links}
</div>
<a class="sk-lens-btn" href="{home}#{L.id('contact')}">{L['contact_btn']}</a>
</nav>
{lang_switch(L, root, slug)}
{theme_btn(L)}
<button type="button" class="sk-menu-toggle sk-lens-btn" data-sk-menu-open aria-controls="sk-mobile-menu" aria-expanded="false">{L['menu']} {nav_icon('M2 5h12M2 8h12M2 11h12')}</button>
</div>
<dialog id="sk-mobile-menu" class="sk-menu" data-sk-menu aria-label="{L['menu_aria']}">
<div class="sk-menu-head">
<span class="sk-logo" aria-hidden="true">SITR3N.</span>
<div class="sk-menu-actions">
{theme_btn(L)}
<button type="button" class="sk-menu-close sk-lens-btn" data-sk-menu-close autofocus aria-label="{L['menu_close']}">{nav_icon('m3.5 3.5 9 9m0-9-9 9')}</button>
</div>
</div>
<nav class="sk-menu-links" aria-label="{L['menu_links_aria']}">
{mobile_links}
<a href="{E(wa)}" target="_blank" rel="noopener" aria-label="{L['wa_menu_aria']}">{WA_ICON}<span>WhatsApp</span><span class="sk-menu-external" aria-hidden="true">↗</span></a>
</nav>
</dialog>
</header>'''


def hero(L):
    l1, l2 = L['hero']
    return f'''
<section id="{L.id('hero')}" data-sk-view="hero" style="position: relative; min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; justify-content: flex-end; padding: 96px {PADX} 96px; box-sizing: border-box">
<h1 aria-label="{E(L['hero_aria'])}" style="margin: 0; font-weight: 400; font-size: clamp(36px, 5.4vw, 96px); line-height: 0.96; letter-spacing: -0.015em; text-transform: uppercase; color: {INK}">
<span aria-hidden="true" style="display: block">{letters(l1)}</span>
<span aria-hidden="true" style="display: block">{letters(l2)}</span>
</h1>
</section>'''


def manifesto(L):
    return f'''
<section {sec_attrs(L, 'manifesto')} data-sk-view="manifesto" style="position: relative; height: max(1700px, 150vh)">
<div style="position: sticky; top: 0; height: 100vh; height: 100svh; display: flex; align-items: center; padding: 0 {PADX}; box-sizing: border-box">
<p class="sk-manifesto" style="margin: 0; max-width: 17em; line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; color: {INK}">{words(L['manifesto'])}</p>
</div>
</section>'''


def about(L):
    return f'''
<section {sec_attrs(L, 'about')} data-sk-view="about" style="position: relative; padding: 119px {PADX}">
<div data-sk-read data-sk-reveal="1" style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-start">
<div style="flex: 1 1 300px; display: flex; flex-direction: column; gap: 19px">
<p style="margin: 0; font-size: var(--sk-small, 15px); line-height: 1.4; letter-spacing: 0.013em; text-transform: uppercase; max-width: 26em">{E(L['about_intro'])}</p>
<a class="sk-link" href="https://github.com/Sitr3n01" style="align-self: flex-start; font-size: var(--sk-small, 15px); color: {INK}; text-decoration: none; border-radius: 10px; padding: 5px 0">GitHub ↗</a>
</div>
<div style="flex: 1 1 420px; max-width: 640px">
<p style="margin: 0; font-size: 18px; line-height: 1.4; letter-spacing: 0.013em">{E(L['about_text'])}</p>
</div>
</div>
</section>'''


# stack de trabalho: vem depois dos projetos em destaque (a visão geral leva direto aos projetos)
def stack(L):
    cells = '\n'.join(f'''<div class="sk-cell" style="background-color: {PAPER}; min-width: 0; min-height: 112px; padding: 19px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box">
<span style="font-size: 18px; line-height: 1.2">{E(n)}</span>
<span class="sk-cap" style="{CAP}">{E(L.t(c))}</span>
</div>''' for n, c in STACK)
    return f'''
<section {sec_attrs(L, 'stack')} data-sk-view="stack" style="position: relative; padding: 119px {PADX}">
<div data-sk-read data-sk-reveal="1" style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 19px; align-items: flex-start">
<h2 style="flex: 0 0 140px; margin: 0; font-weight: 400; {CAP}">{lines(L['stack_title'])}</h2>
<div class="sk-cq" style="flex: 1 1 560px; min-width: 0; max-width: 1200px">
<div class="sk-stack" style="display: flex; flex-wrap: wrap; gap: 1px; background-color: {ASH}; border: 1px solid {ASH}">
{cells}
</div>
</div>
</div>
</section>'''


def ascii_stage(slug, root, style):
    """Palco dos objetos do projeto em ASCII (src/js/ascii.js). O nome de transição é o mesmo no card e na página
    do projeto: o palco voa de um para o outro e continua girando de onde parou."""
    return (f'<div class="sk-ascii" data-sk-ascii="{slug}" data-sk-ascii-src="{root}assets/ascii/" aria-hidden="true" '
            f'style="{style}; view-transition-name: sk-glyph-{slug}; view-transition-class: sk-ascii"><canvas></canvas></div>')


def card(L, p, root):
    slug = p['slug']
    return f'''<article class="sk-card" data-sk-read data-sk-reveal="1" style="background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 24px 24px; min-height: 560px; padding: 30px; box-sizing: border-box; display: flex; flex-direction: column; gap: 19px">
<div style="display: flex; justify-content: space-between; align-items: center">
<span style="{CAP}">{E(p['cap'])}</span>
<span class="sk-open" aria-hidden="true" style="{CAP}; display: inline-flex; align-items: center; gap: 10px">{L['card_open']} <span class="sk-plus" style="font-size: 24px; line-height: 1; display: inline-block">+</span></span>
</div>
{ascii_stage(slug, root, 'flex: 1 1 auto; min-height: 340px; margin: 0 -30px')}
<h3 style="margin: 0; font-weight: 400; font-size: clamp(34px, 3.2vw, 46px); line-height: 1; letter-spacing: 0.006em"><a class="sk-card-link" href="{L['proj_dir']}/{slug}/" data-sk-project="{slug}"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></a></h3>
<p style="margin: 0; font-size: var(--sk-small, 15px); line-height: 1.4; max-width: 34em">{E(p['card'])}</p>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</article>'''


def work(L, projects, root):
    colA = '\n'.join(card(L, p, root) for p in projects[0::2])
    colB = '\n'.join(card(L, p, root) for p in projects[1::2])
    return f'''
<section {sec_attrs(L, 'work')} data-sk-view="work" style="position: relative; padding: 119px {PADX} 160px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 46px">
<div data-sk-read style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 19px">
<h2 style="margin: 0; font-weight: 400; {CAP}">{L['work_title']}</h2>
<a class="sk-lens-btn" href="https://github.com/Sitr3n01" rel="noopener">{L['work_all']}</a>
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


def chip(t, extra=False):
    """Chip da órbita. extra: some no celular, que fica com os 14 primeiros (as quatro áreas)."""
    cls = ' class="sk-chip-extra"' if extra else ''
    return (f'<span data-sk-chip="1"{cls} aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block; padding: 8px 12px; background-color: {PAPER}; border: 1px solid {ASH}; '
            f'font-family: {MONO}; font-size: 12px; line-height: 1.2; white-space: nowrap; color: {INK}">{E(t)}</span>')


MOBILE_CHIPS = 14
LBL = f"margin: 0; font-size: 15px; line-height: 1.1; letter-spacing: 0.013em; text-transform: uppercase; color: {INK}"


def areas(L):
    chips = '\n'.join(chip(L.t(t), i >= MOBILE_CHIPS) for i, t in enumerate(CHIPS))
    labels = '\n'.join(f'<p data-sk-orbit-label="1" style="{LBL}; {pos}">{lines(L.t(txt))}</p>' for txt, pos in AREA_LABELS)
    return f'''
<section {sec_attrs(L, 'areas')} data-sk-view="areas" aria-label="{L['areas_aria']}" style="position: relative; height: max(2600px, 120vh)">
<div style="position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden">
<div data-sk-orbit="1" style="position: absolute; left: 50%; top: 48%; width: 0; height: 0">
{chips}
</div>
<div class="sk-area-labels">
{labels}
</div>
<h2 class="sk-area-title" style="position: absolute; left: {PADX}; margin: 0; font-weight: 400; line-height: 0.8; letter-spacing: -0.01em; text-transform: uppercase; color: {INK}">{lines(L['areas_title'])}</h2>
</div>
</section>'''


def path(L):
    rows = '\n'.join(f'''<li class="sk-row" data-sk-reveal="1" style="display: flex; flex-wrap: wrap; gap: 8px 19px; align-items: flex-start; padding: 30px 0; border-top: 1px solid {ASH}">
<span style="flex: 0 0 48px; {CAP}">{n}</span>
<span class="sk-row-t" style="flex: 1 1 260px; font-size: clamp(24px, 2.6vw, 34px); line-height: 1; letter-spacing: 0.006em; text-transform: uppercase; display: inline-block">{E(L.t(t))}</span>
<span style="flex: 0 1 260px; margin-left: auto; {CAP}; text-align: right">{lines(L.t(ds))}</span>
</li>''' for n, t, ds in PATH_ROWS)
    return f'''
<section {sec_attrs(L, 'path')} data-sk-view="path" style="position: relative; padding: 119px {PADX}">
<div data-sk-read style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px">
<h2 style="flex: 0 0 200px; margin: 0; font-weight: 400; {CAP}">{lines(L['path_title'])}</h2>
<ol style="flex: 1 1 560px; list-style: none; margin: 0; padding: 0; border-bottom: 1px solid {ASH}">
{rows}
</ol>
</div>
</section>'''


# foto em preto e branco (a única cor do site são as flores); ganha cor no hover, ver .sk-me-photo
def me(L, root):
    facts = '\n'.join(f'<div class="sk-fact"><span style="{CAP}; color: {MUTE}">{L.t(k)}</span><span class="sk-fact-v">{lines(L.t(vs))}</span></div>'
                      for k, vs in ME_FACTS)
    return f'''
<section {sec_attrs(L, 'me')} data-sk-view="me" style="position: relative; padding: 119px {PADX}">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px">
<h2 data-sk-read style="flex: 0 0 200px; margin: 0; font-weight: 400; {CAP}">{L['me_title']}</h2>
<div class="sk-me-body" style="flex: 1 1 560px; min-width: 0; display: flex; flex-wrap: wrap; gap: 46px; align-items: flex-start">
<figure class="sk-me-photo" data-sk-read data-sk-reveal="1">
<img src="{root}assets/sobre/foto.jpg" width="960" height="1281" loading="lazy" decoding="async" alt="{E(L['me_alt'])}">
</figure>
<div class="sk-me-copy">
<div data-sk-read data-sk-reveal="1" style="display: flex; flex-direction: column; gap: 30px">
<h3 class="sk-me-name">{E(ME_NAME[0])}<br>{E(ME_NAME[1])}</h3>
<p class="sk-lead">{E(L['me_lead'])}</p>
</div>
<div class="sk-prose" data-sk-read data-sk-reveal="1">
{''.join(f'<p>{E(t)}</p>' for t in L['me_text'])}
</div>
<div class="sk-cq" data-sk-read data-sk-reveal="1"><div class="sk-facts" data-c="2">
{facts}
</div></div>
</div>
</div>
</div>
</section>'''


def contact(L):
    return f'''
<section {sec_attrs(L, 'contact')} data-sk-read data-sk-view="contact" style="position: relative; min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 119px {PADX} 30px; box-sizing: border-box">
<h2 data-sk-reveal="1" style="margin: 0; font-weight: 400; line-height: 0.8; letter-spacing: -0.015em; text-transform: uppercase">{lines(L['contact_title'])}</h2>
<div class="sk-glass sk-track sk-track-lg" data-sk-glass="links" data-sk-glass-rest="0" style="align-self: flex-start">
<span class="sk-lens" aria-hidden="true"></span>
<a class="sk-seg" href="https://github.com/Sitr3n01">GitHub <span class="sk-seg-sub">Sitr3n01</span> ↗</a>
<a class="sk-seg" href="https://www.linkedin.com/in/sitr3n">LinkedIn <span class="sk-seg-sub">/in/sitr3n</span> ↗</a>
<a class="sk-seg" href="mailto:zegilfarias@outlook.com">{L['email']} <span class="sk-seg-sub">zegilfarias@outlook.com</span></a>
</div>
<footer class="sk-footblur">
<div class="sk-blurfx" aria-hidden="true"><i></i><i></i></div>
<span style="{CAP}">© 2026 Sitr3n</span>
</footer>
</section>'''


# "Scroll" centralizado na base, com a seta descendo e subindo (para em prefers-reduced-motion). É um botão: cada
# clique avança até uma próxima parada de leitura; some no fim da página (controller.js)
def hint(L):
    return f'''<button type="button" data-sk-hint="1" data-sk-ui="3" class="sk-hint" aria-label="{L['hint_aria']}">
<span style="{CAP}; color: {INK}">Scroll</span>
<svg class="sk-hint-arrow" width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 1v19M1.5 14.5 7 20l5.5-5.5"/></svg>
</button>'''


# WhatsApp fixo no canto inferior direito (fora do scroller, como a nav), em vidro líquido. A logo é
# monocromática, na tinta do site: a paleta não tem o verde da marca. Abre a conversa com a mensagem pronta,
# no idioma da página.
WA_PHONE = '5561996805059'


def wa_href(L):
    return f'https://wa.me/{WA_PHONE}?text={urllib.parse.quote(L["wa_text"])}'


# logo: anel com o rabicho numa peça só (contorno externo menos o círculo interno, sem emenda) e o fone no meio
WA_RING = 'M2.1 21.9l1.35-5.05A9.9 9.9 0 1 1 7.2 20.55zM12 3.9a8.1 8.1 0 1 0 0 16.2a8.1 8.1 0 1 0 0-16.2z'
WA_PHONE_ICON = ('M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20'
                 'c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z')
WA_ICON = (f'<svg class="sk-wa-i" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">'
           f'<path d="{WA_RING}" fill="currentColor" fill-rule="evenodd"/>'
           f'<path d="{WA_PHONE_ICON}" fill="currentColor" transform="translate(12 12) scale(0.44) translate(-12 -12)"/></svg>')


# a entrada da interface (data-sk-ui) fica no invólucro: no próprio botão, a transição dela substituiria a do vidro
def wa(L):
    return (f'<div class="sk-wa-wrap" data-sk-ui="2"><a class="sk-lens-btn sk-wa" href="{E(wa_href(L))}" target="_blank" rel="noopener" '
            f'aria-label="{L["wa_aria"]}">{WA_ICON}</a></div>')


RINGS = f'''<svg data-sk-rings="1" aria-hidden="true" width="1" height="1" style="left: 0; top: 0; overflow: visible; pointer-events: none">
<circle cx="0" cy="0" r="230" style="fill: none; stroke: {ASH}; stroke-width: 1"></circle>
<circle cx="0" cy="0" r="360" style="fill: none; stroke: {ASH}; stroke-width: 1"></circle>
<circle cx="0" cy="0" r="520" style="fill: none; stroke: {ASH}; stroke-width: 1; stroke-opacity: 0.6"></circle>
</svg>'''

PROJECTS = {code: load_projects(code) for code in LANGS}


def frame(L, nav_html, main_html, doc=True, ref='', main_attrs=''):
    """Moldura das páginas: anéis, canvas da sakura, toolbar, conteúdo, "Scroll" e WhatsApp.
    doc=True (o site): a página rola o próprio documento. O canvas, a toolbar e os controles ficam fixos na tela
    (data-sk-doc, ver o CSS), e o canvas tem a altura da tela com a barra de endereço recolhida (100lvh): a barra do
    celular aparece e some sem redimensionar o fundo. doc=False (artboard do canvas de Design): uma caixa da altura da
    tela com um scroller interno (data-sk-scroller)."""
    if doc:
        return f'''<div data-sk-root="1" data-sk-doc="1"{ref} style="position: relative; background-color: {PARCH}; color: {INK}; font-family: {SANS}">
{RINGS}
<canvas data-sk-canvas="1" aria-hidden="true" style="left: 0; top: 0; width: 100%; height: 100vh; height: 100lvh; display: block"></canvas>
{nav_html}
<main{main_attrs} style="position: relative">
{main_html}
</main>
{hint(L)}
{wa(L)}
</div>'''
    return f'''<div data-sk-root="1"{ref} style="position: relative; height: 100vh; overflow: hidden; background-color: {PARCH}; color: {INK}; font-family: {SANS}">
{RINGS}
<canvas data-sk-canvas="1" aria-hidden="true" style="inset: 0; width: 100%; height: 100%; display: block"></canvas>
{nav_html}
<div data-sk-scroller="1" style="position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth">
<main{main_attrs}>
{main_html}
</main>
</div>
{hint(L)}
{wa(L)}
</div>'''


def body(L, root='', ref='', doc=True):
    main = '\n'.join([hero(L), manifesto(L), about(L), work(L, PROJECTS[L.code], root), stack(L), areas(L), path(L), me(L, root), contact(L)])
    return frame(L, nav(L, '', root), main, doc, ref)


GRID_BG = f"background-color: {PAPER}; background-image: linear-gradient(to right, {PARCH} 1px, transparent 1px), linear-gradient(to bottom, {PARCH} 1px, transparent 1px); background-size: 24px 24px"


def video_block(L, p, root):
    title = E(p['titulo'])
    label = E(L['video_aria'].format(p['titulo']))
    attrs, play, note = '', '', ''
    if p['video']:
        poster = f' poster="{root}{p["poster"]}"' if p['poster'] else ''
        media = f'<video class="sk-video-media" preload="metadata" playsinline{poster} src="{root}{p["video"]}" aria-label="{label}"></video>'
        play = f'<div class="sk-play-wrap"><button type="button" class="sk-lens-btn" data-sk-play="1">{L["watch"]}</button></div>'
        if p['video_lang'] != L.code:
            note = L['video_pt_note']
    elif p['youtube']:
        yt = E(p['youtube'])
        thumb = f'{root}{p["poster"]}' if p['poster'] else f'https://i.ytimg.com/vi/{yt}/hqdefault.jpg'
        media = f'<img class="sk-video-media" src="{thumb}" alt="" loading="lazy">'
        play = f'<div class="sk-play-wrap"><button type="button" class="sk-lens-btn" data-sk-play="1">{L["watch"]}</button></div>'
        attrs = f' data-sk-youtube="{yt}" data-sk-label="{label}"'
    else:
        media = (f'<div class="sk-video-empty"><span class="sk-video-k" aria-hidden="true">{p["kanji"]}</span>'
                 f'<p style="margin: 0; {CAP}; color: {MUTE}">{L["video_empty"]}</p></div>')
    return f'''<figure class="sk-video" data-sk-read data-sk-video="1" data-sk-reveal="1" data-sk-title="{title}"{attrs}>
<div class="sk-video-frame" style="{GRID_BG}">{media}{play}</div>
<figcaption style="{CAP}">{E(L['video_caption'].format(p['titulo']))}{note}</figcaption>
</figure>'''


def grid_attrs(n):
    """Células por linha de uma grade de fatos/números: todas numa linha só até 4, senão duas linhas
    equilibradas (5 → 3 + 2, 6 → 3 + 3). Com pouco espaço, só contagens pares passam por 2 por linha,
    para nenhuma célula ficar sozinha e esticada."""
    per_row = n if n <= 4 else -(-n // 2)
    pair = ' data-pair' if n % 2 == 0 and per_row > 2 else ''
    return f'data-c="{per_row}"{pair}'


def project_body(L, p, nxt, root):
    slug, home = p['slug'], '../../'
    facts = [(L['fact_role'], p.get('papel', '')), (L['fact_period'], p.get('periodo', '')),
             (L['fact_status'], p.get('status', '')), (L['fact_stack'], ', '.join(p['stack']))]
    facts = [(k, v) for k, v in facts if v]
    # no celular, um valor curto (período, status) ocupa meia linha; o longo (papel, stack), a linha inteira
    wide = lambda v: ' sk-fact-wide' if len(v) > 26 else ''
    facts_html = '\n'.join(f'<div class="sk-fact{wide(v)}"><span style="{CAP}; color: {MUTE}">{k}</span><span class="sk-fact-v">{inline(v)}</span></div>'
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
        links.append(f'<a class="sk-seg" href="{E(p["repo"])}" rel="noopener">{L["repo"]} <span class="sk-seg-sub">GitHub</span> ↗</a>')
    for site in (u.strip() for u in p.get('site', '').split(',')):  # um ou mais sites, separados por vírgula
        if not site:
            continue
        host = site.split('//', 1)[-1].split('/', 1)[0]
        links.append(f'<a class="sk-seg" href="{E(site)}" rel="noopener">{L["site"]} <span class="sk-seg-sub">{E(host)}</span> ↗</a>')
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
<section id="{L.id('proj')}" data-sk-view="proj" style="position: relative; min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--sk-project-top,184px) {PADX} 150px; box-sizing: border-box">
<div class="sk-project-hero" style="max-width: 1400px; width: 100%; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 46px 19px; align-items: flex-end; justify-content: space-between">
<div class="sk-project-copy" data-sk-read style="flex: 1 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 30px">
<a class="sk-link sk-project-back" href="{home}#{L.id('work')}" style="align-self: flex-start; {CAP}; color: {INK}; text-decoration: none; padding: 5px 0">{L['back']}</a>
<p style="margin: 0; {CAP}">{E(p['cap'])} · {inline(p.get('status', ''))}</p>
<h1 style="margin: 0; font-weight: 400; font-size: clamp(44px, 7.4vw, 120px); line-height: 0.9; letter-spacing: -0.015em; overflow-wrap: anywhere"><span style="display: inline-block; view-transition-name: sk-title-{slug}">{E(p['titulo'])}</span></h1>
<div class="sk-lead">{p['lead']}</div>
<p style="margin: 0; {CAP}">{E(p['tags'])}</p>
</div>
<div class="sk-tile" style="{GRID_BG}" aria-hidden="true">{ascii_stage(slug, root, 'position: absolute; inset: 0')}</div>
</div>
</section>
<section {sec_attrs(L, 'projbody')} data-sk-view="projbody" style="position: relative; padding: 46px {PADX} 119px">
<div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 76px">
{video_block(L, p, root)}
<div class="sk-cq" data-sk-read data-sk-reveal="1"><div class="sk-facts" {grid_attrs(len(facts))}>
{facts_html}
</div></div>
{''.join(secs)}
{links_html}
</div>
</section>
<section {sec_attrs(L, 'projnext')} data-sk-view="projnext" style="position: relative; display: flex; flex-direction: column; justify-content: flex-end; gap: 46px; padding: 30px {PADX} 30px; box-sizing: border-box">
<a class="sk-next" data-sk-read href="../{ns}/">
<span style="flex: 1 1 100%; {CAP}">{L['next']}{E(nxt['cap'])}</span>
<span class="sk-next-t"><span style="display: inline-block; view-transition-name: sk-title-{ns}">{E(nxt['titulo'])}</span> →</span>
</a>
<footer class="sk-footblur">
<div class="sk-blurfx" aria-hidden="true"><i></i><i></i></div>
<span style="{CAP}">© 2026 Sitr3n</span>
<a class="sk-link" href="{home}#{L.id('contact')}" style="{CAP}; text-decoration: none">{L['talk']}</a>
</footer>
</section>'''


def project_root(L, p, nxt, root):
    return frame(L, nav(L, '../../', root, p['slug']), project_body(L, p, nxt, root),
                 main_attrs='' if p['translated'] else ' data-sk-untranslated')


JP_CHARS = '桜木林森さくらヽゝ゜' + ''.join(dict.fromkeys(p['kanji'] for p in PROJECTS['pt']))
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet">\n'
         f'<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&amp;text={urllib.parse.quote(JP_CHARS)}&amp;display=swap" rel="stylesheet">')
def _word_in(u):
    """Entrada de uma palavra do manifesto ao longo do trecho dela (mesmas contas do controlador): loc = 1 - (1 - u)³;
    deslocamento (1 - loc) × off e opacidade smooth(0.5, 1, loc). Devolve (fração do deslocamento, opacidade)."""
    loc = 1 - (1 - u) ** 3
    t = min(1, max(0, (loc - 0.5) / 0.5))
    return 1 - loc, t * t * (3 - 2 * t)


def _word_keyframes(n=16):
    """As duas curvas da entrada numa animação só (uma por palavra), em n trechos lineares, mais o ponto em que a
    opacidade começa (loc = 0,5)."""
    us = sorted({i / n for i in range(n + 1)} | {1 - 0.5 ** (1 / 3)})
    stops = []
    for u in us:
        k, o = _word_in(u)
        stops.append(f'{u * 100:.2f}%{{transform:translate3d(0,calc(var(--off) * {k:.4f}),0);opacity:{o:.3f}}}')
    return '@keyframes sk-word{' + ''.join(stops) + '}'


# Efeitos presos à rolagem, no compositor. O controlador liga data-sk-timeline quando há suporte e escreve as faixas em
# px; sem suporte, ele mesmo anima no quadro, com as mesmas contas. O Chrome atualiza cada animação dessas a cada quadro,
# mesmo com a página parada (cerca de 0,25% da thread principal por animação com CPU 6×), então elas são poucas e só
# ficam ligadas perto da tela: as palavras do manifesto (uma animação por palavra) só com a seção perto da tela
# (data-sk-live), e o parallax, que é uma animação só. As letras do título (80 animações) ficam no quadro.
# Curvas: smoothstep = cubic-bezier(1/3,0,2/3,1); a entrada das palavras vai amostrada em trechos lineares.
TIMELINE_CSS = _word_keyframes() + '''
@keyframes sk-rise-out{to{transform:translate3d(0,-.7em,0);opacity:0}}
@keyframes sk-parallax{from{transform:translate3d(0,var(--y0),0)}to{transform:translate3d(0,var(--y1),0)}}
/* manifesto: cada palavra assenta no próprio trecho; a saída sobe o parágrafo inteiro */
[data-sk-timeline] [data-sk-live] [data-sk-word]{animation:sk-word linear both;animation-timeline:scroll(root);animation-range:var(--w0) var(--w1)}
[data-sk-timeline] [data-sk-live] .sk-manifesto{animation:sk-rise-out cubic-bezier(.333,0,.667,1) both;animation-timeline:scroll(root);animation-range:var(--x0) var(--x1)}
/* parallax: linear na página inteira, de --y0 (topo) a --y1 (fim) */
[data-sk-timeline] [data-sk-parallax]{animation:sk-parallax linear both;animation-timeline:scroll(root)}'''

CSS = f''':root{{{theme_vars('light')}}}
:root[data-theme="dark"]{{{theme_vars('dark')}}}
body{{margin:0;background:{PARCH}}}
a{{color:{INK}}}a:hover{{color:{INK}}}
a:focus-visible{{outline:2px solid {INK};outline-offset:3px}}
/* a página rola o documento (data-sk-doc); o artboard de Design rola o [data-sk-scroller] */
html{{background:{PARCH};scroll-behavior:smooth;scrollbar-gutter:stable}}
html,[data-sk-scroller]{{scrollbar-width:thin;scrollbar-color:{ASH} transparent}}
/* com o menu aberto, a página atrás dele não rola */
:root:has(.sk-menu[open]){{overflow:hidden}}
[data-sk-rings],[data-sk-canvas],.sk-toolbar{{position:absolute}}
[data-sk-doc]>:is([data-sk-rings],[data-sk-canvas],.sk-topblur,.sk-toolbar,.sk-hint,.sk-wa-wrap){{position:fixed}}
.sk-link:hover{{text-decoration:underline;text-underline-offset:4px}}
.sk-pill{{transition:background-color .25s ease,color .25s ease}}.sk-pill:hover{{background-color:{INK};color:{PARCH}}}
.sk-card .sk-plus{{transition:transform .45s cubic-bezier(.2,.7,.2,1)}}.sk-card:hover .sk-plus{{transform:rotate(90deg)}}
.sk-cell{{transition:background-color .25s ease,color .25s ease}}.sk-cell:hover{{background-color:{INK}!important;color:{PARCH}}}
.sk-cap{{color:{MUTE}}}.sk-cell:hover .sk-cap{{color:{ASH}}}
.sk-row .sk-row-t{{transition:transform .45s cubic-bezier(.2,.7,.2,1)}}.sk-row:hover .sk-row-t{{transform:translateX(19px)}}
@media (prefers-reduced-motion:reduce){{html,[data-sk-scroller]{{scroll-behavior:auto!important}}}}''' + '''
/* ---- vidro líquido: trilho fosco + lente refrativa ---- */
@property --rim{syntax:'<angle>';inherits:true;initial-value:0deg}
.sk-toolbar{--sk-track-tint:.55;--sk-track-blur:14px;--sk-lens-center:.92;--sk-lens-mid:.75}
.sk-glass{position:relative;border-radius:999px;background-color:rgba(var(--sk-parch-rgb),var(--sk-track-tint,.44));
  -webkit-backdrop-filter:blur(var(--sk-track-blur,9px)) saturate(1.25);backdrop-filter:blur(var(--sk-track-blur,9px)) saturate(1.25);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),inset 0 1px 3px rgba(29,29,29,.07),0 0 0 1px rgba(29,29,29,.06),0 1px 0 rgba(255,255,255,.8)}
.sk-logo{display:inline-block;padding:12px 0;font-size:22px;font-weight:700;line-height:1;letter-spacing:-.02em;text-decoration:none;color:var(--sk-ink)}
.sk-track{display:inline-flex;align-items:center;gap:2px;padding:4px}
.sk-track-lg{flex-wrap:wrap;max-width:100%;box-sizing:border-box}
.sk-seg{position:relative;z-index:1;display:inline-block;padding:10px 18px;border-radius:999px;font-size:var(--sk-cap,11px);line-height:1.4;letter-spacing:.05em;text-transform:uppercase;
  color:var(--sk-mute);text-decoration:none;white-space:nowrap;transition:color .35s ease}
.sk-seg.is-on,.sk-seg:hover{color:var(--sk-ink)}
.sk-track-lg .sk-seg{padding:14px 24px;font-size:var(--sk-small,15px);letter-spacing:.013em;text-transform:none}
/* direita da toolbar: nav (desktop), idioma e botão Menu (celular) num grupo só */
.sk-tools{display:flex;align-items:center;gap:10px}
.sk-lang{pointer-events:auto}
.sk-lang .sk-seg{padding:10px 12px}
.sk-seg-sub{color:var(--sk-mute);transition:color .35s ease}
.sk-lens-btn.sk-lens-btn-lg{padding:18px 28px;font-size:var(--sk-small,15px);letter-spacing:.013em;text-transform:none}
.sk-seg:focus-visible,.sk-lens-btn:focus-visible,.sk-logo:focus-visible{outline:2px solid var(--sk-ink);outline-offset:3px}

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
  transition:transform .62s cubic-bezier(.25,.85,.35,1),width .62s cubic-bezier(.25,.85,.35,1),height .62s cubic-bezier(.25,.85,.35,1),opacity .3s ease,--rim .9s cubic-bezier(.3,1,.4,1)}
.sk-lens.is-off{opacity:0;transform:translate3d(var(--x,0),var(--y,0),0) scale(.6,.6)}
.sk-lens.no-anim{transition:none}
.sk-lens-btn{position:relative;display:inline-block;padding:13px 22px;font-size:var(--sk-cap,11px);line-height:1.4;letter-spacing:.05em;text-transform:uppercase;
  color:var(--sk-ink);text-decoration:none;white-space:nowrap;transition:transform .5s cubic-bezier(.3,1.5,.5,1),--rim .9s cubic-bezier(.3,1,.4,1)}
.sk-lens-btn:hover{transform:scale(1.04)}.sk-lens-btn:active{transform:scale(.97)}
.sk-lens::before,.sk-lens-btn::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:2.5px;pointer-events:none;
  background:conic-gradient(from var(--rim),rgba(255,255,255,0) 18deg,rgba(250,203,14,.55) 30deg,rgba(240,107,168,.5) 38deg,rgba(120,186,230,.6) 46deg,rgba(255,255,255,0) 58deg,
    rgba(255,255,255,0) 198deg,rgba(120,186,230,.5) 210deg,rgba(240,107,168,.45) 218deg,rgba(250,203,14,.5) 226deg,rgba(255,255,255,0) 238deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;filter:blur(.7px)}
/* reflexo quente do topo: faixa de 4 px a 2 px do topo, com 68% da largura do vidro. Ela fica numa camada com o mesmo
   formato do vidro, recuada 2 px, e a borda arredondada dessa camada corta a faixa: o reflexo nunca sai do vidro. Nas
   pílulas, a faixa fica onde sempre esteve; nos botões redondos (WhatsApp, tema, fechar), vira um brilho curto que
   acompanha a curva. */
.sk-lens::after,.sk-lens-btn::after{content:"";position:absolute;inset:2px;border-radius:inherit;pointer-events:none;
  background:linear-gradient(90deg,rgba(255,246,220,0),rgba(255,246,220,.95) 22%,#fff 50%,rgba(255,246,220,.95) 78%,rgba(255,246,220,0)) 50% 0/calc(68% + 2.72px) 4px no-repeat;
  filter:blur(1.2px)}
@media (max-width:720px){.sk-track-lg{flex-direction:column;align-items:stretch;align-self:stretch!important;border-radius:30px}
  .sk-track-lg .sk-seg{padding:14px 20px}}
@media (prefers-reduced-motion:reduce){.sk-lens,.sk-lens-btn,.sk-seg{transition:none!important}}

/* ---- tema: botão de vidro redondo depois do idioma (no celular, no cabeçalho do menu); a lua gira e vira sol ---- */
.sk-lens-btn.sk-theme{display:inline-flex;flex:0 0 auto;width:44px;height:44px;padding:0;border:0;font:inherit;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent}
.sk-theme svg{position:absolute;left:50%;top:50%;margin:-9px 0 0 -9px;transition:opacity .4s ease,transform .6s cubic-bezier(.3,1.5,.5,1)}
.sk-theme .sk-i-sun,[data-theme="dark"] .sk-theme .sk-i-moon{opacity:0;transform:rotate(-70deg) scale(.5)}
[data-theme="dark"] .sk-theme .sk-i-sun{opacity:1;transform:none}
.sk-menu-actions{display:flex;align-items:center;gap:10px}
@media (prefers-reduced-motion:reduce){.sk-theme svg{transition:none}}

/* ---- tema escuro: as cores vêm dos tokens (THEMES no gerador). Só o vidro precisa de regras próprias: a luz dele é
   branca no claro e, no escuro, vira um brilho fraco na borda com sombra mais funda; o reflexo iridescente da borda
   (cores das flores) não muda ---- */
[data-theme="dark"] .sk-glass{box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 1px 3px rgba(0,0,0,.3),0 0 0 1px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.05)}
[data-theme="dark"] .sk-lens,[data-theme="dark"] .sk-lens-btn{
  background:radial-gradient(120% 90% at 50% 50%,rgba(50,50,48,var(--sk-lens-center,.76)) 55%,rgba(64,64,61,var(--sk-lens-mid,.63)) 78%,rgba(255,255,255,.2) 100%);
  -webkit-backdrop-filter:blur(2px) saturate(1.8) brightness(1.2);backdrop-filter:blur(2px) saturate(1.8) brightness(1.2);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.2),inset 0 0 2px 3px rgba(255,255,255,.04),inset 0 0 6px 5px rgba(0,0,0,.16),
    inset 0 5px 6px -3px rgba(255,255,255,.16),inset 0 -6px 8px -4px rgba(0,0,0,.4),
    inset 7px 0 9px -7px rgba(0,0,0,.32),inset -7px 0 9px -7px rgba(0,0,0,.32),
    0 0 0 1px rgba(0,0,0,.3),0 1px 1px rgba(0,0,0,.3),0 8px 18px -8px rgba(0,0,0,.7)}
[data-theme="dark"] .sk-lens::after,[data-theme="dark"] .sk-lens-btn::after{opacity:.4}
[data-theme="dark"] .sk-menu[open]{border-color:rgba(255,255,255,.1);background:rgba(var(--sk-paper-rgb),.92)}
[data-theme="dark"] .sk-menu::backdrop{background:rgba(0,0,0,.45)}

/* ---- abertura: a interface entra depois que a sakura floresce ---- */
[data-sk-ui]{transition:opacity .9s ease,transform 1s cubic-bezier(.2,.7,.2,1)}
[data-sk-ui="2"]{transition-delay:.15s}[data-sk-ui="3"]{transition-delay:.3s}
[data-sk-intro="on"] [data-sk-ui]{opacity:0!important;transform:translate3d(0,-10px,0);transition:none}
[data-sk-ui]:focus-visible,[data-sk-ui]:focus-within{transition:none}
@media (prefers-reduced-motion:reduce){[data-sk-ui]{transition:none}}
[data-sk-rings]{transition:opacity 1.4s ease}
[data-sk-intro="on"] [data-sk-rings]{opacity:0;transition:none}

/* ---- transição entre páginas: kanji e título do card voam até a página do projeto ---- */
@view-transition{navigation:auto}
::view-transition-group(*){animation-duration:.6s;animation-timing-function:cubic-bezier(.2,.7,.2,1)}
/* o palco do card é largo e o da página é quadrado: as duas imagens ficam inteiras e centradas durante o voo */
::view-transition-old(*.sk-ascii),::view-transition-new(*.sk-ascii){width:100%;height:100%;object-fit:contain}

/* ---- objetos dos projetos em ASCII (canvas por cima do quadriculado do card) ---- */
.sk-ascii{position:relative;display:block}
.sk-ascii canvas{position:absolute;left:0;top:0;display:block;pointer-events:none;image-rendering:pixelated}
@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}

/* ---- cards da home viram links ---- */
.sk-card{position:relative}
/* a coluna com parallax sobe por cima do botão "Todos no GitHub": a margem vazia dela não pega o mouse, só os cards */
[data-sk-parallax]{pointer-events:none}[data-sk-parallax]>*{pointer-events:auto}
.sk-card-link{color:inherit;text-decoration:none}
.sk-card-link::after{content:"";position:absolute;inset:0;z-index:2}
.sk-card-link:focus-visible{outline:none}
.sk-card:has(.sk-card-link:focus-visible){outline:2px solid var(--sk-ink);outline-offset:3px}
.sk-card .sk-open{color:var(--sk-mute);transition:color .3s ease}.sk-card:hover .sk-open{color:var(--sk-ink)}

/* ---- página de projeto ---- */
.sk-lead{max-width:34em;font-size:clamp(18px,1.6vw,22px);line-height:1.4;letter-spacing:.006em}
.sk-lead p{margin:0}
.sk-tile{position:relative;flex:0 0 auto;width:clamp(180px,24vw,340px);aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid var(--sk-ash);box-sizing:border-box}
/* flex com quebra: cada linha estica as células até fechar a largura, então o fundo (as linhas de 1px)
   nunca aparece como célula vazia. data-c = células por linha com espaço (grid_attrs); a largura do
   contêiner (.sk-cq) decide entre 1, 2 (só contagens pares, data-pair) e data-c por linha */
.sk-cq{container-type:inline-size}
.sk-facts,.sk-stats{display:flex;flex-wrap:wrap;gap:1px;background-color:var(--sk-ash);border:1px solid var(--sk-ash)}
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
.sk-fact,.sk-stat{min-width:0;background-color:var(--sk-paper);padding:19px;display:flex;flex-direction:column;justify-content:space-between;gap:19px;box-sizing:border-box}
.sk-fact{min-height:112px}.sk-stat{min-height:150px}
.sk-fact-v{font-size:18px;line-height:1.3}
.sk-stat-v{font-size:clamp(30px,3vw,46px);line-height:1;letter-spacing:-.01em}
.sk-sec{display:flex;flex-wrap:wrap;gap:19px;align-items:flex-start;padding-top:30px;border-top:1px solid var(--sk-ash)}
.sk-sec>h2{flex:0 0 200px;margin:0;font-weight:400;font-size:var(--sk-cap,11px);line-height:1.4;letter-spacing:.05em;text-transform:uppercase}
.sk-sec>div{flex:1 1 560px;min-width:0;max-width:820px}
.sk-prose{font-size:18px;line-height:1.5;letter-spacing:.006em}
.sk-prose p{margin:0 0 .9em}.sk-prose p:last-child{margin-bottom:0}
.sk-prose ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.7em}
.sk-prose li{position:relative;padding-left:1.4em}.sk-prose li::before{content:"+";position:absolute;left:0;color:var(--sk-mute)}
.sk-prose strong{font-weight:700}
.sk-prose code,.sk-lead code{font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.82em;padding:1px 5px;background-color:rgba(var(--sk-ink-rgb),.06)}
.sk-pending{background-color:rgba(240,107,168,.2);color:inherit;padding:0 4px}
.sk-video{margin:0;display:flex;flex-direction:column;gap:12px}
.sk-video-frame{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid var(--sk-ash)}
.sk-video-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;background-color:#1d1d1d}
.sk-video.is-playing video.sk-video-media{object-fit:contain}
.sk-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.sk-play-wrap{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center}
.sk-video.is-playing .sk-play-wrap{display:none}
.sk-play-wrap .sk-lens-btn{padding:18px 30px;font-size:12px}
.sk-video-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:19px}
.sk-video-k{font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;font-size:clamp(90px,12vw,190px);line-height:1;color:rgba(var(--sk-ink-rgb),.13)}
.sk-next{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:19px;padding:30px 0;border-top:1px solid var(--sk-ash);border-bottom:1px solid var(--sk-ash);color:var(--sk-ink);text-decoration:none}
.sk-next-t{display:inline-block;font-size:clamp(40px,6vw,96px);line-height:.9;letter-spacing:-.015em;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.sk-next:hover .sk-next-t{transform:translateX(19px)}
@media (max-width:720px){.sk-tile{width:min(60vw,240px)}.sk-sec>h2{flex-basis:100%}}

/* ---- desfoque em gradiente atrás da toolbar: forte no topo, some para baixo ---- */
.sk-topblur{position:absolute;top:0;left:0;right:0;height:168px;z-index:19;pointer-events:none;
  background:linear-gradient(to bottom,rgba(var(--sk-parch-rgb),.72) 0%,rgba(var(--sk-parch-rgb),.38) 45%,rgba(var(--sk-parch-rgb),0) 100%)}
.sk-topblur{--dir:to bottom}
.sk-blurfx i{position:absolute;inset:0}
/* duas camadas (antes eram cinco): o desfoque progressivo continua, com menos passes de GPU sobre o canvas animado */
.sk-blurfx i:nth-child(1){-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);-webkit-mask-image:linear-gradient(var(--dir),#000 55%,transparent 88%);mask-image:linear-gradient(var(--dir),#000 55%,transparent 88%)}
.sk-blurfx i:nth-child(2){-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);-webkit-mask-image:linear-gradient(var(--dir),#000 12%,transparent 46%);mask-image:linear-gradient(var(--dir),#000 12%,transparent 46%)}
/* rodapé: o mesmo desfoque, de baixo para cima, sangrando até as bordas da tela */
.sk-footblur{--dir:to top;position:relative;margin:0 calc(-1 * clamp(19px,4vw,76px)) -30px;padding:0 clamp(19px,4vw,76px) 30px;min-height:168px;
  display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px 19px;box-sizing:border-box;
  background:linear-gradient(to top,rgba(var(--sk-parch-rgb),.60) 0%,rgba(var(--sk-parch-rgb),.31) 45%,rgba(var(--sk-parch-rgb),0) 100%)}
.sk-footblur>.sk-blurfx{position:absolute;inset:0;pointer-events:none}
.sk-footblur>:not(.sk-blurfx){position:relative}
@media (max-width:720px){.sk-topblur{height:128px}.sk-logo{font-size:19px}.sk-footblur{min-height:128px}}

[data-sk-view="manifesto"] p{font-size:clamp(30px,3.6vw,54px)}
[data-sk-orbit]{z-index:0;pointer-events:none}
.sk-area-labels{position:absolute;inset:0;pointer-events:none;z-index:1}
.sk-area-labels [data-sk-orbit-label]{position:absolute}
.sk-area-title{bottom:46px;z-index:1;font-size:clamp(44px,5vw,76px)}
@media (max-width:900px),(max-height:600px){
  .sk-area-labels [data-sk-orbit-label],.sk-area-title{paint-order:stroke fill;-webkit-text-stroke:3px var(--sk-parch)}
}
@media (min-width:721px) and (max-width:900px){.sk-area-title{bottom:86px}}
[data-sk-view="contact"] h2{font-size:clamp(56px,7.4vw,112px)}

/* ---- sobre mim: foto 3:4 em preto e branco (ganha cor no hover), nome em caixa alta, texto e fatos ---- */
.sk-me-photo{flex:0 1 clamp(240px,26vw,420px);min-width:0;margin:0;border:1px solid var(--sk-ash);background-color:var(--sk-paper);line-height:0}
.sk-me-photo img{display:block;width:100%;height:auto;aspect-ratio:960/1281;object-fit:cover;filter:grayscale(1) contrast(1.04);transition:filter .6s ease}
.sk-me-photo:hover img{filter:none}
.sk-me-copy{flex:1 1 380px;min-width:0;max-width:640px;display:flex;flex-direction:column;gap:46px}
@container (min-width:360px){.sk-me-copy .sk-fact{flex-basis:calc((100% - 2px) / 2)}}
.sk-me-name{margin:0;font-weight:400;font-size:clamp(40px,4.6vw,76px);line-height:.86;letter-spacing:-.015em;text-transform:uppercase}
@media (prefers-reduced-motion:reduce){.sk-me-photo img{transition:none}}
@media (max-width:720px){.sk-me-photo{flex-basis:100%;max-width:420px}.sk-me-copy{gap:30px}}
@media (max-width:720px){
  [data-sk-view="proj"]{--sk-project-top:144px}
  .sk-area-labels{inset:64px 0 100px}
  .sk-area-title{bottom:100px}
  .sk-track-lg .sk-seg{min-width:0;white-space:normal;overflow-wrap:anywhere}
  [data-sk-view="contact"] h2{font-size:clamp(32px,13.5vw,56px)}
}
@media (max-height:520px){
  [data-sk-view="proj"]{--sk-project-top:120px}
  .sk-topblur{height:clamp(72px,27vh,116px)}
  [data-sk-view="manifesto"] p{font-size:clamp(22px,min(3.6vw,7vh),34px)}
  .sk-area-labels{inset:100px 0 165px}
  .sk-area-title{bottom:92px;font-size:clamp(26px,8vh,40px)}
}
@media (min-height:521px) and (max-height:650px){
  .sk-area-labels{inset:142px clamp(19px,4vw,76px) auto;display:flex;justify-content:space-between;gap:8px}
  .sk-area-labels [data-sk-orbit-label]{position:static;font-size:clamp(11px,3vw,15px)!important}
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
.sk-wa{display:inline-flex;align-items:center;justify-content:center;padding:17px;color:var(--sk-ink);text-decoration:none}
.sk-wa-i{flex:0 0 auto;display:block;width:30px;height:30px}
@media (max-width:1023px){.sk-wa-wrap{bottom:22px}.sk-wa{padding:13px}.sk-footblur{padding-right:calc(clamp(19px,4vw,76px) + 76px)}}

/* ---- indicador de scroll: centro da base, seta animada ---- */
.sk-hint{position:absolute;left:50%;width:120px;margin:0 0 0 -60px;bottom:22px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:0;border:0;background:none;font:inherit;color:inherit;cursor:pointer}
.sk-hint:focus-visible{outline:2px solid var(--sk-ink);outline-offset:6px;border-radius:10px}
.sk-hint:hover .sk-hint-arrow{animation-duration:.9s}
.sk-hint::before{content:"";position:absolute;inset:-26px -34px -14px;z-index:-1;border-radius:50%;
  background:radial-gradient(closest-side,rgba(var(--sk-parch-rgb),.78) 35%,rgba(var(--sk-parch-rgb),0));
  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  -webkit-mask-image:radial-gradient(closest-side,#000 45%,transparent);mask-image:radial-gradient(closest-side,#000 45%,transparent)}
.sk-hint-arrow{display:block;animation:sk-bob 1.6s cubic-bezier(.45,0,.55,1) infinite}
@keyframes sk-bob{0%,100%{transform:translateY(-3px)}50%{transform:translateY(5px)}}
@media (prefers-reduced-motion:reduce){.sk-hint-arrow{animation:none}}
/* nível de qualidade C (aparelhos fracos, ver TIERS no controlador): vidro sem desfoque, com o fundo mais opaco */
[data-sk-tier="c"] .sk-glass,[data-sk-tier="c"] .sk-lens,[data-sk-tier="c"] .sk-lens-btn,[data-sk-tier="c"] .sk-blurfx i,
[data-sk-tier="c"] .sk-hint::before,[data-sk-tier="c"] .sk-menu{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
[data-sk-tier="c"] .sk-glass{background-color:rgba(var(--sk-parch-rgb),.9)}

/* A toolbar e os controles cabem em uma linha também no celular deitado. Até 950 px a nav do desktop, o "Contato +", o
   seletor de idioma e o botão de tema não cabem numa linha ao lado do logo (o inglês pede ~870 px mais as margens): a
   toolbar vira logo + idioma + Menu (o mesmo do celular), e o tema vai para o cabeçalho do menu. */
.sk-menu-toggle,.sk-menu{display:none}
@media (max-width:950px),(max-width:1024px) and (pointer:coarse),(max-height:520px) and (pointer:coarse){
  :root{--sk-mobile-edge:clamp(16px,4.5vw,32px);--sk-mobile-top:104px}
  html,[data-sk-scroller]{scroll-padding-top:var(--sk-mobile-top)}
  .sk-toolbar{padding:12px var(--sk-mobile-edge)!important}
  .sk-toolbar .sk-logo,.sk-menu .sk-logo{font-size:19px;line-height:20px}
  .sk-topblur{height:var(--sk-mobile-top)}
  [data-sk-root]:not([data-sk-menu-ready]) .sk-navlinks{display:none}
  [data-sk-menu-ready] .sk-desktop-nav,[data-sk-menu-ready] .sk-wa-wrap,[data-sk-menu-ready] .sk-tools>.sk-theme{display:none!important}
  [data-sk-menu-ready] .sk-menu-toggle,.sk-menu-close{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;
    gap:10px;min-height:44px;padding:0 15px;border:0;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .sk-menu-toggle[aria-expanded="true"]{opacity:0}
  .sk-menu[open]{display:block;pointer-events:auto;position:fixed;inset:12px var(--sk-mobile-edge) auto auto;
    width:min(420px,calc(100% - 2 * var(--sk-mobile-edge)));max-width:none;max-height:calc(100dvh - 24px);
    box-sizing:border-box;overflow:auto;overscroll-behavior:contain;margin:0;padding:14px 18px 8px;
    border:1px solid rgba(255,255,255,.85);border-radius:24px;color:var(--sk-ink);background:rgba(246,245,242,.92);
    -webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
  .sk-menu::backdrop{background:rgba(29,29,29,.15)}
  .sk-menu-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px}
  .sk-menu-close{min-width:44px;padding:0}
  .sk-menu-links{display:grid;border-top:1px solid var(--sk-ash)}
  .sk-menu-links a{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:12px;
    min-height:50px;padding:0 8px;color:var(--sk-ink);text-decoration:none;font-size:16px}
  .sk-menu-links a+a{border-top:1px solid rgba(var(--sk-ink-rgb),.16)}
  .sk-menu-links a:active{background:rgba(var(--sk-ink-rgb),.06)}
  .sk-menu-links .sk-wa-i{height:19px;width:19px}
  .sk-menu-external{font-size:14px;color:var(--sk-mute)}
  .sk-hint{left:auto;right:var(--sk-mobile-edge);bottom:14px;width:auto;min-height:48px;margin:0;padding:0 8px 0 12px;
    flex-direction:row;justify-content:center;gap:12px}
  .sk-hint::before{inset:-10px -16px -5px}
  .sk-hint:focus-visible{outline-offset:1px}
  .sk-card .sk-ascii,.sk-tile .sk-ascii{overflow:hidden}
  [data-sk-menu-ready] .sk-footblur{padding-right:clamp(19px,4vw,76px)}
}
@media (max-width:720px),(max-width:935px) and (pointer:coarse){
  [data-sk-card-columns]>[data-sk-parallax]{padding-top:0!important}
  [data-sk-card-columns]>[data-sk-parallax]:not(:has(.sk-card)){display:none!important}
}
/* tamanhos mínimos no celular: rótulos com 12 px e corpo com 16 px */
@media (max-width:720px){
  :root{--sk-cap:12px;--sk-small:16px}
  [data-sk-view="hero"]{padding-bottom:max(92px,12svh)!important}
  [data-sk-view="hero"] h1{font-size:clamp(27px,9.2vw,60px)!important}
  [data-sk-view="about"],[data-sk-view="work"],[data-sk-view="stack"],[data-sk-view="path"],[data-sk-view="me"]{padding-block:84px!important}
  [data-sk-view="work"] .sk-lens-btn{display:inline-flex;align-items:center;min-height:44px;box-sizing:border-box}
  .sk-card{min-height:0!important;padding:20px!important;gap:16px!important}
  .sk-card .sk-ascii{min-height:clamp(220px,70vw,340px)!important;margin-inline:-20px!important}
  .sk-row{display:grid!important;grid-template-columns:28px minmax(0,1fr);gap:10px 8px!important}
  .sk-row>span:last-child{grid-column:2;margin-left:0!important;text-align:left!important}
  [data-sk-view="contact"]{gap:24px!important}
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
@media (max-height:520px) and (max-width:720px),(max-height:520px) and (pointer:coarse){
  :root{--sk-mobile-top:78px}
  [data-sk-view="hero"]{padding-bottom:92px!important}
  [data-sk-view="hero"] h1{font-size:clamp(24px,min(6.5vw,10.5vh),46px)!important}
  [data-sk-view="proj"]{--sk-project-top:92px;padding-bottom:76px!important}
  .sk-project-hero{gap:16px!important}
  .sk-project-copy{gap:12px!important}
}
@media (min-width:520px) and (max-height:520px) and (max-width:720px),(min-width:520px) and (max-height:520px) and (pointer:coarse){
  .sk-menu-links{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sk-menu-links a+a{border-top:0}
  .sk-menu-links a:nth-child(n+3){border-top:1px solid rgba(var(--sk-ink-rgb),.16)}
  .sk-menu-links a:nth-child(even){border-left:1px solid rgba(var(--sk-ink-rgb),.16);padding-left:12px}
  .sk-project-hero{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,34%);align-items:center!important}
  .sk-project-hero .sk-tile{width:min(100%,340px);justify-self:center}
  .sk-project-copy h1{font-size:clamp(34px,6.3vw,60px)!important}
}
@media (max-height:400px){
  .sk-toolbar{padding-block:9px!important}
  .sk-topblur{height:clamp(62px,25vh,84px)}
  :root{--sk-mobile-top:clamp(62px,25vh,84px)}
  [data-sk-view="hero"]{padding-block:70px 73px!important}
  [data-sk-view="hero"] h1,[data-sk-view="proj"] h1{font-size:clamp(20px,min(8.5vw,12vh),56px)!important}
  .sk-next-t{font-size:clamp(26px,min(10vw,12vh),50px)}
  [data-sk-view="contact"] h2{font-size:clamp(27px,min(13.5vw,13vh),56px)}
  .sk-wa-wrap{bottom:12px}.sk-wa{padding:9px}
  .sk-footblur{padding-right:calc(clamp(19px,4vw,76px) + 64px)}
  .sk-hint{bottom:12px;min-height:44px;flex-direction:row;justify-content:center;gap:10px}
  .sk-hint::before{top:-8px}
  .sk-area-title{bottom:74px}
}
@media (max-height:350px){
  .sk-area-labels{inset:76px clamp(19px,4vw,76px) auto}
  .sk-area-labels [data-sk-orbit-label]{font-size:clamp(11px,3vw,15px)!important}
}
@media (max-width:320px) and (max-height:400px){
  [data-sk-view="manifesto"] p{font-size:clamp(15px,min(5.8vw,6.8vh),22px)}
}
/* ---- layout mobile (fase 4): menos rolagem para o mesmo conteúdo ---- */
@media (max-width:720px){
  /* stack em 2 × 5 (antes, 10 células numa coluna) */
  .sk-stack>.sk-cell{flex-basis:calc((100% - 2px) / 2)!important;min-height:84px!important;padding:14px 16px!important}
  .sk-stack>.sk-cell>span:first-child{font-size:16px!important}
  /* fatos: os curtos dois por linha, os longos na linha inteira; números aos pares */
  .sk-facts>.sk-fact{flex-basis:calc((100% - 2px) / 2);min-height:84px;padding:16px;gap:12px}
  .sk-facts>.sk-fact-wide{flex-basis:100%}
  .sk-stats[data-pair]>.sk-stat{flex-basis:calc((100% - 2px) / 2)}
  .sk-stat{min-height:112px;padding:16px}
  /* cards: palco mais baixo, objeto do mesmo tamanho */
  .sk-card .sk-ascii{min-height:clamp(200px,62vw,320px)!important;--sk-ascii-fit:1.1}
  /* frentes de trabalho: 14 chips e os rótulos numa linha fixa no topo, fora da órbita */
  .sk-chip-extra{display:none!important}
  .sk-area-labels{inset:calc(var(--sk-mobile-top) + 12px) var(--sk-mobile-edge) auto!important;display:flex;justify-content:space-between;gap:8px}
  .sk-area-labels [data-sk-orbit-label]{position:static!important;font-size:12px!important;line-height:1.2!important}
  /* sobre mim: foto menor, ao lado do nome; o texto e os fatos seguem na largura toda */
  .sk-me-body{display:grid!important;grid-template-columns:minmax(0,36%) minmax(0,1fr);gap:20px 16px!important;align-items:start!important}
  .sk-me-copy{display:contents}
  .sk-me-photo{grid-column:1;grid-row:1;max-width:none!important}
  .sk-me-copy>:first-child{grid-column:2;grid-row:1;gap:14px!important}
  .sk-me-copy>:not(:first-child){grid-column:1 / -1}
  .sk-me-name{font-size:clamp(22px,7vw,32px)}
  .sk-me-copy .sk-lead{font-size:16px}
}
/* cenas fixadas mais curtas no celular: o manifesto e as frentes de trabalho tomavam 33% da rolagem */
@media (max-width:720px),(max-height:520px) and (pointer:coarse){
  [data-sk-view="manifesto"]{height:130vh!important;height:130svh!important}
  [data-sk-view="areas"]{height:170vh!important;height:170svh!important}
}''' + '\n' + TIMELINE_CSS

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
<title>Sitr3n — portfólio</title>
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
{body(PT, '', ' ref="{{ bindRoot }}"', doc=False)}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
{DC_SCRIPT}
</script>
</body>
</html>
'''


def alternates(slug=None):
    """hreflang: cada página aponta para ela mesma nos dois idiomas; o português é o padrão (x-default)."""
    tags = [f'<link rel="alternate" hreflang="{O["html_lang"]}" href="{SITE}{O.path(slug)}">' for O in (PT, EN)]
    tags.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}{PT.path(slug)}">')
    return '\n'.join(tags)


# Tema antes da primeira pintura (sem piscar): ?theme=dark|light (testes), senão a escolha guardada, senão o claro, que
# é o padrão do site. O controlador cuida dos botões e mantém as páginas abertas em dia com a escolha (mountTheme).
THEME_SCRIPT = ('<script>(function(d){var t=(/[?&]theme=(dark|light)\\b/.exec(location.search)||[])[1];'
                "if(!t)try{t=localStorage.getItem('sk-theme')}catch(e){}"
                "d.setAttribute('data-theme',t==='dark'?'dark':'light')})(document.documentElement)</script>")


def build_standalone(L, script_src, body_html, title, desc=None, opts="{ preset: 'kosa' }", slug=None):
    sc = f'<script src="{script_src}"></script>'
    meta = f'\n<meta name="description" content="{E(desc)}">' if desc else ''
    return f'''<!DOCTYPE html>
<html lang="{L['html_lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#{''.join(f'{v:02x}' for v in THEMES['light']['parch'])}">
{THEME_SCRIPT}
<title>{E(title)}</title>{meta}
<link rel="canonical" href="{SITE}{L.path(slug)}">
{alternates(slug)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{FONTS}
<style>
{CSS}
</style>
</head>
<body>
{body_html}
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
    ap = argparse.ArgumentParser(description='Gera a home e as páginas de projeto em português e inglês e, opcionalmente, Main.dc.html.')
    ap.add_argument('--out', default='.', help='diretório de saída (padrão: diretório atual)')
    ap.add_argument('--dc', metavar='SCRIPT_URL', help='também gera Main.dc.html apontando para SCRIPT_URL')
    args = ap.parse_args()
    for L in (PT, EN):
        # root: caminho de cada página até a raiz do site, onde ficam o script e os assets (compartilhados)
        root = '../' * L.path().count('/')
        out = os.path.join(args.out, L.dir)
        os.makedirs(out, exist_ok=True)
        write(os.path.join(out, 'index.html'),
              build_standalone(L, root + 'sakura-site.js', body(L, root), L['title'], L['desc']))
        projects = PROJECTS[L.code]
        for i, p in enumerate(projects):
            nxt = projects[(i + 1) % len(projects)]
            proot = '../' * L.path(p['slug']).count('/')
            folder = os.path.join(args.out, L.path(p['slug']))
            os.makedirs(folder, exist_ok=True)
            opts = "{ preset: '%s', intro: 'page' }" % p.get('sakura', 'kosa')
            write(os.path.join(folder, 'index.html'),
                  build_standalone(L, proot + 'sakura-site.js', project_root(L, p, nxt, proot), f"{p['titulo']} — Sitr3n",
                                   p['card'], opts, p['slug']))
    if args.dc:
        write(os.path.join(args.out, 'Main.dc.html'), build_dc(args.dc))
    print('ok')
