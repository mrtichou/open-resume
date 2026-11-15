import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { SIDE_BAND_HEADER_VARIANTS } from '../src/lib/template-layout.ts';

const root = path.resolve(import.meta.dirname, '..');
const css = readFileSync(path.join(root, 'src/styles.css'), 'utf8');

// The variants whose header is taken out of the page flow and pinned in a band are the side-band ones.
function variantsWithPinnedHeader(): Set<string> {
  const found = new Set<string>();
  for (const rule of css.matchAll(/^\.template-([a-z]+) \.classic-header\s*\{([^}]*)\}/gm)) {
    if (/position:\s*absolute/.test(rule[2])) found.add(rule[1]);
  }
  return found;
}

test('every template that pins its header in a side band shows contact details one per line', () => {
  const pinned = variantsWithPinnedHeader();
  assert.ok(pinned.size >= 2, 'the stylesheet still has side-band templates');
  assert.deepEqual([...SIDE_BAND_HEADER_VARIANTS].sort(), [...pinned].sort());
});

test('the catalogue only uses variants that exist in the stylesheet', () => {
  const data = readFileSync(path.join(root, 'src/data.ts'), 'utf8');
  for (const variant of SIDE_BAND_HEADER_VARIANTS) {
    assert.match(data, new RegExp(`variant: '${variant}'`), `${variant} has at least one template`);
    assert.match(css, new RegExp(`\\.template-${variant} `), `${variant} has styles`);
  }
});
