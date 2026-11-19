// Saves the Cnamio server SDK (one file, no dependencies) into lib/cnamio-sdk/, the way the Cnamio docs say to:
// there is no npm package to install yet. Runs before `npm run dev`, `npm test` and `npm run smoke`; it downloads only
// what is missing. `npm run sdk -- --force` fetches the latest files again. Commit them in your own project.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'lib', 'cnamio-sdk');
const files = ['cnamio.mjs', 'cnamio.d.mts'];
const force = process.argv.includes('--force');

await mkdir(dir, { recursive: true });
for (const file of files) {
  const target = join(dir, file);
  if (!force && await access(target).then(() => true, () => false)) continue;
  const response = await fetch(`https://cnamio.com/sdk/${file}`);
  const text = await response.text();
  if (!response.ok || !/Cnamio server SDK/.test(text.slice(0, 200))) {
    console.error(`Could not download https://cnamio.com/sdk/${file} (HTTP ${response.status}). Check your connection and run npm run sdk again.`);
    process.exit(1);
  }
  await writeFile(target, text);
  console.log(`Saved lib/cnamio-sdk/${file}`);
}
