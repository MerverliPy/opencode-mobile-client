export function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function getConnectionTone(appState) {
  return appState.shell.isOnline ? 'online' : 'offline';
}

export function getConnectionLabel(appState) {
  return appState.shell.isOnline ? 'Online' : 'Offline';
}

export function getConnectionMessage(appState) {
  return appState.shell.isOnline
    ? 'Connection available. This release still runs as a local shell, so saved sessions stay on this device and no live backend is connected.'
    : 'You are offline. Existing local sessions stay readable on this device, but install updates and reload-dependent shell checks may wait until connection returns.';
}

export function getInstallHint(appState) {
  if (appState.shell.isStandalone) {
    return 'Installed to Home Screen';
  }

  if (appState.shell.installPromptEvent) {
    return 'Install ready';
  }

  return 'Add to Home Screen available';
}

export function getInstallBody(appState) {
  if (appState.shell.isStandalone) {
    return 'This app now launches like an installed mobile app and keeps your last screen close at hand.';
  }

  if (appState.shell.installPromptEvent) {
    return 'This device can install the current shell for quicker relaunches and a more app-like experience.';
  }

  return 'Use Safari or browser share controls to add this client to your Home Screen for faster relaunches.';
}
