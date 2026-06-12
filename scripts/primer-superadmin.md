# Crear el primer superadmin (una sola vez)

1. Desplegar reglas y hosting (`firebase deploy`).
2. Abrir el portal e iniciar sesión con Google usando **aldo@micorriza.bio**.
   El login dirá "no registrado" — es normal: cerrar el aviso SIN cerrar la pestaña.
   (La regla de bootstrap permite que una cuenta @micorriza.bio se cree a sí misma
   como superadmin, por eso este paso funciona aunque el padrón esté vacío.)
3. Abrir la consola del navegador (F12 → Console) en `/login.html` y pegar:

```javascript
const { db, auth, doc, setDoc, serverTimestamp, GoogleAuthProvider, signInWithPopup } =
  await import('/js/firebase.js');

// Asegurar sesión Google activa (si el login la cerró, volver a abrirla):
if (!auth.currentUser) {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

await setDoc(doc(db, 'users', auth.currentUser.uid), {
  rut:          '18.412.044-5',
  nombre:       'Aldo Mellado',
  email:        'aldo@micorriza.bio',
  rol:          'superadmin',
  activo:       true,
  estadoCuota:  'Al día',
  camposExtra:  {},
  onboardingOk: true,
  creadoEn:     serverTimestamp(),
  ultimoLogin:  serverTimestamp(),
});
console.log('✅ Superadmin creado');
```

4. Recargar `/portal.html` → debe aparecer el pill "🛡️ Micorriza Admin" y el tab Admin.

> El email de la cuenta DEBE terminar en `@micorriza.bio`; las Security Rules
> rechazan cualquier otro dominio para el rol superadmin.
