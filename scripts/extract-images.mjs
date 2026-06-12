// Extrae las imágenes base64 del demo HTML a public/img/, deduplicadas por hash.
// Uso: node scripts/extract-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = join(root, 'Ultima_Version', 'afusamut portal demo (1).html');
const outDir = join(root, 'public', 'img');
mkdirSync(outDir, { recursive: true });

const html = readFileSync(demoPath, 'utf8');
const re = /data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)/g;

const seen = new Map(); // hash -> filename
let idx = 0;
const manifest = [];
let m;
while ((m = re.exec(html)) !== null) {
  const ext = m[1] === 'png' ? 'png' : 'jpg';
  const buf = Buffer.from(m[2], 'base64');
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 10);
  let name = seen.get(hash);
  const isNew = !name;
  if (isNew) {
    idx++;
    name = `img${String(idx).padStart(2, '0')}_${hash}.${ext}`;
    seen.set(hash, name);
    writeFileSync(join(outDir, name), buf);
  }
  manifest.push({ order: manifest.length + 1, file: name, bytes: buf.length, new: isNew });
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(manifest.map(e => `${e.order}. ${e.file} (${e.bytes} B)${e.new ? '' : ' [dup]'}`).join('\n'));
