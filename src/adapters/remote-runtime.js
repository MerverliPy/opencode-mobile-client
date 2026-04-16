import { createMockRuntimeAdapter } from './mock-runtime.js';

function buildUnsupportedResult(operation, extra = {}) {
  return {
    ok: false,
    status: 'unsupported',
    operation,
    reason: 'remote backend not configured',
    ...extra,
  };
}

function buildFailedResult(operation, extra = {}) {
  return {
    ok: false,
    status: 'error',
    operation,
    reason: 'remote backend request failed',
    ...extra,
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHeaders(headers = {}) {
  return headers && typeof headers === 'object' ? headers : {};
}

function normalizeBackend(backend) {
  const baseUrl = typeof backend === 'string'
    ? normalizeText(backend)
    : normalizeText(backend?.baseUrl);

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    headers: normalizeHeaders(backend?.headers),
    fetchImpl: typeof backend?.fetchImpl === 'function' ? backend.fetchImpl : globalThis.fetch,
  };
}

function encodeSegment(value) {
  return encodeURIComponent(normalizeText(value));
}

function buildRequestUrl(baseUrl, path, query = null) {
  const url = new URL(`${baseUrl}${path}`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      const normalizedValue = normalizeText(value);

      if (normalizedValue) {
        url.searchParams.set(key, normalizedValue);
      }
    });
  }

  return url.toString();
}

async function parseResponseJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRemoteRun(payload, fallback = {}) {
  const source = payload?.run && typeof payload.run === 'object' ? payload.run : payload;
  const runId = normalizeText(source?.runId) || normalizeText(source?.id) || normalizeText(fallback.runId);
  const status = normalizeText(source?.status) || fallback.status || 'idle';

  return {
    runId,
    status,
    updatedAt: Number(source?.updatedAt) || Date.now(),
  };
}

async function performBackendRequest({ operation, backendConfig, path, method = 'GET', body, query, fallbackStatus }) {
  if (!backendConfig) {
    return buildUnsupportedResult(operation);
  }

  if (typeof backendConfig.fetchImpl !== 'function') {
    return buildFailedResult(operation, {
      details: 'fetch is unavailable in this environment',
    });
  }

  const requestUrl = buildRequestUrl(backendConfig.baseUrl, path, query);

  try {
    const response = await backendConfig.fetchImpl(requestUrl, {
      method,
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...backendConfig.headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await parseResponseJson(response);

    if (payload === null) {
      return buildFailedResult(operation, {
        details: 'remote backend returned invalid JSON',
        requestUrl,
        statusCode: response.status,
      });
    }

    if (!response.ok) {
      return buildFailedResult(operation, {
        details: normalizeText(payload?.error) || normalizeText(payload?.message) || `HTTP ${response.status}`,
        requestUrl,
        statusCode: response.status,
      });
    }

    return {
      ok: true,
      operation,
      status: normalizeText(payload?.status) || fallbackStatus,
      requestUrl,
      remoteRun: normalizeRemoteRun(payload, { status: fallbackStatus }),
      payload,
    };
  } catch (error) {
    return buildFailedResult(operation, {
      details: error instanceof Error ? error.message : String(error),
      requestUrl,
    });
  }
}

export function createRemoteRuntimeAdapter({ mockAdapter = createMockRuntimeAdapter(), backend } = {}) {
  const backendConfig = normalizeBackend(backend);
  const isConfigured = Boolean(backendConfig);

  return {
    id: 'remote-runtime',
    sourceLabel: isConfigured ? 'Remote runtime HTTP bridge' : 'Remote runtime HTTP bridge (mock fallback)',
    mode: isConfigured ? 'configured' : 'mock-fallback',
    isConfigured,
    backendBaseUrl: backendConfig?.baseUrl ?? '',
    fallbackAdapterId: mockAdapter.id,
    createStarterSessionPayload() {
      return mockAdapter.createStarterSessionPayload();
    },
    respond(input) {
      return mockAdapter.respond(input);
    },
    async startRun({ prompt, sessionId, repoBinding = null } = {}) {
      const normalizedPrompt = typeof prompt === 'string' ? prompt : '';
      const normalizedSessionId = typeof sessionId === 'string' ? sessionId : '';
      const result = await performBackendRequest({
        operation: 'startRun',
        backendConfig,
        path: '/runs',
        method: 'POST',
        body: {
          prompt: normalizedPrompt,
          sessionId: normalizedSessionId,
          repoBinding,
        },
        fallbackStatus: 'queued',
      });

      return result.ok
        ? {
            ...result,
            prompt: normalizedPrompt,
            sessionId: normalizedSessionId,
            repoBinding,
          }
        : {
            ...result,
            prompt: normalizedPrompt,
            sessionId: normalizedSessionId,
            repoBinding,
          };
    },
    async resumeRun({ runId, sessionId, prompt = '' } = {}) {
      const normalizedRunId = typeof runId === 'string' ? runId : '';
      const normalizedSessionId = typeof sessionId === 'string' ? sessionId : '';
      const normalizedPrompt = typeof prompt === 'string' ? prompt : '';

      if (!normalizedRunId) {
        return buildFailedResult('resumeRun', {
          details: 'run id is required',
          runId: normalizedRunId,
          sessionId: normalizedSessionId,
          prompt: normalizedPrompt,
        });
      }

      const result = await performBackendRequest({
        operation: 'resumeRun',
        backendConfig,
        path: `/runs/${encodeSegment(normalizedRunId)}/resume`,
        method: 'POST',
        body: {
          sessionId: normalizedSessionId,
          ...(normalizedPrompt ? { prompt: normalizedPrompt } : {}),
        },
        fallbackStatus: 'running',
      });

      return {
        ...result,
        runId: normalizedRunId,
        sessionId: normalizedSessionId,
        prompt: normalizedPrompt,
      };
    },
    async cancelRun({ runId, sessionId } = {}) {
      const normalizedRunId = typeof runId === 'string' ? runId : '';
      const normalizedSessionId = typeof sessionId === 'string' ? sessionId : '';

      if (!normalizedRunId) {
        return buildFailedResult('cancelRun', {
          details: 'run id is required',
          runId: normalizedRunId,
          sessionId: normalizedSessionId,
        });
      }

      const result = await performBackendRequest({
        operation: 'cancelRun',
        backendConfig,
        path: `/runs/${encodeSegment(normalizedRunId)}/cancel`,
        method: 'POST',
        body: {
          sessionId: normalizedSessionId,
        },
        fallbackStatus: 'cancelled',
      });

      return {
        ...result,
        runId: normalizedRunId,
        sessionId: normalizedSessionId,
      };
    },
    async fetchRunStatus({ runId, sessionId } = {}) {
      const normalizedRunId = typeof runId === 'string' ? runId : '';
      const normalizedSessionId = typeof sessionId === 'string' ? sessionId : '';

      if (!normalizedRunId) {
        return buildFailedResult('fetchRunStatus', {
          details: 'run id is required',
          runId: normalizedRunId,
          sessionId: normalizedSessionId,
        });
      }

      const result = await performBackendRequest({
        operation: 'fetchRunStatus',
        backendConfig,
        path: `/runs/${encodeSegment(normalizedRunId)}`,
        query: {
          sessionId: normalizedSessionId,
        },
        fallbackStatus: 'running',
      });

      return {
        ...result,
        runId: normalizedRunId,
        sessionId: normalizedSessionId,
      };
    },
    async fetchPreviewLinks({ runId, sessionId } = {}) {
      return {
        ...buildUnsupportedResult('fetchPreviewLinks'),
        runId: typeof runId === 'string' ? runId : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
        previews: [],
      };
    },
  };
}
