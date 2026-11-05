// Costruisce i file pubblicati (cartella src/build) e calcola le impronte SHA-256.
// La funzione build() è pura: la stessa logica si può eseguire anche nel browser.
export async function build(src, repoUrl) {
  const enc = new TextEncoder();
  const hex = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const sri = async (s) => {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
    let bin = ''; for (const b of d) bin += String.fromCharCode(b);
    return 'sha256-' + btoa(bin);
  };
  const out = {};
  out['style.css'] = src['style.css'];
  out['client.js.txt'] = src['client.js.txt'];
  const sriCss = await sri(out['style.css']);
  const sriJs = await sri(out['client.js.txt']);
  out['index.html'] = src['index.html'].replace('__SRI_CSS__', sriCss).replace('__SRI_JS__', sriJs);

  out['offline.html'] = out['index.html']
    .replace('<link rel="stylesheet" href="/style.css" integrity="' + sriCss + '">', '<style>\n' + out['style.css'] + '</style>')
    .replace('<script src="/app.js" integrity="' + sriJs + '" defer></script>', '<script>window.MSM_OFFLINE = true;</script>\n<script>\n' + out['client.js.txt'] + '</script>')
    .split('href="/').join('href="https://marzadurisecure.com/');

  out['security.txt'] = [
    'Contact: mailto:security@marzadurisecure.com',
    'Expires: 2027-11-05T00:00:00.000Z',
    'Preferred-Languages: it, en',
    'Canonical: https://marzadurisecure.com/.well-known/security.txt',
    'Policy: https://marzadurisecure.com/verifica/#segnala',
    '',
  ].join('\n');

  const ufficiali = [
    { nome: 'Pagina principale', percorso: '/', sha256: await hex(out['index.html']) },
    { nome: 'Programma (app.js)', percorso: '/app.js', sha256: await hex(out['client.js.txt']) },
    { nome: 'Grafica (style.css)', percorso: '/style.css', sha256: await hex(out['style.css']) },
    { nome: 'Versione offline', percorso: '/marzaduri-secure-offline.html', sha256: await hex(out['offline.html']) },
  ];
  out['verifica.js.txt'] = src['verifica.js.txt'].replace('__REPO_URL__', repoUrl || '').replace('__HASHES__', JSON.stringify(ufficiali, null, 2));
  out['note-legali.html'] = src['note-legali.html'].replace('__SRI_CSS__', sriCss);
  out['verifica.html'] = src['verifica.html'].replace('__SRI_CSS__', sriCss).replace('__SRI_VJS__', await sri(out['verifica.js.txt']));

  const tutte = {};
  for (const k of Object.keys(out)) tutte[k] = await hex(out[k]);
  return { out, ufficiali, tutte };
}

// Uso da riga di comando: node build.mjs [url-archivio-pubblico]
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  const fs = await import('node:fs');
  const dir = new URL('./src/', import.meta.url);
  const names = ['index.html', 'style.css', 'client.js.txt', 'verifica.html', 'verifica.js.txt', 'note-legali.html'];
  const src = Object.fromEntries(names.map((n) => [n, fs.readFileSync(new URL(n, dir), 'utf8')]));
  const { out, tutte } = await build(src, process.argv[2] || '');
  fs.mkdirSync(new URL('./build/', dir), { recursive: true });
  for (const [k, v] of Object.entries(out)) fs.writeFileSync(new URL('./build/' + k, dir), v);
  const righe = Object.entries(tutte).map(([k, h]) => `| ${k} | \`${h}\` |`).join('\n');
  fs.writeFileSync(new URL('../IMPRONTE.md', dir), `# Impronte SHA-256 dei file pubblicati\n\n| File | SHA-256 |\n|---|---|\n${righe}\n`);
  console.log(JSON.stringify(tutte, null, 2));
}
