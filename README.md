# AFUSAMUT — Portal Gremial Digital

Plataforma web oficial de la **Asociación de Funcionarios SAMU Talcahuano (AFUSAMUT)**.
Constituida bajo la **Ley N° 19.296** · Registro DT N° 8805.0052 · Región del Biobío, Chile.

**Producción:** https://afusamuth.web.app

---

## Propósito

AFUSAMUT necesita administrar su vida gremial completa —padrón, finanzas, votaciones,
actas, comunicaciones y convenios— con **transparencia hacia los socios** y **trazabilidad
para la directiva**, sin depender de planillas, papeles ni correo electrónico.

Este portal es esa secretaría digital: **100% in-app** (sin notificaciones por email),
con autenticación Google/Microsoft, datos en Firestore, respaldos fotográficos en
Storage y un registro de auditoría de cada acción administrativa.

---

## Características

### Sitio público (landing)
- Presentación institucional: principios rectores, galería del equipo, directiva 2026–2028 y marco legal.
- Estadísticas en vivo (socios activos, convenios, actas publicadas) leídas de Firestore.
- Efectos de nivel producto: scroll reveals, galería mosaico, Ken Burns, parallax acotado, blur-up de imágenes — con `prefers-reduced-motion` respetado.

### Autenticación y acceso
- **Login con Google y Microsoft** (cuentas personales @gmail, @hotmail, @live, @outlook) vía `signInWithRedirect`. Lo que identifica al socio es su **email**, no el proveedor.
- **Alta por pre-inscripción**: el directorio inscribe al socio en el padrón con su email (`padronPendiente/{email}`); al primer login, el socio "reclama" su ficha automáticamente.
- **Bootstrap de superadmin**: cualquier cuenta `@micorriza.bio` sin ficha se auto-aprovisiona como superadmin (validado en Security Rules).
- Onboarding guiado de 3 pasos en la primera sesión del socio.

### Roles y permisos
| Rol | Acceso |
|---|---|
| **Socio** | Su ficha, transparencia financiera, votar, poder simple, buzón, beneficios |
| **Directorio** | Todo lo anterior + gestión de padrón, finanzas, votaciones, actas, notificaciones, eventos, convenios y mensajería a socios |
| **Superadmin** (`@micorriza.bio`) | Todo + **asignación de roles y cargos**, activar/desactivar cuentas, auditoría, modo "Ver como" |

- **Cambio de rol y activar/desactivar son prerrogativa exclusiva del superadmin** (reforzado en Security Rules: el directorio no puede tocar `rol` ni `activo`).
- **Cargos del directorio**: Presidente, Vicepresidente, Secretario/a, Tesorero/a, Director/a u **otros personalizados**, asignables al promover o después.
- **Pre-asignación de rol**: el superadmin puede promover a Directorio (con cargo) a personas aún "por vincular" — al hacer su primer login entran directo a su perfil correspondiente. El reclamo valida el rol pre-asignado en Security Rules; el directorio no puede pre-asignar.
- **Modo "Ver como"**: el superadmin puede ver el portal como socio o directorio (solo visual; sus permisos reales no cambian).

### Módulos del portal
| Módulo | Descripción |
|---|---|
| 🏠 Inicio | KPIs según rol, ficha personal del socio, configuración de cuotas (directorio) |
| 👥 Padrón | Inscripción con campos personalizados, búsqueda/filtros, estado de cuota, rol y cargo, export CSV, **renuncias/egresos con reincorporación en un click**, **historial de pagos de cuotas por socio** (modal 💳 con grilla mensual por año), **ver el poder simple firmado** por socio, **estadística de accesos** (N° de ingresos + último acceso) |
| 💰 Finanzas | Libro de caja con **respaldo fotográfico de boletas** (Storage), KPIs, export CSV, impresión, **categorías de ingreso detalladas** (cuotas, donaciones, beneficios, eventos, rifas…) con desglose por categoría |
| 🗳️ Votaciones | Sufragio con **un voto por socio** garantizado por transacción atómica e ID compuesto; escrutinio en vivo |
| 📝 Poder Simple | Autorización de descuento por planilla con **firma digital en canvas** o foto del documento; monto auto-calculado según estamento |
| 📋 Actas | Redacción publicable a socios o registro fotográfico interno |
| 📬 Buzón | Consultas socio→directorio (con opción **anónima**) + **mensajería directorio→socios** (individual o broadcast, con no-leídos y campana, **con imagen adjunta** para informativos/afiches) + **recordatorios automáticos de cumpleaños** al directorio (ventana de 3 días, sin duplicados por año) |
| 📌 Diario Mural | Avisos categorizados (urgente, asamblea, beneficio…) — antes "Notificaciones" |
| 📅 Calendario | Eventos gremiales, feriados chilenos y **cumpleaños del padrón** (puntos en la grilla + entradas 🎂 en "Próximos eventos" del calendario y del inicio) |
| 📜 Estatutos | Texto íntegro visado por la Inspección del Trabajo, en acordeón |
| 🎁 Beneficios | Convenios administrables por el directorio (crear/editar/desactivar), con **detalle expandido** (ej: OPTIMED — prestaciones, garantías, contacto) |
| 🛡️ Admin | Gestión de roles y cargos, control de cuentas, **registro de auditoría** (últimos 100 eventos) |

### Cuotas configurables
- Montos por categoría en `config/cuotas`: **Personal Técnico $5.000** · **Personal Profesional $10.000** (editables desde el portal, sin tocar código).
- El Poder Simple y la ficha del socio muestran automáticamente el monto según su estamento.

### App instalable (PWA)
- El portal se puede **instalar en el teléfono** (Android/iOS/desktop) con ícono propio: `manifest.json` + service worker (`sw.js`).
- El service worker usa red-primero con respaldo en caché (la app queda fresca tras cada deploy) y **nunca intercepta** el handler de auth (`/__/*`) ni peticiones externas.

### Respaldos
- `node scripts/backup-firestore.mjs` exporta **todas las colecciones** a `backups/AFUSAMUT_firestore_<fecha>.json` (Timestamps en ISO). La carpeta `backups/` está git-ignorada porque contiene datos personales del padrón.
- Recomendado: programarlo mensualmente (Programador de tareas de Windows) y guardar el archivo en un lugar seguro.

### Transparencia y seguridad
- **Security Rules** de Firestore y Storage como fuente de verdad de permisos (el cliente solo refleja).
- **auditLog** inmutable: quién hizo qué, cuándo y sobre qué documento (solo lectura para superadmin).
- Mensajes anónimos del buzón no guardan el nombre real del autor.
- Errores monitoreados con **Sentry**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | **HTML + CSS + JavaScript vanilla** (ES Modules, sin bundler) |
| SDK | Firebase JS 10.x vía CDN (Auth, Firestore, Storage) |
| Tipografía | Fraunces (display) + Inter (cuerpo) |
| Autenticación | Google Sign-In + Microsoft (Azure app registration, tenant `consumers`) |
| Base de datos | Cloud Firestore |
| Archivos | Firebase Storage (boletas, actas, firmas) |
| Hosting | Firebase Hosting |
| Monitoreo | Sentry Browser |
| Scripts admin | Node.js + firebase-admin (carpeta `scripts/`) |

> El árbol `src/` (React/Vite) es un prototipo anterior y **no se usa**. La app vigente vive en `public/`.

---

## Estructura del proyecto

```
afusamut/
├── public/                  ← LA APP (se sirve tal cual en Hosting)
│   ├── index.html           → landing pública
│   ├── login.html           → login Google + Microsoft
│   ├── portal.html          → portal autenticado (11 tabs + admin)
│   ├── css/styles.css       → estilos (demo original + design system + efectos)
│   ├── js/
│   │   ├── firebase.js      → init + re-exports del SDK (única versión)
│   │   ├── auth.js          → redirect login, bootstrap, reclamo de ficha
│   │   ├── db.js            → auditoría, seed de beneficios, cuotas
│   │   ├── storage.js       → resize + upload de imágenes
│   │   ├── portal.js        → toda la lógica del portal
│   │   ├── landing-fx.js    → reveals/parallax/blur-up de la landing
│   │   ├── sentry.js        → error tracking
│   │   └── debug.js         → trazas [DEBUG] (flag DEBUG on/off)
│   └── img/                 → logo y fotografías
├── scripts/                 ← utilidades Admin SDK (requieren serviceAccountKey.json)
│   ├── habilitar-superadmin.mjs  → aprovisionar superadmin @micorriza.bio
│   ├── habilitar-microsoft.mjs   → activar/rotar proveedor Microsoft en Firebase
│   ├── seed-cuotas.mjs           → sembrar config/cuotas
│   ├── backup-firestore.mjs      → respaldo completo de Firestore a backups/*.json
│   └── agregar-optimed.mjs       → migración del convenio OPTIMED
├── firestore.rules          ← permisos (fuente de verdad)
├── storage.rules
├── firebase.json            ← hosting → public/
└── .env                     ← credenciales (NO subir a git)
```

### Colecciones Firestore

`users` (ficha + rol + cargo + estadoSocio/renuncias + loginCount) · `padronPendiente`
(pre-inscripciones por email) · `movimientos` (libro de caja) · `votaciones` + `votantes`
(ID compuesto votación_uid) · `poderes` · `pagosCuotas` (pagos mensuales, ID uid_YYYY-MM) ·
`actas` · `mensajes` (buzón socio→directorio) · `mensajesDirectorio` (directorio→socios,
con imagen opcional) · `notificaciones` (Diario Mural) · `eventos` · `beneficios` ·
`config` (cuotas, flags de seed) · `auditLog`.

---

## Desarrollo y despliegue

```powershell
# Servir localmente (la app es estática; el backend es Firebase en vivo)
npx http-server public -p 8642

# Desplegar reglas de seguridad
firebase deploy --only firestore:rules
firebase deploy --only storage

# Desplegar el sitio
firebase deploy --only hosting
```

Requisitos: `firebase-tools` autenticado en el proyecto `afusamuth`, y para los
scripts de `scripts/`, el archivo `serviceAccountKey.json` en la raíz (ignorado por git).

### Variables de entorno (`.env`)

Credenciales Firebase del proyecto, DSN de Sentry y `MICROSOFT_CLIENT_ID` /
`MICROSOFT_CLIENT_SECRET` del app registration de Azure (secret válido por 2 años;
se rota con `az ad app credential reset` + `node scripts/habilitar-microsoft.mjs`).

---

## Pendientes que requieren consola Firebase (⏳)

Dos refuerzos recomendados por la auditoría de seguridad que **no se pueden activar por código** y quedan documentados:

1. **Firebase App Check** (reCAPTCHA v3): Console → App Check → registrar la web app con reCAPTCHA v3 → obtener la site key → agregar `initializeAppCheck` en `public/js/firebase.js` → monitorear en modo no-forzado unos días → activar *enforcement* para Firestore y Storage. Bloquea el acceso directo por consola/scripts ajenos a la app.
2. **Notificaciones push (FCM)**: requiere plan **Blaze** (Cloud Functions para enviar) + VAPID key + `firebase-messaging-sw.js`. Complementa el Diario Mural con avisos urgentes al teléfono sin usar email. La PWA ya instalada es el prerequisito y ya está lista.

---

## Sentry Autofix — Pipeline automático (⏳ pendiente de configurar)

El workflow `.github/workflows/sentry-autofix.yml` corre cada 30 minutos, detecta errores
nuevos o escalando en Sentry, y lanza Claude Code para analizar el código y abrir un PR
con el fix propuesto. **Requiere 4 secrets en GitHub antes de activarse:**

| Secret | Cómo obtenerlo |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SENTRY_TOKEN` | Sentry → Settings → Developer Settings → User Auth Tokens (scopes: `project:read`, `event:read`) |
| `SENTRY_ORG` | Sentry → Settings → Organization → campo "Organization Slug" |
| `SENTRY_PROJECT` | Sentry → Projects → nombre del proyecto (slug) |

Una vez que tengas los valores, agrégalos con:

```bash
gh secret set ANTHROPIC_API_KEY --repo aldomellado1310-source/afusamut
gh secret set SENTRY_TOKEN      --repo aldomellado1310-source/afusamut
gh secret set SENTRY_ORG        --repo aldomellado1310-source/afusamut
gh secret set SENTRY_PROJECT    --repo aldomellado1310-source/afusamut
```

Luego prueba el pipeline manualmente:

```bash
gh workflow run sentry-autofix.yml --repo aldomellado1310-source/afusamut
gh run list --workflow=sentry-autofix.yml --limit 1
```

---

## Marco legal

- **Constitución:** 9 de abril de 2026, Inspección Comunal del Trabajo de Talcahuano
- **Ley base:** N° 19.296 (Asociaciones de Funcionarios de la Administración del Estado)
- **Registro:** N° 8805.0052 · Certificado DT N° 805/2026/303
- **Jurisdicción:** Talcahuano, Hualpén, Penco y Tomé
- **Directiva 2026–2028:** Héctor Andrades (Presidente) · Germán Delgado (Secretario) · Marcos Guiñez (Tesorero)

---

*Desarrollado por Micorriza · Portal 100% in-app, sin email.*
