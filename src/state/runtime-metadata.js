export function createRemoteRunState(remote = {}) {
  return {
    runId: typeof remote.runId === 'string' ? remote.runId : null,
    status: typeof remote.status === 'string' ? remote.status : 'idle',
    updatedAt: Number(remote.updatedAt) || null,
  };
}

export function createRepoBindingState(repoBinding = {}) {
  return {
    owner: typeof repoBinding.owner === 'string' ? repoBinding.owner : '',
    repo: typeof repoBinding.repo === 'string' ? repoBinding.repo : '',
    branch: typeof repoBinding.branch === 'string' ? repoBinding.branch : '',
    workspace: typeof repoBinding.workspace === 'string' ? repoBinding.workspace : '',
  };
}

export function createRuntimeMetadata(session = {}) {
  return {
    runtimeId: typeof session.runtimeMetadata?.runtimeId === 'string' ? session.runtimeMetadata.runtimeId : 'mock-local',
    remoteRun: createRemoteRunState(session.remoteRun),
    repoBinding: createRepoBindingState(session.repoBinding),
  };
}
