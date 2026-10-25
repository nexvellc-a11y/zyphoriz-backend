import test from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATE_OPTIONS, getTemplateConfig } from '../../fontEnd/src/data/templates.js';

test('template configuration includes default and light template options', () => {
  assert.ok(TEMPLATE_OPTIONS.length >= 3);
  assert.ok(TEMPLATE_OPTIONS.some((template) => template.id === 'classic'));
  assert.ok(TEMPLATE_OPTIONS.some((template) => template.id === 'light'));
  assert.ok(!TEMPLATE_OPTIONS.some((template) => template.id === 'forest'));
  assert.equal(getTemplateConfig('light').theme.surface, '#f8fafc');
  assert.ok(getTemplateConfig('classic'));
  assert.equal(getTemplateConfig('missing')?.id, 'classic');
});
