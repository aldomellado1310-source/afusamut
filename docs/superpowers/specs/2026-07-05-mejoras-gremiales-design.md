# Mejoras solicitadas por AFUSAMUT — Diseño

**Fecha:** 2026-07-05
**Origen:** Feedback directo del directorio de AFUSAMUT (7 solicitudes).
**Alcance:** App vigente en `public/` (vanilla JS + Firebase). Sin cambios en `src/` (prototipo descartado).

---

## 1. Renuncias de socios con reincorporación

**Solicitud:** lista de renuncias/egresos con fecha, estadística aparte, y reincorporación con un click.

**Diseño:**
- Nuevos campos en `users/{uid}`: `estadoSocio` (`'activo' | 'renunciado'`), `fechaRenuncia` (YYYY-MM-DD), `motivoRenuncia` (texto opcional), `fechaReincorporacion`.
- Al registrar una renuncia también se pone `activo: false` (el renunciado no puede entrar al portal). Al reincorporar: `activo: true`, `estadoSocio: 'activo'`, `fechaReincorporacion: hoy`.
- **Security Rules:** el directorio hoy no puede tocar `activo` (prerrogativa del superadmin). Se agrega una regla acotada: el directorio puede actualizar **solo** el conjunto `{estadoSocio, fechaRenuncia, motivoRenuncia, fechaReincorporacion, activo}` y únicamente cuando `activo` es coherente con `estadoSocio` (`renunciado → false`, `activo → true`). Activar/desactivar arbitrario sigue siendo exclusivo del superadmin.
- **UI (tab Padrón, solo directorio):**
  - Botón "Renuncia" en la fila de cada socio activo (con modal: fecha + motivo).
  - Panel "Renuncias y egresos" bajo la tabla principal: tabla de renunciados (nombre, RUT, fecha renuncia, motivo) con botón "↺ Reincorporar" (un click + confirmación).
  - KPI simple: total de renuncias y renuncias del año en curso.
  - Los renunciados salen de la tabla principal del padrón (y ya quedan fuera de la vista socio y del control de poderes porque `activo=false`).
- Auditoría: acciones `RENUNCIA_SOCIO` y `REINCORPORAR_SOCIO`.

## 2. Historial de pagos de cuotas por socio

**Solicitud:** ver por socio qué meses pagó y cuánto (ej: "Daniel pagó de enero a julio 2026, $X").

**Diseño:**
- Nueva colección `pagosCuotas/{uid}_{YYYY-MM}`: `{ uid, nombre, mes: 'YYYY-MM', monto, registradoPor, creadoEn }`. ID determinístico = sin duplicados por mes.
- **Rules:** lectura para directorio o el propio socio (`resource.data.uid == request.auth.uid`); creación/eliminación solo directorio.
- **UI directorio (tab Padrón):** botón "💳 Pagos" por socio → modal con selector de año y grilla de 12 meses; click en un mes lo marca pagado (monto = cuota vigente por estamento, editable) o lo desmarca. Total pagado del año visible en el modal.
- **UI socio (Inicio → Mi Ficha):** línea "Pagos {año}: N meses · $total".
- No se duplica al libro de caja (los ingresos por cuotas se siguen registrando en Finanzas de forma agregada, como hoy).
- Auditoría: `REGISTRAR_PAGO_CUOTA` / `ELIMINAR_PAGO_CUOTA`.

## 3. Más detalle de ingresos en Finanzas

**Solicitud:** distinguir ingresos por beneficios, donaciones, eventos, etc.

**Diseño:**
- El select de categoría depende del tipo: **ingresos** → Cuotas sociales, Donaciones, Beneficios y convenios, Eventos y actividades, Rifas y ventas, Aporte extraordinario, Otros ingresos; **egresos** → las categorías actuales.
- Panel "Ingresos por categoría" en Finanzas: desglose con totales por categoría (barras simples), calculado desde `cacheMovimientos`.
- Sin migración: los movimientos antiguos conservan su categoría.

## 4. Ver el poder simple firmado desde el padrón

**Solicitud:** click en el padrón abre el documento firmado individual (hoy solo se ve en la lista del tab Poder Simple).

**Diseño:** en la tabla del padrón (vista directorio) se agrega columna "Poder": chip "✓ Ver" que abre el respaldo (firma digital o foto del documento) en el lightbox existente, o "—" si está pendiente. Requiere cargar `poderes` vigentes en `fetchPadron()` (solo directorio).

## 5. Imagen adjunta en mensajes del directorio

**Solicitud:** anexar una imagen a los mensajes internos (informativos institucionales) y que se vea atractiva.

**Diseño:**
- Composición (tab Buzón, directorio): zona de adjunto tipo `boleta-drop` (patrón existente) con preview. La imagen se sube una sola vez a Storage `mensajes/` (máx 1200px) y la URL se guarda como `imagenUrl` en cada doc de `mensajesDirectorio` (broadcast comparte URL).
- Bandeja del socio: la imagen se muestra dentro de la tarjeta del mensaje (ancho completo, bordes redondeados) y al click se abre en el lightbox.
- **storage.rules:** nueva ruta `mensajes/{filename}`: escribe directorio/superadmin, lee cualquier usuario autenticado.

## 6. Renombrar "Notificaciones" → "Diario Mural"

Solo textos visibles: pestaña (`📌 Diario Mural`), título/subtítulo de la sección, panel de inicio ("Diario Mural"), título de impresión y estados vacíos. Los IDs internos (`tab-notificaciones`, colección `notificaciones`) no cambian.

## 7. Estadística de accesos a la plataforma

**Solicitud:** saber quién y cuántas veces entra cada funcionario, visible en el padrón u otro lugar.

**Diseño:**
- `users/{uid}.loginCount` se incrementa en `watchAuth` **una vez por sesión de navegador** (flag en `sessionStorage`) junto al `ultimoLogin` que ya existe.
- **Rules:** se agrega `loginCount` a las claves que el propio socio puede actualizar.
- **UI directorio:** columna "Accesos" en el padrón (`N ingresos` + fecha del último), y KPI en Inicio: "Socios activos en la plataforma (últimos 30 días)".
- Sin historial detallado por evento (bastaría contador + último acceso; un log por ingreso inflaría Firestore sin necesidad actual).

---

## Verificación

- `node --check` no aplica (ES modules en browser); se valida sintaxis con `node --input-type=module` parse o revisión + servidor local `npx http-server public`.
- Prueba funcional completa requiere sesión Google real contra Firebase en vivo; se deja verificación manual al usuario + revisión de código.
- Despliegue (`firebase deploy --only hosting,firestore:rules,storage`) queda a decisión del usuario; no se despliega automáticamente.
