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
npm run dist       # arma dist/ (después de build)
npm run backup     # snapshot manual de inicio (ver Backups)
npm run launch     # launcher en modo desarrollo (usa dist/)
```

## Backups y restauración

- La base real vive en `data/app.db` (ignorada por Git). Nunca la copies a
  mano mientras el servidor está activo.
- `npm run backup` (o `npm run backup -- --kind=shutdown`) genera
  `backups/reservas-AAAA-MM-DD-start.db` (o `-shutdown.db`): copia consistente
  vía Online Backup API, validada con `PRAGMA integrity_check` y publicada por
  rename atómico. Como máximo hay un snapshot de cada tipo por día y se
  conservan los últimos 30 días.
- Si un backup falla, los válidos no se tocan. Sin ningún backup válido el
  arranque se detiene; con backups previos continúa con aviso visible.
- Restaurar (siempre con el servidor detenido):
  1. Resguardá la base actual: renombrá `data/app.db` a
     `data/app.db.recuperada`.
  2. Copiá el snapshot elegido a `data/app.db`.
  3. Iniciá con `npm run dev` y verificá el healthcheck y los conteos.
- Copiá cada tanto la carpeta `backups/` a un medio externo o nube **con el
  servidor detenido**: los backups en el mismo disco no cubren rotura o robo
  del equipo.

## Instalación y uso en la PC final (Windows 11)

Decisión de distribución v1: instalar Node.js LTS 24 una vez con el
instalador oficial (que deja `node` en el PATH). No se empaqueta runtime
portable salvo que esa instalación resulte frágil; no se usa Electron.

1. En la PC de desarrollo: `npm ci`, `npm run build`, `npm run dist`.
2. Copiá la carpeta `dist/` a una ruta sin permisos de administrador, por
   ejemplo `C:\ReservasCasa`. Esa carpeta ya incluye servidor, Prisma,
   migraciones y launcher; `data/` y `backups/` se crean al lado, nunca
   dentro del código.
3. Instalá Node.js LTS 24 desde https://nodejs.org (opción que agrega Node
   al PATH).
4. Creá un acceso directo manual “Reservas Casa” que apunte a
   `C:\ReservasCasa\launch.cmd`. El inicio automático con Windows queda
   desactivado por defecto (opción posterior).
5. Doble clic al acceso directo: espera el healthcheck, guarda el snapshot
   de inicio, aplica migraciones pendientes y abre el navegador en
   `http://127.0.0.1:3000` (solo local: no aparece alerta de firewall).
6. Uso diario: la ventana de consola dice “No cerrar esta ventana mientras
   usa la aplicación”; se puede minimizar. **Cerrar la pestaña del navegador
   no detiene ni apaga nada**: el servidor sigue corriendo.
7. Cierre correcto: Ctrl+C en la consola (o el acceso “Detener Reservas
   Casa” si se crea) guarda el snapshot de cierre. Cerrar la consola a la
   fuerza equivale a un apagado abrupto: el próximo inicio reutiliza el
   snapshot de inicio y avisa.
8. Si el puerto está ocupado por esta misma app, el acceso directo abre el
   navegador sin duplicar instancias. Si lo ocupa otro programa, el launcher
   lo informa y sale sin tocarlo.
9. Actualización manual: backup previo, detener el servidor, reemplazar la
   carpeta (conservar `data/` y `backups/`), iniciar y verificar healthcheck.

En macOS el flujo equivale con `launch.command` (sirve para pruebas);
el desarrollo diario sigue con `npm run dev`.
