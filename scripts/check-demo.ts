import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const output = new URL('../dist/demo/', import.meta.url);
const entries = ['index.html', 'study.html'];
const files = await readdir(output, { recursive: true });
const regularFiles: string[] = [];
for (const file of files) {
  if (!(await stat(new URL(file, output))).isFile()) continue;
  assert.ok(
    entries.includes(file) || /^assets\/[\w.-]+\.(js|css)$/.test(file),
    `Unexpected file in the public demo: ${file}`,
  );
  regularFiles.push(file);
}

// Resolve the actual generated HTML and module references at both a root and a
// project URL. Absolute-root assets or links would escape the Pages subpath.
for (const base of ['https://example.invalid/', 'https://example.invalid/ascii-raptors/']) {
  const pending = [...entries];
  const visited = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const content = await readFile(new URL(file, output), 'utf8');
    const references = file.endsWith('.html')
      ? [...content.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])
      : [...content.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g)].map(
          (match) => match[1],
        );
    for (const reference of references) {
      if (/^(?:https?:|data:|#)/.test(reference)) continue;
      const resolved = new URL(reference, new URL(file, base));
      assert.ok(resolved.href.startsWith(base), `${file}: path escapes ${base}: ${reference}`);
      const relative = decodeURIComponent(resolved.pathname.slice(new URL(base).pathname.length));
      assert.ok(regularFiles.includes(relative), `${file}: missing ${reference}`);
      if (/\.(?:html|js)$/.test(relative)) pending.push(relative);
    }
  }
  assert.ok(visited.has('study.html'), 'The study entry must be included');
  const study = await readFile(new URL('study.html', output), 'utf8');
  for (const target of entries)
    assert.ok(study.includes(`href="./${target}"`), `Study navigation is missing ${target}`);
  console.log(`Demo references and study navigation resolve under ${new URL(base).pathname}`);
}

let bytes = 0;
let compressed = 0;
for (const file of regularFiles) {
  const content = await readFile(new URL(file, output));
  bytes += content.length;
  compressed += gzipSync(content).length;
}
console.log(
  `${regularFiles.length} public files, ${bytes} bytes (${compressed} gzip bytes): ${fileURLToPath(output)}`,
);
