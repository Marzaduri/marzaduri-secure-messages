# Marzaduri Secure Messages — marzadurisecure.com

Il sito è online su **https://marzadurisecure.com** (anche www).
Cloudflare: account del gruppo Marzaduri, Worker `marzadurisecure`, database D1 `msm`.

## Cosa c'è in questa cartella

| File | A cosa serve |
|---|---|
| `src/` | il sito: pagina (`index.html`), grafica (`style.css`), cifratura nel browser (`client.js.txt`), pagina di verifica (`verifica.html`, `verifica.js.txt`), server (`worker.js`) |
| `build.mjs` | prepara i file pubblicati in `src/build/` (controlli di integrità, versione offline, impronte) |
| `IMPRONTE.md` | impronte SHA-256 ufficiali dei file pubblicati |
| `schema.sql` | struttura del database |
| `wrangler.toml` | configurazione già compilata (nome Worker, database, dominio, pulizia oraria) |
| `RIPUBBLICA.bat` | ripubblica il sito con un doppio clic |

Non è un sito statico come quelli su Netlify: per funzionare ha bisogno anche del database. Per questo non basta trascinare la cartella su Netlify. Le tre strade qui sotto ripubblicano tutto (sito, database e dominio).

## Ripubblicare

### A. Doppio clic (consigliato)
1. Serve Node.js, una volta sola: https://nodejs.org (versione LTS).
2. Doppio clic su **RIPUBBLICA.bat**.
3. La prima volta si apre il browser: accedi a Cloudflare (account Marzaduri) e premi «Allow».
4. Dopo circa 30 secondi il sito aggiornato è online.

### B. Dal pannello Cloudflare
Non più disponibile: il sito ora è composto da più file (pagine di verifica, note legali, versione offline). Usa la strada A.

### C. Su un altro account Cloudflare o un altro dominio
1. Crea un database D1 e, nella sua Console, esegui i due comandi di `schema.sql` uno alla volta.
2. In `wrangler.toml` sostituisci `database_id` e il dominio in `routes`.
3. Lancia RIPUBBLICA.bat.

## Già configurato su Cloudflare (5/11/2026)
- Limite anti-abuso: massimo 5 messaggi creati ogni 10 secondi per indirizzo IP.
- Indirizzo workers.dev disattivato: il sito risponde solo su marzadurisecure.com.
- Email Routing attivo. Le caselle privacy@ e abuse@ inoltreranno a marco@marzaduri.it dopo che avrai confermato la mail di verifica di Cloudflare.

## Verificabilità (pagina /verifica/)
- La pagina **https://marzadurisecure.com/verifica/** spiega come chiunque può verificare, senza fidarsi del gestore, che i messaggi non sono leggibili: prova pratica con gli strumenti del browser, impronte SHA-256 calcolate dal vivo, versione offline scaricabile, limiti e soluzioni, riferimenti agli standard (NIST, RFC, W3C, OWASP).
- Dopo ogni creazione la pagina mostra «Guarda cosa ha ricevuto il server».
- **Versione offline:** `/marzaduri-secure-offline.html` — copia del programma da usare dal proprio computer; il server non può modificarla.
- **security.txt:** `/.well-known/security.txt` (contatto security@marzadurisecure.com).
- Ogni modifica al codice cambia le impronte: dopo `node build.mjs` pubblicare **lo stesso** contenuto anche nell'archivio pubblico (GitHub), altrimenti la pagina di verifica segnalerà la differenza. Per indicare l'indirizzo dell'archivio: `node build.mjs https://github.com/UTENTE/marzaduri-secure-messages`.

## Sicurezza (sintesi)
Il browser cifra il testo con AES-256-GCM e la chiave resta solo nel link, dopo il `#`. Il server conserva dati che non può aprire e li cancella alla prima lettura con un'unica operazione atomica. Le anteprime di WhatsApp e Telegram non consumano il messaggio. Dopo 5 password errate il messaggio viene distrutto. Il sito non usa cookie, statistiche di visita o servizi esterni.
