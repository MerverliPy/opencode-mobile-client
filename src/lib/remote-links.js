export function normalizeExternalLink(value, fallbackLabel) {
  if (typeof value === 'string') {
    const url = value.trim();

    return url
      ? {
          label: fallbackLabel,
          url,
        }
      : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const urlCandidate = [value.url, value.href, value.link].find((candidate) => typeof candidate === 'string' && candidate.trim());

  if (!urlCandidate) {
    return null;
  }

  const labelCandidate = [value.label, value.title, value.name].find((candidate) => typeof candidate === 'string' && candidate.trim());

  return {
    label: labelCandidate?.trim() ?? fallbackLabel,
    url: urlCandidate.trim(),
  };
}

export function createRemoteLinkState(payload = null) {
  const previewSource = Array.isArray(payload?.previews)
    ? payload.previews
    : Array.isArray(payload?.previewLinks)
      ? payload.previewLinks
      : Array.isArray(payload?.links?.previews)
        ? payload.links.previews
        : [];

  return {
    previews: previewSource
      .map((entry, index) => normalizeExternalLink(entry, `Preview ${index + 1}`))
      .filter(Boolean),
    share: normalizeExternalLink(payload?.share ?? payload?.shareLink ?? payload?.links?.share ?? null, 'Read-only share'),
  };
}

export function currentSessionRemoteLinks(session) {
  return {
    previews: Array.isArray(session?.remoteLinks?.previews)
      ? session.remoteLinks.previews
          .map((entry, index) => normalizeExternalLink(entry, `Preview ${index + 1}`))
          .filter(Boolean)
      : [],
    share: normalizeExternalLink(session?.remoteLinks?.share ?? null, 'Read-only share'),
  };
}
