# Changelog — AFUSAMUT Portal Gremial

## [2026-09-23] — Correcciones de permisos (auditoría del portal)

- **Inicio del Directorio**: cada indicador se pide solo si el cargo tiene el permiso que
  exigen las reglas, y uno rechazado ya no bota a los demás. Antes, el Tesorero (sin
  `buzon.ver`) veía el Inicio vacío y el panel de cuotas nunca se cargaba.
- **Padrón**: la pestaña solo aparece con `padron.ver`. Para los socios la consulta siempre
  era rechazada (listar `users` expondría RUT, celular y correo de todos); el calendario
  tampoco la intenta para ellos.
- **Primer login**: el socio puede borrar su propia pre-inscripción una vez creada su ficha.
  Antes quedaba viva y el socio salía duplicado (activo + pendiente). El padrón oculta y
  limpia en segundo plano las pre-inscripciones ya reclamadas.
- **Poder simple**: el titular solo puede anular su poder; ya no puede reactivar uno anulado
  ni cambiar monto, RUT o fecha.
- **Votaciones**: los votos por opción pasan a `votaciones/{id}/escrutinio/conteo`, que los
  socios solo leen al cierre. El voto es una transacción amarrada por las reglas (votante
  nuevo + 1 de participación + 1 en una sola opción) y se confirma antes de emitirse.
  Las votaciones antiguas se migran solas la primera vez que las abre quien las administra.
- **Desactivar cuenta**: la validación interna coincide con la regla (solo superadmin) y los
  errores se informan.
- Cobertura: `npm run test:rules` suma `tests/rules/fallas-portal.test.mjs` (38 comprobaciones).

> Al desplegar: `firebase deploy --only firestore:rules,hosting`, y luego pedir a la
> Presidencia o la Secretaría que abran **Votaciones** una vez para migrar las antiguas.
> Mientras tanto, una votación antigua abierta no recibe votos nuevos.

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
