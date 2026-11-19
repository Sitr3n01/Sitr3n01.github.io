"""Conteúdo dos projetos: src/content/projetos/*.md (front matter simples + Markdown).

Front matter: linhas `chave: valor` entre `---`. O corpo aceita um subconjunto de Markdown:
parágrafos, `## seções`, listas com `-`, **negrito**, *itálico*, `código` e [links](url).
O texto antes da primeira seção vira o lead. A seção "Em números" vira uma grade de destaques
(cada item: **valor** rótulo).
"""
import html
import os
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONTENT = os.path.join(ROOT, 'src', 'content', 'projetos')
ASSETS = os.path.join(ROOT, 'src', 'assets')
VIDEO_EXT = ('.mp4', '.webm')
POSTER_EXT = ('.jpg', '.jpeg', '.png', '.webp', '.avif')
PENDING = '[preencher]'


def esc(s):
    return html.escape(s, quote=False)


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


def parse(path):
    raw = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    meta, body = {}, raw
    if raw.startswith('---\n'):
        end = raw.index('\n---', 4)
        for line in raw[4:end].splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()
        body = raw[end + 4:]
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
    p['ordem'] = int(meta.get('ordem', '99'))
    p['stack'] = [s.strip() for s in meta.get('stack', '').split(',') if s.strip()]
    p['lead'] = blocks(lead)
    p['sections'] = []
    for s in sections:
        if s['title'].lower() == 'em números':
            p['sections'].append({'title': s['title'], 'stats': stats(s['lines'])})
        else:
            p['sections'].append({'title': s['title'], 'html': blocks(s['lines'])})
    slug = p['slug']
    folder = os.path.join(ASSETS, 'projetos', slug)

    def find(name, exts):
        for e in exts:
            if os.path.exists(os.path.join(folder, name + e)):
                return f'assets/projetos/{slug}/{name}{e}'
        return None
    p['video'] = meta.get('video') or find('apresentacao', VIDEO_EXT)
    p['poster'] = meta.get('poster') or find('poster', POSTER_EXT)
    p['youtube'] = meta.get('youtube') or None
    p['pending'] = PENDING in raw
    p['source'] = os.path.relpath(path, ROOT).replace('\\', '/')
    return p


def load_projects():
    files = sorted(f for f in os.listdir(CONTENT) if f.endswith('.md'))
    projects = sorted((parse(os.path.join(CONTENT, f)) for f in files), key=lambda p: p['ordem'])
    for i, p in enumerate(projects):
        p['num'] = f'{i + 1:02d}'
        p['cap'] = f"{p['num']} — {p['categoria']}"
    return projects
