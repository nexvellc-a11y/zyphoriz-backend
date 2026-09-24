import test from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATE_OPTIONS, getTemplateConfig } from '../../fontEnd/src/data/templates.js';

test('template configuration includes default and premium template options', () => {
  assert.ok(TEMPLATE_OPTIONS.length >= 3);
  assert.ok(TEMPLATE_OPTIONS.some((template) => template.id === 'classic'));
  assert.ok(getTemplateConfig('classic'));
  assert.equal(getTemplateConfig('missing')?.id, 'classic');
});
