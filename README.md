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
- **Modo "Ver como"**: el superadmin puede ver el portal como socio o directorio (solo visual; sus permisos reales no cambian).

### Módulos del portal
| Módulo | Descripción |
|---|---|
| 🏠 Inicio | KPIs según rol, ficha personal del socio, configuración de cuotas (directorio) |
| 👥 Padrón | Inscripción con campos personalizados, búsqueda/filtros, estado de cuota, rol y cargo, export CSV |
| 💰 Finanzas | Libro de caja con **respaldo fotográfico de boletas** (Storage), KPIs, export CSV, impresión |
| 🗳️ Votaciones | Sufragio con **un voto por socio** garantizado por transacción atómica e ID compuesto; escrutinio en vivo |
| 📝 Poder Simple | Autorización de descuento por planilla con **firma digital en canvas** o foto del documento; monto auto-calculado según estamento |
| 📋 Actas | Redacción publicable a socios o registro fotográfico interno |
| 📬 Buzón | Consultas socio→directorio (con opción **anónima**) + **mensajería directorio→socios** (individual o broadcast, con no-leídos y campana) |
| 🔔 Notificaciones | Avisos categorizados (urgente, asamblea, beneficio…) |
| 📅 Calendario | Eventos gremiales, feriados chilenos y cumpleaños del padrón |
| 📜 Estatutos | Texto íntegro visado por la Inspección del Trabajo, en acordeón |
| 🎁 Beneficios | Convenios administrables por el directorio (crear/editar/desactivar), con **detalle expandido** (ej: OPTIMED — prestaciones, garantías, contacto) |
| 🛡️ Admin | Gestión de roles y cargos, control de cuentas, **registro de auditoría** (últimos 100 eventos) |

### Cuotas configurables
- Montos por categoría en `config/cuotas`: **Personal Técnico $5.000** · **Personal Profesional $10.000** (editables desde el portal, sin tocar código).
- El Poder Simple y la ficha del socio muestran automáticamente el monto según su estamento.

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
│   └── agregar-optimed.mjs       → migración del convenio OPTIMED
├── firestore.rules          ← permisos (fuente de verdad)
├── storage.rules
├── firebase.json            ← hosting → public/
└── .env                     ← credenciales (NO subir a git)
```

### Colecciones Firestore

`users` (ficha + rol + cargo) · `padronPendiente` (pre-inscripciones por email) ·
`movimientos` (libro de caja) · `votaciones` + `votantes` (ID compuesto votación_uid) ·
`poderes` · `actas` · `mensajes` (buzón socio→directorio) · `mensajesDirectorio`
(directorio→socios) · `notificaciones` · `eventos` · `beneficios` · `config`
(cuotas, flags de seed) · `auditLog`.

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

## Marco legal

- **Constitución:** 9 de abril de 2026, Inspección Comunal del Trabajo de Talcahuano
- **Ley base:** N° 19.296 (Asociaciones de Funcionarios de la Administración del Estado)
- **Registro:** N° 8805.0052 · Certificado DT N° 805/2026/303
- **Jurisdicción:** Talcahuano, Hualpén, Penco y Tomé
- **Directiva 2026–2028:** Héctor Andrades (Presidente) · Germán Delgado (Secretario) · Marcos Guiñez (Tesorero)

---

*Desarrollado por Micorriza · Portal 100% in-app, sin email.*
