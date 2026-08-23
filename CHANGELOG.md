# Changelog — AFUSAMUT Portal Gremial

## [2026-08-23] — Permisos por cargo y respaldos en PDF

### Control de permisos por cargo
- Nueva pestaña **🔐 Permisos**: matriz editable de 16 atribuciones × cargo, ficha de
  derechos efectivos por directivo, auditoría de gobernanza y bitácora de cambios.
- El rol deja de conceder acceso total: la Tesorería es la única con finanzas, cuotas,
  padrón y subida de respaldos; la Presidencia visualiza todo; Presidencia, Tesorería y
  Secretaría publican en el Diario Mural.
- Aplicado en el **servidor**, no solo en pantalla: `firestore.rules` lee la matriz de
  `config/permisos` y `storage.rules` la recibe como custom claim (`perm`), sincronizado
  por la Cloud Function `syncPermisosClaims` o por `scripts/sync-role-claims.mjs`.
- `cargo` y `cargoKey` pasan a ser intocables para el Directorio: solo el superadmin los
  cambia (sin esto, un directivo podía auto-asignarse el cargo de Tesorero).
- Interruptor `config/permisos.activo`: mientras esté apagado rige el comportamiento
  histórico, de modo que la migración no deja al gremio sin poder operar.
- Cobertura: `npm run test:rules` (38 comprobaciones contra los emuladores) y
  `npm run check:permisos` (coherencia de las 6 capas que consumen el catálogo).

### Respaldos en PDF
- Boletas y actas admiten PDF además de imagen.
- Compresor de PDF propio, sin dependencias (`public/js/pdf-compress.js`): reencoda las
  imágenes JPEG incrustadas y compacta el documento. Ante cualquier duda devuelve el
  archivo original intacto.
- Cobertura: `npm run test:pdf` (52 comprobaciones sobre tabla xref clásica, flujo XRef y
  flujos de objetos comprimidos), validado además contra PDFs reales con pymupdf, pypdf y
  poppler.

### Refactor
- `public/js/ui.js`: los helpers de interfaz (esc/fmt, toasts, modales) salen de
  `portal.js` para que el panel de permisos los reutilice.

## [2026-06-06] — Inicio del proyecto

- Creación de la estructura del proyecto (Vite + React + TypeScript + Firebase)
- Artefacto inicial de referencia guardado en `docs/_drafts/`
- Módulos identificados: Padrón, Finanzas, Votaciones, Estatutos, Beneficios, Buzón
