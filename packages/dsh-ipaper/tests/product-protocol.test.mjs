import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  IPAPER_PRODUCT_PROTOCOL,
  IPAPER_PROTOCOL_ORDER,
  IPAPER_PROTOCOL_SECTION,
  apply,
  inject,
  name,
} from '../lib/product-protocol.js'

test('registers the Paper Project protocol as one scoped system-prompt section', () => {
  const sections = []
  const effects = []
  const ctx = {
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {}
      },
    },
    effect(factory, label) {
      effects.push({ dispose: factory(), label })
    },
  }
  apply(ctx)
  assert.equal(name, 'product-protocol')
  assert.deepEqual(inject, ['systemPrompt'])
  assert.deepEqual(sections, [{
    name: IPAPER_PROTOCOL_SECTION,
    order: IPAPER_PROTOCOL_ORDER,
    text: IPAPER_PRODUCT_PROTOCOL,
  }])
  assert.equal(effects[0].label, 'ipaper.productProtocolSection()')
  assert.match(IPAPER_PRODUCT_PROTOCOL, /Do not fabricate citations/)
})
