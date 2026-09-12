# Reservas Casa

Aplicación local para gestionar las reservas de una vivienda turística
familiar. Ver `docs/development-plan.md` como fuente de verdad del desarrollo
por fases.

## Requisitos

- Node.js LTS 24 (ver `.nvmrc`) y npm 10 o superior.
  - macOS/Linux con nvm: `nvm use`.
  - Windows: instalador LTS desde https://nodejs.org o `nvm-windows`
    con `nvm use 24`.
- `engines` en `package.json` exige Node >= 20.9 y npm >= 10.

## Comandos

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run backup     # snapshot manual de inicio (ver Backups)
```

## Backups y restauración

- La base real vive en `data/app.db` (ignorada por Git). Nunca la copies a
  mano mientras el servidor está activo.
- `npm run backup` (o `npm run backup -- --kind=shutdown`) genera
  `backups/reservas-AAAA-MM-DD-start.db` (o `-shutdown.db`): copia consistente
  vía Online Backup API, validada con `PRAGMA integrity_check` y publicada por
  rename atómico. Como máximo hay un snapshot de cada tipo por día y se
  conservan los últimos 30 días.
- Si un backup falla, los válidos no se tocan y el arranque continúa con un
  aviso (el launcher de la Fase 13 decide el comportamiento final).
- Restaurar (siempre con el servidor detenido):
  1. Resguardá la base actual: renombrá `data/app.db` a
     `data/app.db.recuperada`.
  2. Copiá el snapshot elegido a `data/app.db`.
  3. Iniciá con `npm run dev` y verificá el healthcheck y los conteos.
- Copiá cada tanto la carpeta `backups/` a un medio externo o nube **con el
  servidor detenido**: los backups en el mismo disco no cubren rotura o robo
  del equipo.
