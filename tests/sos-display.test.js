const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sosTypeMeta,
  sosTypeLabel,
  sosDisplayMessage
} = require('../public/js/lib/utils');

test('SOS display helpers', async (t) => {
  await t.test('maps known SOS types to friendly Indonesian labels', () => {
    assert.equal(sosTypeMeta('MEDICAL').label, 'Medis / Cedera');
    assert.equal(sosTypeMeta('crash').label, 'Tabrakan / Jatuh');
    assert.equal(sosTypeMeta('MECHANICAL').label, 'Kerusakan Sepeda');
    assert.equal(sosTypeMeta('EVACUATION').label, 'Evakuasi / DNF');
    assert.match(sosTypeLabel('CRASH'), /Tabrakan \/ Jatuh/);
  });

  await t.test('falls back gracefully for unknown or empty types', () => {
    assert.equal(sosTypeMeta('').label, 'Darurat');
    assert.equal(sosTypeMeta('SOMETHING_ELSE').label, 'SOMETHING_ELSE');
    assert.equal(sosTypeMeta(undefined).icon, '🚨');
  });

  await t.test('uses the rider note when it describes the condition', () => {
    assert.equal(
      sosDisplayMessage({ type: 'CRASH', message: 'Jatuh di KM 45, lutut berdarah' }),
      'Jatuh di KM 45, lutut berdarah'
    );
  });

  await t.test('replaces empty or legacy generic messages with a type-specific description', () => {
    assert.match(sosDisplayMessage({ type: 'MEDICAL', message: '' }), /cedera atau masalah medis/i);
    assert.match(sosDisplayMessage({ type: 'CRASH' }), /tabrakan atau jatuh/i);
    assert.match(
      sosDisplayMessage({ type: 'EVACUATION', message: 'Sinyal SOS dari Cockpit Rider #001' }),
      /meminta evakuasi/i
    );
    assert.match(
      sosDisplayMessage({ type: 'MECHANICAL', message: 'Bantuan darurat (MECHANICAL) dari rider #001' }),
      /kerusakan sepeda/i
    );
  });
});
