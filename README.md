# Marzaduri Secure Messages

Codice sorgente del servizio **https://marzadurisecure.com**: messaggi riservati cifrati nel browser con AES-256-GCM, che si autodistruggono alla prima lettura.

Il codice è pubblicato **per permettere a chiunque di verificare** che il gestore del servizio non può leggere i messaggi. Non serve fidarsi di nessuno: ogni affermazione è dimostrabile con i metodi descritti nella pagina https://marzadurisecure.com/verifica/

## Contenuto

| Cartella | Contenuto |
|---|---|
| `codice/` | codice sorgente completo (versione 1.0 del 05/11/2026), compresi i file effettivamente pubblicati sul sito (`codice/src/build/`) |
| `attestazione/` | dichiarazione di titolarità con le impronte SHA-256 di tutti i file, l'archivio originale del codice, le firme digitali (`.p7m`) e le marche temporali qualificate (`.tsd`) |

## Come verificare

1. **Il sito usa questo codice.** Le impronte SHA-256 dei file serviti dal sito sono in `codice/IMPRONTE.md`. La pagina https://marzadurisecure.com/verifica/ le ricalcola dal vivo nel tuo browser. Puoi farlo anche da riga di comando:
   `curl -s https://marzadurisecure.com/app.js | sha256sum` e confrontare con `client.js.txt` in `codice/IMPRONTE.md`.
2. **Il codice non è stato modificato dopo la data dichiarata.** Il file `attestazione/MARZADURI-SECURE-MESSAGES_impronte-e-titolarita_v1.0.txt` elenca l'impronta di ogni file e dell'archivio `attestazione/marzadurisecure-codice-sorgente-v1.0-2026-11-05.zip`. Il file `.tsd` è la sua **marca temporale qualificata eIDAS** (ArubaPEC, 05/11/2026). Si verifica con qualsiasi software di verifica di firme e marche, per esempio lo strumento ufficiale della Commissione europea (DSS): https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/validation
3. **Ricostruzione dei file pubblicati.** Da `codice/`: `node build.mjs` rigenera `src/build/` con impronte identiche a quelle dichiarate.

La dichiarazione e l'archivio del codice sono anche **firmati digitalmente** dal titolare con certificato qualificato eIDAS (file `.p7m` in `attestazione/`), e l'archivio firmato è munito a sua volta di marca temporale qualificata (`.zip.p7m.tsd`). Firme e marche si verificano con lo stesso strumento DSS indicato sopra o con qualsiasi software di verifica di firma digitale (es. ArubaSign, Dike, GoSign).

## Punti chiave del codice

- `codice/src/client.js.txt`: cifratura e decifratura nel browser (Web Crypto API: AES-256-GCM, HKDF-SHA-256, PBKDF2-HMAC-SHA-256 a 600.000 iterazioni). La chiave è generata nel browser e inserita solo nella parte del link dopo `#`, che i browser non inviano al server (RFC 3986, §3.5).
- `codice/src/worker.js`: il server. Riceve e conserva solo dati cifrati e li cancella alla prima lettura con un'unica istruzione `DELETE … RETURNING`. Non contiene alcuna registrazione di indirizzi IP o di accessi.
- `codice/schema.sql`: la struttura del database. Non ci sono campi per nomi, e-mail, IP o testo in chiaro.

## Segnalazioni di sicurezza

security@marzadurisecure.com — vedi anche https://marzadurisecure.com/.well-known/security.txt

## Diritti

© 2026 Marco Roberto Maria Marzaduri. Tutti i diritti riservati. Il codice è pubblicato a scopo di trasparenza e verifica.
