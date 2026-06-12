// Habilita el proveedor Microsoft en Firebase Auth vía Identity Toolkit Admin API
// (equivale a los "3 clicks" en Firebase Console). Lee las credenciales del .env.
// Uso: node scripts/habilitar-microsoft.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const clientId = env.MICROSOFT_CLIENT_ID;
const clientSecret = env.MICROSOFT_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Faltan MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET en .env');
  process.exit(1);
}

const auth = new GoogleAuth({
  keyFile: join(root, 'serviceAccountKey.json'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const base = 'https://identitytoolkit.googleapis.com/admin/v2/projects/afusamuth/defaultSupportedIdpConfigs';
const body = { enabled: true, clientId, clientSecret };

// Crear la config; si ya existe (409), actualizarla
try {
  await client.request({
    url: `${base}?idpId=microsoft.com`,
    method: 'POST',
    data: body,
  });
  console.log('✅ Proveedor Microsoft CREADO y habilitado en Firebase Auth');
} catch (e) {
  if (e.response?.status === 409) {
    await client.request({
      url: `${base}/microsoft.com?updateMask=enabled,clientId,clientSecret`,
      method: 'PATCH',
      data: body,
    });
    console.log('✅ Proveedor Microsoft ACTUALIZADO y habilitado en Firebase Auth');
  } else {
    console.error('ERROR:', e.response?.status, JSON.stringify(e.response?.data || e.message));
    process.exit(1);
  }
}

// Verificación
const res = await client.request({ url: `${base}/microsoft.com` });
console.log('Estado:', JSON.stringify({ name: res.data.name, enabled: res.data.enabled, clientId: res.data.clientId }));
process.exit(0);
