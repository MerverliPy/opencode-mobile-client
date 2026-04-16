import { createMockRuntimeAdapter } from './mock-runtime.js';

function buildUnsupportedResult(operation) {
  return {
    ok: false,
    status: 'unsupported',
    operation,
    reason: 'remote backend not configured',
  };
}

export function createRemoteRuntimeAdapter({ mockAdapter = createMockRuntimeAdapter(), backend } = {}) {
  const isConfigured = Boolean(backend);

  return {
    id: 'remote-runtime',
    sourceLabel: isConfigured ? 'Remote runtime contract' : 'Remote runtime contract (mock fallback)',
    mode: isConfigured ? 'configured' : 'mock-fallback',
    isConfigured,
    fallbackAdapterId: mockAdapter.id,
    createStarterSessionPayload() {
      return mockAdapter.createStarterSessionPayload();
    },
    respond(input) {
      return mockAdapter.respond(input);
    },
    startRun({ prompt, sessionId, repoBinding = null } = {}) {
      return {
        ...buildUnsupportedResult('startRun'),
        prompt: typeof prompt === 'string' ? prompt : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
        repoBinding,
      };
    },
    resumeRun({ runId, sessionId } = {}) {
      return {
        ...buildUnsupportedResult('resumeRun'),
        runId: typeof runId === 'string' ? runId : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
      };
    },
    cancelRun({ runId, sessionId } = {}) {
      return {
        ...buildUnsupportedResult('cancelRun'),
        runId: typeof runId === 'string' ? runId : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
      };
    },
    fetchRunStatus({ runId, sessionId } = {}) {
      return {
        ...buildUnsupportedResult('fetchRunStatus'),
        runId: typeof runId === 'string' ? runId : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
      };
    },
    fetchPreviewLinks({ runId, sessionId } = {}) {
      return {
        ...buildUnsupportedResult('fetchPreviewLinks'),
        runId: typeof runId === 'string' ? runId : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
        previews: [],
      };
    },
  };
}
