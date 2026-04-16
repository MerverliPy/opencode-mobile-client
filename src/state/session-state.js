import { compactText, createId, trimText } from '../lib/utils.js';
import { persistSessionState } from './storage.js';
import { createRemoteRunState, createRepoBindingState } from './runtime-metadata.js';

export function createStarterMessages(diffToolResultId) {
  return [
    {
      id: createId('msg'),
      role: 'assistant',
      label: 'OpenCode',
      text:
        'This starter session stays local to the device, so you can move between Sessions and Task without dropping the current thread.',
    },
    {
      id: createId('msg'),
      role: 'assistant',
      label: 'OpenCode',
      text: 'A starter mock diff review is ready, and the tools drawer still keeps file output nearby without leaving this thread.',
      toolResultId: diffToolResultId,
    },
    {
      id: createId('msg'),
      role: 'notice',
      label: 'Interrupted',
      tone: 'interrupted',
      text:
        'If a reply gets interrupted, the retry prompt is still available inside this session without clearing your draft.',
      actionLabel: 'Use retry prompt',
    },
  ];
}

export function resetToolDrawer(appState) {
  appState.toolDrawer.isOpen = false;
  appState.toolDrawer.view = 'list';
  appState.toolDrawer.toolId = null;
  appState.toolDrawer.changePath = null;
}

export function getSelectedSession(appState) {
  return appState.sessions.find((session) => session.id === appState.selectedSessionId) ?? null;
}

export function getToolResults(session) {
  return Array.isArray(session?.toolResults) ? session.toolResults : [];
}

export function getToolResult(session, toolId) {
  return getToolResults(session).find((toolResult) => toolResult.id === toolId) ?? null;
}

export function getSessionTitle(session) {
  const firstUserMessage = session.messages.find(
    (message) => message.role === 'user' && compactText(message.text),
  );

  if (!firstUserMessage) {
    return 'New session';
  }

  return trimText(compactText(firstUserMessage.text), 42);
}

export function getSessionPreview(session) {
  const previewMessage = [...session.messages]
    .reverse()
    .find((message) => message.role !== 'notice' && compactText(message.text));

  if (!previewMessage) {
    return 'Start a session to keep recent work close on mobile.';
  }

  return trimText(compactText(previewMessage.text), 112);
}

export function getVisibleMessageCount(session) {
  return session.messages.filter((message) => message.role !== 'notice').length;
}

export { createRemoteRunState, createRepoBindingState, createRuntimeMetadata } from './runtime-metadata.js';

export function getRepoBindingLabel(session) {
  const owner = compactText(session?.repoBinding?.owner ?? '');
  const repo = compactText(session?.repoBinding?.repo ?? '');
  const branch = compactText(session?.repoBinding?.branch ?? '');

  if (!owner && !repo && !branch) {
    return '';
  }

  const repoLabel = owner && repo ? `${owner}/${repo}` : repo || owner;
  return branch ? `${repoLabel} · ${branch}` : repoLabel;
}

export function getRepoWorkspaceLabel(session) {
  return compactText(session?.repoBinding?.workspace ?? '');
}

export function getRepoBindingStatus(session) {
  const hasRepoBinding = Boolean(getRepoBindingLabel(session) || getRepoWorkspaceLabel(session));
  const runId = compactText(session?.remoteRun?.runId ?? '');
  const runStatus = compactText(session?.remoteRun?.status ?? 'idle') || 'idle';
  const hasActiveRun = Boolean(runId) && ['queued', 'running', 'awaiting_input'].includes(runStatus);

  if (!hasRepoBinding) {
    return 'unbound';
  }

  return hasActiveRun ? 'bound-active' : 'bound';
}

export function setSelectedSession(appState, sessionId) {
  appState.selectedSessionId = appState.sessions.some((session) => session.id === sessionId)
    ? sessionId
    : null;
  resetToolDrawer(appState);
  persistSessionState(appState);
}

export function updateSessionById(appState, sessionId, updater) {
  let updatedSession = null;

  appState.sessions = appState.sessions
    .map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      updatedSession = updater(session);
      return updatedSession;
    })
    .sort((first, second) => second.updatedAt - first.updatedAt);

  persistSessionState(appState);
  return updatedSession;
}

export function createSession(appState, runtimeAdapter) {
  const now = Date.now();
  const starterSessionPayload = runtimeAdapter.createStarterSessionPayload();
  const session = {
    id: createId('session'),
    createdAt: now,
    updatedAt: now,
    draft: '',
    isLoading: false,
    messages: createStarterMessages(starterSessionPayload.diffToolResultId),
    toolResults: starterSessionPayload.toolResults,
    runtimeMetadata: {
      runtimeId: runtimeAdapter.id,
    },
    remoteRun: createRemoteRunState(),
    repoBinding: createRepoBindingState(),
  };

  appState.sessions = [session, ...appState.sessions];
  appState.selectedSessionId = session.id;
  resetToolDrawer(appState);
  persistSessionState(appState);
  return session;
}
