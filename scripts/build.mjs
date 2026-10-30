import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
if (resolve(output) !== resolve(root, 'dist')) throw new Error('Unsafe build output');
const files = [
  '404.html', 'about.html', 'account.html', 'admin.html', 'app.js',
  'cart.html', 'confirmation.html', 'contact.html', 'firebase.js',
  'index.html', 'info.html', 'shipping.html', 'shop.html', 'styles.css'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await cp(join(root, file), join(output, file));

const imageOutput = join(output, 'image');
await mkdir(imageOutput, { recursive: true });
for (const file of await readdir(join(root, 'image'))) {
  if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file)) continue;
  await cp(join(root, 'image', file), join(imageOutput, file));
}

console.log(`Prepared ${files.length} site files and ${
  (await readdir(imageOutput)).length
} images in dist/`);
