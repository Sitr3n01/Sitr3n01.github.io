"""Textos da interface e da home, lado a lado: (português, inglês).

O português fica na raiz do site e o inglês em en/ (ver build_page.py). Os textos dos projetos ficam nos .md de
src/content/projetos/ (o inglês em src/content/projetos/en/). Tom nos dois idiomas: formal e fácil de entender, em
primeira pessoa, sem gíria nem "você" (guia completo em docs/PLANO-INGLES.md).
Listas de linhas viram <br> na marcação; o resto é texto puro (escapado no build).
"""

LANGS = ('pt', 'en')
SITE = 'https://sitr3n01.github.io/'

# id de cada seção por data-sk-view: as âncoras também são traduzidas (/en/#about-me). O controlador e o CSS
# identificam as seções pelo data-sk-view, nunca pelo id.
IDS = {
    'hero': ('inicio', 'home'),
    'manifesto': ('manifesto', 'manifesto'),
    'about': ('sobre', 'overview'),
    'work': ('projetos', 'projects'),
    'stack': ('stack', 'stack'),
    'areas': ('areas', 'areas'),
    'path': ('trajetoria', 'experience'),
    'me': ('sobre-mim', 'about-me'),
    'contact': ('contato', 'contact'),
    'proj': ('inicio', 'top'),
    'projbody': ('detalhes', 'details'),
    'projnext': ('proximo', 'next'),
}

T = {
    'html_lang': ('pt-BR', 'en'),
    'lang_name': ('Português', 'English'),
    'lang_short': ('PT', 'EN'),
    'lang_label': ('Idioma', 'Language'),
    'proj_dir': ('projetos', 'projects'),
    'title': ('Sitr3n — portfólio', 'Sitr3n — portfolio'),
    'desc': ('Portfólio de José Gilberto (Sitr3n), desenvolvedor full-stack em Brasília: web, desktop, IA local e jogos.',
             'Portfolio of José Gilberto (Sitr3n), a full-stack developer based in Brasília, Brazil: web, desktop, '
             'local AI, and games.'),

    # navegação
    'nav_aria': ('Seções', 'Sections'),
    'contact_btn': ('Contato +', 'Contact +'),
    'menu': ('Menu', 'Menu'),
    'theme_dark': ('Tema escuro', 'Dark theme'),
    'menu_aria': ('Menu de navegação', 'Navigation menu'),
    'menu_close': ('Fechar menu', 'Close menu'),
    'menu_links_aria': ('Seções e contato', 'Sections and contact'),
    'wa_menu_aria': ('WhatsApp (abre em nova aba)', 'WhatsApp (opens in a new tab)'),
    'hint_aria': ('Ir para a próxima seção', 'Go to the next section'),
    'wa_aria': ('Fale comigo no WhatsApp: orçamentos e contratações (abre em nova aba)',
                'Contact me on WhatsApp for quotes and hiring (opens in a new tab)'),
    'wa_text': ('Olá! Conheci seu portfólio e gostaria de conversar sobre um projeto.',
                'Hello! I came across your portfolio and would like to discuss a project.'),

    # home
    'hero': (['PENSO COMO ARTISTA.', 'CONSTRUO COMO ENGENHEIRO.'], ['I THINK LIKE AN ARTIST.', 'I BUILD LIKE AN ENGINEER.']),
    'hero_aria': ('Penso como artista. Construo como engenheiro.', 'I think like an artist. I build like an engineer.'),
    'manifesto': ('Do sistema invisível à interface que encanta. Engenharia, design e movimento em cada detalhe.',
                  'From the invisible system to the interface that delights. Engineering, design, and motion in every detail.'),
    'about_intro': ('Desenvolvedor full-stack e formado em Jogos Digitais no IESB, em Brasília.',
                    'Full-stack developer with a degree in Digital Games from IESB, in Brasília, Brazil.'),
    'about_text': ('Da lógica que sustenta um sistema à interface que o torna intuitivo, desenvolvo produtos digitais com '
                   'atenção à técnica e à experiência. Atuo com web, desktop e jogos e, durante seis meses no Brasília Game '
                   'Hub, participei dos projetos Loopia e ExoBeast. A fotografia amplia minha perspectiva sobre estética, '
                   'composição e comunicação visual.',
                   'From the logic that supports a system to the interface that makes it intuitive, I develop digital '
                   'products with attention to both engineering and user experience. I work across web, desktop, and games, '
                   'and during six months at Brasília Game Hub I took part in the Loopia and ExoBeast projects. Photography '
                   'broadens my perspective on aesthetics, composition, and visual communication.'),
    'stack_title': (['Stack', 'de trabalho'], ['Tech', 'stack']),
    'work_title': ('Projetos em destaque', 'Featured projects'),
    'work_all': ('Todos no GitHub +', 'All on GitHub +'),
    'card_open': ('Ver projeto', 'View project'),
    'areas_aria': ('Áreas de trabalho', 'Areas of work'),
    'areas_title': (['Frentes de', 'trabalho.'], ['Areas of', 'work.']),
    'path_title': (['Trajetória', '+ formação'], ['Experience', '+ education']),
    'me_title': ('Sobre mim', 'About me'),
    'me_lead': ('Minha trajetória é guiada por uma pergunta constante: até onde posso levar uma ideia?',
                'My path is guided by one constant question: how far can I take an idea?'),
    'me_text': (['Exploro diferentes áreas do desenvolvimento, de aplicações web e ferramentas desktop à inteligência '
                 'artificial local, sistemas interativos e jogos digitais. Gosto de compreender a tecnologia além da '
                 'superfície, investigando sua arquitetura, seus limites e suas possibilidades.',
                 'Entre código, design e experimentação, busco construir soluções eficientes, criativas e cuidadosamente '
                 'desenvolvidas.'],
                ['I explore different areas of software development, from web applications and desktop tools to local '
                 'artificial intelligence, interactive systems, and digital games. I like to understand technology beyond '
                 'the surface, investigating its architecture, its limits, and its possibilities.',
                 'Between code, design, and experimentation, I seek to build solutions that are efficient, creative, and '
                 'carefully crafted.']),
    'me_alt': ('José Gilberto em um mirante de vidro, com a cidade ao fundo',
               'José Gilberto on a glass viewing platform, with the city in the background'),
    'contact_title': (['Vamos', 'conversar.'], ["Let's", 'talk.']),
    'email': ('E-mail', 'Email'),

    # páginas de projeto
    'back': ('← Todos os projetos', '← All projects'),
    'watch': ('▶ Assistir apresentação', '▶ Watch the presentation'),
    'video_aria': ('Vídeo de apresentação: {}', 'Presentation video: {}'),
    'video_caption': ('Apresentação — {}', 'Presentation — {}'),
    'video_pt_note': ('', ' · Captions in Portuguese'),
    'video_empty': ('Vídeo de apresentação em produção', 'Presentation video in production'),
    'fact_role': ('Papel', 'Role'),
    'fact_period': ('Período', 'Timeline'),
    'fact_status': ('Status', 'Status'),
    'fact_stack': ('Stack', 'Stack'),
    'repo': ('Repositório', 'Repository'),
    'site': ('Site', 'Website'),
    'next': ('Próximo projeto · ', 'Next project · '),
    'talk': ('Vamos conversar ↗', "Let's talk ↗"),
}

# menu: (data-sk-view, rótulo, ícone). A nav do desktop usa todos menos o contato, que vira o botão "Contato +".
# "Sobre" (visão geral) e "Sobre mim" viram Overview e About me: "About" e "About me" lado a lado confundem.
MENU = (
    ('hero', ('Início', 'Home'), 'm2 8 6-5 6 5v6H2zM7 14v-4h2v4'),
    ('about', ('Sobre', 'Overview'), 'M10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0ZM3 14v-1a5 3.5 0 0 1 10 0v1'),
    ('work', ('Projetos', 'Projects'), 'M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z'),
    ('path', ('Trajetória', 'Experience'), 'M4 5.5v5m0-8A1.5 1.5 0 1 0 4 5.5a1.5 1.5 0 0 0 0-3ZM4 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8 4h5m-5 8h5'),
    ('me', ('Sobre mim', 'About me'), 'M2 3.5h12v9H2zM5.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3.5 10.5a2 1.5 0 0 1 4 0M9.5 6h3M9.5 8.5h3'),
    ('contact', ('Contato', 'Contact'), 'M2 4h12v8H2zm0 0 6 4 6-4'),
)

# cada item precisa aparecer em algum projeto do site; 10 itens = 2 linhas de 5 (ou 5 de 2), ver .sk-stack
STACK = [('Python', ('Back-end', 'Back end')), ('Django + Wagtail', ('Web e CMS', 'Web and CMS')),
         ('PostgreSQL', ('Dados', 'Data')), ('Go', ('Servidores', 'Servers')),
         ('llama.cpp + MCP', ('IA local', 'Local AI')), ('C#', ('Jogos e desktop', 'Games and desktop')),
         ('Unity 6', ('Jogos', 'Games')), ('Netcode + EOS', ('Multiplayer', 'Multiplayer')),
         ('three.js + GSAP', ('Movimento', 'Motion')), ('Docker + CI', ('Infra', 'Infrastructure'))]

# termos que aparecem nos projetos do site (web, IA local, XGB, jogos) + fotografia; a órbita espalha pelo
# índice (ângulo áureo), então grupos vizinhos na lista não ficam juntos na tela. Quase todos são nomes técnicos,
# iguais nos dois idiomas; um par (português, inglês) só onde muda.
CHIPS = ['Django 5.2', 'Go', 'Unity 6', 'WPF', 'f/2.8',
         'Wagtail 7.4', 'llama.cpp', 'C#', 'DualSense', '1/250 s',
         'SELECT *', 'MCP', 'NetworkObject', 'steam://', 'ISO 400',
         'PostgreSQL', ('LLM local', 'local LLM'), 'EOS', 'HTMX', '35 mm',
         'Django ORM', '127.0.0.1', 'FMOD', 'three.js', 'GSAP',
         'docker compose up', '/v1/messages', 'NavMesh', 'CodeQL']

# rótulos da órbita: (linhas, posição)
AREA_LABELS = [((['Full-', 'stack'], ['Full-', 'stack']), 'left: 18%; top: 24%'),
               ((['Jogos', 'Unity'], ['Unity', 'games']), 'left: 72%; top: 20%'),
               ((['IA', 'local'], ['Local', 'AI']), 'left: 76%; top: 66%'),
               ((['Foto-', 'grafia'], ['Photo-', 'graphy']), 'left: 26%; top: 70%')]

# "Tecnólogo" é um diploma de graduação brasileiro sem equivalente direto; "Technology degree" evita sugerir
# um bacharelado
PATH_ROWS = [
    ('01', ('Brasília Game Hub', 'Brasília Game Hub'), (['6 meses', 'Loopia', 'ExoBeast'], ['6 months', 'Loopia', 'ExoBeast'])),
    ('02', ('IESB', 'IESB'), (['Tecnólogo em Jogos Digitais', 'Concluído em 2026'],
                              ['Technology degree in Digital Games', 'Completed in 2026'])),
    ('03', ('Game jams', 'Game jams'), (['2 participações'], ['Participated in 2'])),
    ('04', ('Komuniki e Blog da Kelly', 'Komuniki and Blog da Kelly'),
     (['Dois sites para um cliente real', 'Em produção desde jun. 2026'],
      ['Two websites for a real client', 'In production since Jun 2026'])),
]

ME_NAME = ('José Gilberto', 'Farias Souza')
ME_FACTS = [(('Cidade', 'City'), (['Brasília'], ['Brasília, Brazil'])),
            (('Línguas', 'Languages'), (['Português · fluente', 'Inglês · intermediário'],
                                        ['Portuguese · native', 'English · intermediate']))]
