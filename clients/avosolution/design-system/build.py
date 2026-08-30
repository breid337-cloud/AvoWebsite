import pathlib, sys, re, base64

def s(body, fill=False):
    return ('<svg viewBox="0 0 24 24" width="1em" height="1em" fill="%s" stroke="currentColor" '
            'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
            'style="display:block">%s</svg>') % ('currentColor' if fill else 'none', body)

ICO = {
 'search':   s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
 'calendar': s('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'),
 'sparkle':  s('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
 'exit':     s('<path d="M7 17L17 7"/><path d="M9 7h8v8"/>'),
 'repeat':   s('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>'),
 'phone':    s('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18.5h2"/>'),
 'heart':    s('<path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 1 0-7.1 7.1l8.4 8.4 8.4-8.4a5 5 0 0 0 0-7.1z"/>'),
 'scissors': s('<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M20 4L8.1 15.9"/><path d="M14.5 14.5L20 20"/><path d="M8.1 8.1L12 12"/>'),
 'star':     s('<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/>'),
 'check':    s('<path d="M20 6.5L9.5 17.5 4 12"/>'),
 'clock':    s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>'),
 'zap':      s('<path d="M13.5 2.5L4 14h6.5l-.5 7.5L20 10h-6.5z"/>'),
 'tool':     s('<path d="M14.4 6.6a4.5 4.5 0 0 0 5.9 5.9l-8 8a2.8 2.8 0 0 1-4-4z"/><path d="M14.4 6.6L18 3"/>'),
 'pound':    s('<path d="M6.5 12h7"/><path d="M17.5 20.5H6.5c1.9-1.4 2.6-3 2.6-5.2V9.6A4.6 4.6 0 0 1 13.7 5a4.4 4.4 0 0 1 3.8 2.1"/><path d="M6.5 20.5h11"/>'),
 'trophy':   s('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5V7a3.5 3.5 0 0 0 3 3.4"/><path d="M17 5.5h2.5V7a3.5 3.5 0 0 1-3 3.4"/><path d="M12 14v3.5"/><path d="M8.5 21h7l-1-3.5h-5z"/>'),
 'trend':    s('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
 'user':     s('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
 'users':    s('<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.6 3.6 0 0 1 0 6.8"/><path d="M17.5 14.2A6.5 6.5 0 0 1 21.5 20"/>'),
 'note':     s('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
 'box':      s('<path d="M21 8.2v7.6a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4a2 2 0 0 1-1-1.7V8.2a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4a2 2 0 0 1 1 1.7z"/><path d="M3.4 7.3L12 12l8.6-4.7M12 12v9.5"/>'),
 'chat':     s('<path d="M21 12a8 8 0 0 1-11.6 7.1L3.5 20.5l1.4-5.9A8 8 0 1 1 21 12z"/>'),
 'globe':    s('<circle cx="12" cy="12" r="9"/><path d="M3.2 9.5h17.6M3.2 14.5h17.6"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>'),
 'shield':   s('<path d="M12 2.8l7.5 3v6c0 4.4-3 8.2-7.5 9.4C7.5 20 4.5 16.2 4.5 11.8v-6z"/><path d="M9 12l2.2 2.2L15.2 10"/>'),
 'ai':       s('<rect x="7" y="7" width="10" height="10" rx="2.4"/><path d="M12 2.8v4.2M12 17v4.2M2.8 12h4.2M17 12h4.2M6.5 3.5v3M17.5 3.5v3M6.5 17.5v3M17.5 17.5v3"/>'),
 'card':     s('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h3"/>'),
 'gift':     s('<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M2.5 9h19v4h-19z" fill="none"/><path d="M12 9v12"/><path d="M12 9c-3 0-4.6-.9-4.6-2.7A2.3 2.3 0 0 1 9.7 4c1.7 0 2.3 2.4 2.3 5zM12 9c3 0 4.6-.9 4.6-2.7A2.3 2.3 0 0 0 14.3 4C12.6 4 12 6.4 12 9z"/>'),
 'building': s('<path d="M4 21V5.5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 13 5.5V21"/><path d="M13 10h5.5A1.5 1.5 0 0 1 20 11.5V21"/><path d="M2.5 21h19"/><path d="M7 8h3M7 12h3M7 16h3M16 14h1M16 17.5h1"/>'),
 'target':   s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>'),
 'link':     s('<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.3-1.3"/>'),
 'layers':   s('<path d="M12 2.8L2.8 7.5 12 12.2l9.2-4.7z"/><path d="M2.8 12.5L12 17.2l9.2-4.7"/><path d="M2.8 17L12 21.7l9.2-4.7"/>'),
 'chart':    s('<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12.5" y="8" width="3" height="10"/><rect x="18" y="5" width="3" height="13"/>'),
 'map':      s('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
 'lock':     s('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"/><path d="M8 10.5V7.4a4 4 0 0 1 8 0v3.1"/>'),
 'megaphone':s('<path d="M3.5 10.5v3a2 2 0 0 0 2 2h1.8L18 20.5V3.5L7.3 8.5H5.5a2 2 0 0 0-2 2z"/><path d="M20.5 9.5a3.5 3.5 0 0 1 0 5"/>'),
 'handshake':s('<path d="M11 6.5L8.6 8.9a2 2 0 0 0 2.8 2.8L13 10.1l3.5 3.5"/><path d="M2.5 8.5l4-3.5h4l1.5 1.5"/><path d="M21.5 8.5l-4-3.5h-3.5"/><path d="M2.5 8.5v5l3.5 3.5 2.5-2.5"/><path d="M21.5 8.5v5l-3.5 3.5-4-4"/>'),
 'key':      s('<circle cx="7.5" cy="14.5" r="4"/><path d="M10.5 11.5L20 2"/><path d="M16 6l3 3"/><path d="M13 9l2.5 2.5"/>'),
 'database': s('<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>'),
 'network':  s('<circle cx="12" cy="4.5" r="2.3"/><circle cx="5" cy="19" r="2.3"/><circle cx="19" cy="19" r="2.3"/><path d="M12 6.8v6M12 12.8L6.3 17M12 12.8L17.7 17"/>'),
 'truck':    s('<rect x="2.5" y="8" width="12" height="9" rx="1.2"/><path d="M14.5 11h4l3 3.2V17h-7z"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/>'),
 'route':    s('<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M5 8v4a3 3 0 0 0 3 3h5a3 3 0 0 1 3 3v0"/>'),
 'flag':     s('<path d="M6 3v18"/><path d="M6 4.5h11l-2.5 3.5 2.5 3.5H6"/>'),
 'archive':  s('<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 19.5 19V8.5"/><path d="M10 12.5h4"/>'),
}

def render(src, out_html, out_pdf, workdir=None):
    import os
    if workdir is None:
        workdir = os.path.dirname(os.path.abspath(__file__))
    css = pathlib.Path(workdir + '/shared.css').read_text()
    h = pathlib.Path(src).read_text()
    h = h.replace('{{CSS}}', css)
    for k, v in ICO.items():
        h = h.replace('[[%s]]' % k, v)
    left = re.findall(r'\[\[[a-z]+\]\]', h)
    if left:
        print('UNRESOLVED ICONS:', set(left)); sys.exit(1)
    def d(n):
        return 'data:image/png;base64,' + base64.b64encode(
            pathlib.Path(workdir + '/assets/' + n + '.png').read_bytes()
        ).decode()
    h = h.replace('{{W}}', d('logo_white')).replace('{{G}}', d('logo_grey'))
    pathlib.Path(out_html).write_text(h)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1456, 'height': 819})
        pg.goto('file://' + str(pathlib.Path(out_html).resolve()))
        pg.wait_for_timeout(900)
        pg.pdf(path=out_pdf, width='1456px', height='819px', print_background=True,
               margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        b.close()
    print('built', out_pdf)

if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], sys.argv[3])
