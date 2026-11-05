@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Ripubblicazione di marzadurisecure.com su Cloudflare...
echo.
where npx >nul 2>nul
if errorlevel 1 (
  echo  Node.js non e' installato. Scaricalo da https://nodejs.org ^(versione LTS^) e riprova.
  pause
  exit /b 1
)
call node build.mjs
if errorlevel 1 (
  echo  Costruzione dei file NON riuscita.
  pause
  exit /b 1
)
call npx --yes wrangler@4 deploy
echo.
if errorlevel 1 (
  echo  Pubblicazione NON riuscita: leggi il messaggio qui sopra.
) else (
  echo  Fatto. Il sito aggiornato e' online su https://marzadurisecure.com
)
pause
