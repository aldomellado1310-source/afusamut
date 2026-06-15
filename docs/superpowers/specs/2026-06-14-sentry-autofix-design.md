# Sentry Autofix — Diseño

**Fecha:** 2026-06-14
**Proyecto:** AFUSAMUT (vanilla JS + Firebase)
**Estado:** Aprobado por usuario

---

## Objetivo

Cuando Sentry detecta un error nuevo o escalando en producción, Claude Code analiza el código fuente y abre un PR con el fix propuesto. El PR siempre requiere revisión humana antes del merge.

---

## Arquitectura

```
[GitHub Actions cron — cada 30 min]
         ↓
scripts/sentry-check.mjs
  1. Consulta Sentry API → issues nuevos (lastSeen < 24h) o escalando (count ≥ 5)
  2. Para cada issue: busca si ya existe PR abierto con "[SENTRY-{id}]" en el título
  3. Si no existe PR → construye prompt y lanza Claude Code
         ↓
claude --print --dangerously-skip-permissions -p "{prompt}"
  1. Lee archivo afectado
  2. Identifica causa raíz
  3. Aplica fix mínimo
  4. git checkout -b claude/fix-SENTRY-{id}
  5. git commit + gh pr create
```

---

## Archivos

| Archivo | Rol |
|---|---|
| `.github/workflows/sentry-autofix.yml` | Workflow cron, instala deps y corre el script |
| `scripts/sentry-check.mjs` | Polling Sentry API, dedup, construcción del prompt, invocación de Claude |

---

## Criterios de activación

Un issue de Sentry se procesa si cumple **alguna** de estas condiciones:

- **Nuevo:** `firstSeen` en las últimas 24 horas
- **Escalando:** `count >= 5` y `status == "unresolved"`

Y además:
- No existe un PR abierto cuyo título contenga `[SENTRY-{issueId}]`
- El issue es de `environment: production`

---

## Deduplicación

Antes de invocar Claude, el script ejecuta:

```bash
gh pr list --state open --search "[SENTRY-{issueId}]" --json number
```

Si retorna resultados → skip. Sin cambios de estado en Sentry (no se asigna ni resuelve el issue).

---

## Prompt a Claude

```
Eres un agente de fix automático del portal AFUSAMUT (vanilla JS + Firebase Hosting).

Error detectado en Sentry (producción):
- ID: {issueId}
- Título: {title}
- Archivo: {filename} línea {lineNo}
- Ocurrencias: {count} | Primera vez: {firstSeen}
- Stack trace:
{stackTrace}

Instrucciones:
1. Lee el archivo afectado (public/js/ o firestore.rules o storage.rules)
2. Identifica la causa raíz del error
3. Aplica el fix mínimo necesario — no refactorices ni amplíes scope
4. Crea el branch: claude/fix-SENTRY-{issueId}
5. Haz commit con mensaje: "fix: {descripción corta} [SENTRY-{issueId}]"
6. Abre un PR con título: "[SENTRY-{issueId}] fix: {descripción}"
   Body del PR debe incluir:
   - Causa raíz identificada
   - Cambio aplicado
   - Link: https://afusamut.sentry.io/issues/{issueId}/
```

---

## Configuración Sentry API

- **Org slug:** se obtiene desde Sentry → Settings → Organization → slug (ej: `afusamut`)
- **Project slug:** nombre del proyecto en Sentry (ej: `afusamut-portal`)
- **Endpoint:** `GET https://sentry.io/api/0/projects/{org_slug}/{project_slug}/issues/`
- Ambos slugs se pasan como variables de entorno `SENTRY_ORG` y `SENTRY_PROJECT` en el workflow

---

## Secrets requeridos

| Secret | Dónde configurar | Permisos mínimos |
|---|---|---|
| `SENTRY_TOKEN` | GitHub → Settings → Secrets | Sentry: `project:read`, `event:read` |
| `ANTHROPIC_API_KEY` | GitHub → Settings → Secrets | Claude API |
| `GITHUB_TOKEN` | Automático en GH Actions | `contents: write`, `pull-requests: write` |

---

## Workflow — sentry-autofix.yml

```yaml
name: Sentry Autofix

on:
  schedule:
    - cron: '*/30 * * * *'   # cada 30 minutos
  workflow_dispatch:           # disparo manual para pruebas

permissions:
  contents: write
  pull-requests: write

jobs:
  autofix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020  # v4
        with:
          node-version: '20'
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Run Sentry check
        env:
          SENTRY_TOKEN: ${{ secrets.SENTRY_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/sentry-check.mjs
```

---

## Manejo de errores

- Si Claude no puede identificar el fix → abre PR con descripción del problema pero sin cambios de código, solo como alerta
- Si Sentry API falla → el workflow falla silenciosamente (no crea PR)
- Máximo 3 issues procesados por ejecución para evitar flood de PRs

---

## Fuera de scope

- Auto-merge de ningún PR
- Notificaciones adicionales (Slack, email)
- Procesamiento de issues de `environment: development`
- Soporte para src/ TypeScript/React (solo public/js/, reglas Firebase)
