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
```
