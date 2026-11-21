"""Conteúdo dos projetos: src/content/projetos/*.md (front matter simples + Markdown).

Front matter: linhas `chave: valor` entre `---`. O corpo aceita um subconjunto de Markdown:
parágrafos, `## seções`, listas com `-`, **negrito**, *itálico*, `código` e [links](url).
O texto antes da primeira seção vira o lead. A seção "Em números" (em inglês, "Key figures") vira uma grade de
destaques (cada item: **valor** rótulo).

Endereço (slug): sempre o nome do projeto (titulo), em minúsculas e com hífens: "News Portal" → projetos/news-portal/.
Se o nome mudar, ponha o endereço anterior em enderecos_antigos (separados por vírgula): ele vira uma página que leva
ao novo, para os links já compartilhados continuarem funcionando.

Inglês: src/content/projetos/en/<mesmo nome>.md, só com os campos que mudam de idioma (categoria, card, tags, papel,
periodo, status) e o corpo inteiro traduzido; o resto (titulo, kanji, stack, repo, site...) vem do arquivo em português.
Vídeo e poster em inglês, quando existirem: apresentacao.en.mp4 e poster.en.jpg (senão, os em português).
"""
import html
import os
import re
import unicodedata

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONTENT = os.path.join(ROOT, 'src', 'content', 'projetos')
STATS_TITLES = ('em números', 'key figures')
ASSETS = os.path.join(ROOT, 'src', 'assets')
VIDEO_EXT = ('.mp4', '.webm')
POSTER_EXT = ('.jpg', '.jpeg', '.png', '.webp', '.avif')
PENDING = '[preencher]'


def esc(s):
    return html.escape(s, quote=False)


def slugify(text):
    """Nome do projeto → endereço: 'Local AI Provider' → 'local-ai-provider' (sem acento, minúsculas, hífens)."""
    t = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def inline(text):
    t = esc(text)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)

    def link(m):
        label, url = m.group(1), m.group(2)
        ext = url.startswith('http')
        attrs = ' rel="noopener"' if ext else ''
        return f'<a class="sk-link" href="{html.escape(url)}"{attrs}>{label}{" ↗" if ext else ""}</a>'
    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, t)
    t = t.replace(esc(PENDING), f'<mark class="sk-pending">{esc(PENDING)}</mark>')
    t = re.sub(r'\[preencher: ([^\]]+)\]', r'<mark class="sk-pending">[preencher: \1]</mark>', t)
    return t


def blocks(lines):
    """Linhas de uma seção → HTML (parágrafos e listas)."""
    out, para, items = [], [], []

    def flush():
        if para:
            out.append(f'<p>{inline(" ".join(para))}</p>')
            para.clear()
        if items:
            out.append('<ul>' + ''.join(f'<li>{inline(i)}</li>' for i in items) + '</ul>')
            items.clear()
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            flush()
        elif line.lstrip().startswith('- '):
            if para:
                flush()
            items.append(line.lstrip()[2:].strip())
        elif items and raw.startswith('  '):
            items[-1] += ' ' + line.strip()
        else:
            if items:
                flush()
            para.append(line.strip())
    flush()
    return '\n'.join(out)


def stats(lines):
    """Itens '- **valor** rótulo' da seção Em números."""
    out = []
    for line in lines:
        m = re.match(r'\s*-\s+\*\*(.+?)\*\*\s*(.*)', line)
        if m:
            out.append((m.group(1).strip(), m.group(2).strip()))
    return out


def split(path):
    """Arquivo .md → (front matter, corpo, texto bruto)."""
    raw = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    meta, body = {}, raw
    if raw.startswith('---\n'):
        end = raw.index('\n---', 4)
        for line in raw[4:end].splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()
        body = raw[end + 4:]
    return meta, body, raw


def parse(path, lang='pt'):
    meta, body, raw = split(path)
    slug = slugify(meta.get('titulo', ''))  # do nome em português: o mesmo endereço nos dois idiomas
    if not slug:
        raise ValueError(f'{path}: falta o titulo, que dá o endereço do projeto')
    translated = lang == 'pt'
    if not translated:
        tr = os.path.join(os.path.dirname(path), lang, os.path.basename(path))
        if os.path.exists(tr):  # sem tradução, a página sai em português e o check acusa
            tmeta, body, raw = split(tr)
            meta = {**meta, **tmeta}
            translated = True
    lead, sections, cur = [], [], None
    for line in body.split('\n'):
        if line.startswith('## '):
            cur = {'title': line[3:].strip(), 'lines': []}
            sections.append(cur)
        elif cur is None:
            lead.append(line)
        else:
            cur['lines'].append(line)
    p = dict(meta)
    p['slug'] = slug
    p['antigos'] = [s.strip() for s in meta.get('enderecos_antigos', '').split(',') if s.strip()]
    p['ordem'] = int(meta.get('ordem', '99'))
    p['stack'] = [s.strip() for s in meta.get('stack', '').split(',') if s.strip()]
    p['lead'] = blocks(lead)
    p['sections'] = []
    for s in sections:
        if s['title'].lower() in STATS_TITLES:
            p['sections'].append({'title': s['title'], 'stats': stats(s['lines'])})
        else:
            p['sections'].append({'title': s['title'], 'html': blocks(s['lines'])})
    folder = os.path.join(ASSETS, 'projetos', slug)

    def find(name, exts):
        for e in exts:
            if os.path.exists(os.path.join(folder, name + e)):
                return f'assets/projetos/{slug}/{name}{e}'
        return None
    own = None if lang == 'pt' else find(f'apresentacao.{lang}', VIDEO_EXT)
    p['video'] = meta.get('video') or own or find('apresentacao', VIDEO_EXT)
    p['video_lang'] = lang if own and p['video'] == own else 'pt'
    p['poster'] = meta.get('poster') or (lang != 'pt' and find(f'poster.{lang}', POSTER_EXT)) or find('poster', POSTER_EXT)
    p['translated'] = translated
    p['youtube'] = meta.get('youtube') or None
    p['pending'] = PENDING in raw
    p['source'] = os.path.relpath(path, ROOT).replace('\\', '/')
    return p


def load_projects(lang='pt'):
    files = sorted(f for f in os.listdir(CONTENT) if f.endswith('.md'))
    projects = sorted((parse(os.path.join(CONTENT, f), lang) for f in files), key=lambda p: p['ordem'])
    used = [s for p in projects for s in [p['slug'], *p['antigos']]]
    dup = sorted({s for s in used if used.count(s) > 1})
    if dup:
        raise ValueError(f'endereço de projeto repetido: {", ".join(dup)}')
    for i, p in enumerate(projects):
        p['num'] = f'{i + 1:02d}'
        p['cap'] = f"{p['num']} — {p['categoria']}"
    return projects
