export function createUiNotice({ tone = 'info', title, body }) {
  return title && body ? { tone, title, body } : null;
}

export function createUnavailableLinkNotice(label) {
  return createUiNotice({
    tone: 'warning',
    title: 'Link unavailable.',
    body: `${label} is not available for this session yet.`,
  });
}

export function createInvalidLinkNotice(label) {
  return createUiNotice({
    tone: 'warning',
    title: 'Link could not open.',
    body: `${label} did not include a valid URL, so the mobile shell kept the state honest instead of opening the wrong destination.`,
  });
}

export function createUnsupportedLinkNotice(label) {
  return createUiNotice({
    tone: 'warning',
    title: 'Link could not open.',
    body: `${label} must use an http or https URL before the mobile shell can open it.`,
  });
}

export function createBlockedLinkNotice(label) {
  return createUiNotice({
    tone: 'warning',
    title: 'Link could not open.',
    body: `${label} was available, but the browser blocked the new tab request. Try again from the same session if needed.`,
  });
}
