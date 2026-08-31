import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  apply,
  createIPaperRecordTool,
  createIPaperStateTool,
} from '../lib/paper-project/tools.js'

const signal = new AbortController().signal
const agent = { id: 'session-a' }
const exec = {
  callId: 'call-1',
  rootCallId: 'call-1',
  name: 'test',
  arguments: {},
  signal,
  agent,
  token: Symbol('tool'),
  deferContext() {},
  concludeTurn() {},
}

test('preset plugin registers exactly the two Paper Project tools', () => {
  const registered = []
  const effects = []
  const ctx = {
    paperProjects: {},
    tools: {
      register(definition) {
        registered.push(definition)
        return () => {}
      },
    },
    effect(factory) {
      effects.push(factory())
    },
  }
  apply(ctx)
  assert.deepEqual(registered.map(tool => tool.name), ['ipaper_record', 'ipaper_state'])
  assert.equal(effects.length, 2)
})

test('ipaper_record derives caller identity from exec.agent and returns compact IDs', async () => {
  let invocation
  const service = {
    async recordForAgent(caller, input, callerSignal) {
      invocation = { caller, input, callerSignal }
      return {
        projectId: 'paper-workspace-a',
        revision: 3,
        created: { source: 'source-1' },
        updated: [],
        edgeIds: ['edge-1'],
        eventId: 'event-3',
      }
    },
  }
  const tool = createIPaperRecordTool(service)
  const result = await tool.execute({
    taskId: 'task-1',
    nodes: [{ ref: 'source', kind: 'source', title: 'Inspected source' }],
  }, exec)
  assert.equal(invocation.caller, agent)
  assert.equal(invocation.callerSignal, signal)
  assert.equal(invocation.input.taskId, 'task-1')
  assert.match(invocation.input.operationSummary, /create 1, update 0, relate 0/)
  assert.deepEqual(result, {
    projectId: 'paper-workspace-a',
    revision: 3,
    created: { source: 'source-1' },
    updated: [],
    edgeIds: ['edge-1'],
    eventId: 'event-3',
  })
})

test('ipaper_state defaults to overview and forwards bounded view arguments', async () => {
  const inputs = []
  const service = {
    async stateForAgent(caller, input, callerSignal) {
      inputs.push({ caller, input, callerSignal })
      return { view: 'overview', projectId: 'paper-a', workspaceId: 'a', revision: 0 }
    },
  }
  const tool = createIPaperStateTool(service)
  const result = await tool.execute({}, exec)
  assert.deepEqual(inputs[0], { caller: agent, input: {}, callerSignal: signal })
  assert.deepEqual(result, { view: 'overview', projectId: 'paper-a', workspaceId: 'a', revision: 0 })
})

test('both Paper Project tools reject agentless execution', async () => {
  const service = {
    async recordForAgent() { throw new Error('should not run') },
    async stateForAgent() { throw new Error('should not run') },
  }
  const agentless = { ...exec, agent: undefined }
  await assert.rejects(createIPaperRecordTool(service).execute({}, agentless), /requires a calling agent/)
  await assert.rejects(createIPaperStateTool(service).execute({}, agentless), /requires a calling agent/)
})
