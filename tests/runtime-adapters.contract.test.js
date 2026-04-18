import { describe, expect, it, vi } from 'vitest';

import { createMockRuntimeAdapter } from '../src/adapters/mock-runtime.js';
import { createRemoteRuntimeAdapter } from '../src/adapters/remote-runtime.js';

function expectCoreAdapterContract(adapter) {
  expect(typeof adapter.id).toBe('string');
  expect(adapter.id.length).toBeGreaterThan(0);
  expect(typeof adapter.sourceLabel).toBe('string');
  expect(adapter.sourceLabel.length).toBeGreaterThan(0);
  expect(typeof adapter.createStarterSessionPayload).toBe('function');
  expect(typeof adapter.respond).toBe('function');

  const starterPayload = adapter.createStarterSessionPayload();
  expect(Array.isArray(starterPayload.toolResults)).toBe(true);

  if (starterPayload.diffToolResultId) {
    expect(starterPayload.toolResults.some((toolResult) => toolResult.id === starterPayload.diffToolResultId)).toBe(true);
  }

  const response = adapter.respond({
    prompt: 'Review the latest mobile task flow.',
    sessionTitle: 'Mobile task',
  });

  expect(typeof response.assistantMessage.id).toBe('string');
  expect(response.assistantMessage.role).toBe('assistant');
  expect(typeof response.assistantMessage.label).toBe('string');
  expect(typeof response.assistantMessage.text).toBe('string');
  expect(Array.isArray(response.toolResults)).toBe(true);

  if (response.assistantMessage.toolResultId) {
    expect(response.toolResults.some((toolResult) => toolResult.id === response.assistantMessage.toolResultId)).toBe(true);
  }
}

describe('runtime adapter contract', () => {
  it('keeps the mock runtime aligned with the core adapter contract', () => {
    expectCoreAdapterContract(createMockRuntimeAdapter());
  });

  it('keeps the remote runtime fallback aligned with the core adapter contract', () => {
    const adapter = createRemoteRuntimeAdapter();
    expectCoreAdapterContract(adapter);
    expect(adapter.mode).toBe('mock-fallback');
    expect(adapter.isConfigured).toBe(false);
    expect(adapter.fallbackAdapterId).toBe('mock-local');
  });

  it('returns a deterministic unsupported result when remote operations are requested without backend configuration', async () => {
    const adapter = createRemoteRuntimeAdapter();
    const result = await adapter.startRun({
      prompt: 'Open a run',
      sessionId: 'session-1',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('unsupported');
    expect(result.operation).toBe('startRun');
    expect(result.reason).toBe('remote backend not configured');
  });

  it('normalizes successful remote run responses from a configured backend', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          status: 'queued',
          run: {
            id: 'run-123',
            status: 'queued',
            updatedAt: 1700000000000,
          },
          response: {
            text: 'Queued for execution.',
            label: 'OpenCode Remote',
          },
        });
      },
    }));

    const adapter = createRemoteRuntimeAdapter({
      backend: {
        baseUrl: 'https://example.test/api/',
        headers: { authorization: 'Bearer token' },
        fetchImpl,
      },
    });

    const result = await adapter.startRun({
      prompt: 'Queue this task',
      sessionId: 'session-99',
      repoBinding: { owner: 'oai', repo: 'mobile', branch: 'main', workspace: 'default' },
    });

    expect(adapter.mode).toBe('configured');
    expect(adapter.isConfigured).toBe(true);
    expect(adapter.backendBaseUrl).toBe('https://example.test/api');
    expect(result.ok).toBe(true);
    expect(result.status).toBe('queued');
    expect(result.remoteRun).toEqual({
      runId: 'run-123',
      status: 'queued',
      updatedAt: 1700000000000,
    });
    expect(result.assistantResponse).toEqual({
      text: 'Queued for execution.',
      label: 'OpenCode Remote',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://example.test/api/runs');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
    });
  });

  it('rejects hydrateCompletedRun when the remote run is incomplete or missing output', () => {
    const adapter = createRemoteRuntimeAdapter();

    expect(
      adapter.hydrateCompletedRun({
        ok: true,
        status: 'running',
        runId: 'run-1',
        payload: { run: { id: 'run-1', status: 'running' } },
      }),
    ).toMatchObject({
      ok: false,
      operation: 'hydrateCompletedRun',
      reason: 'remote run not completed',
    });

    expect(
      adapter.hydrateCompletedRun({
        ok: true,
        status: 'completed',
        runId: 'run-2',
        payload: { run: { id: 'run-2', status: 'completed' } },
      }),
    ).toMatchObject({
      ok: false,
      operation: 'hydrateCompletedRun',
      reason: 'completed remote run did not return assistant output',
    });
  });

  it('hydrates completed remote runs when assistant output exists', () => {
    const adapter = createRemoteRuntimeAdapter();
    const result = adapter.hydrateCompletedRun({
      ok: true,
      status: 'completed',
      runId: 'run-3',
      payload: {
        run: { id: 'run-3', status: 'completed', updatedAt: 1700000000999 },
        response: { text: 'Completed output', label: 'OpenCode Remote' },
      },
    });

    expect(result).toEqual({
      ok: true,
      status: 'completed',
      operation: 'hydrateCompletedRun',
      remoteRun: {
        runId: 'run-3',
        status: 'completed',
        updatedAt: 1700000000999,
      },
      assistantResponse: {
        text: 'Completed output',
        label: 'OpenCode Remote',
      },
    });
  });
});
