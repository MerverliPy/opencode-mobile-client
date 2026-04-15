export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-6)}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function compactText(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function trimText(value, maxLength = 96) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function slugifySegment(value) {
  return (
    compactText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'mobile-output'
  );
}

export function formatSessionTime(timestamp) {
  const value = Number(timestamp);

  if (!Number.isFinite(value)) {
    return 'recently';
  }

  const elapsed = Date.now() - value;

  if (elapsed < 60_000) {
    return 'just now';
  }

  if (elapsed < 3_600_000) {
    return `${Math.max(1, Math.round(elapsed / 60_000))}m ago`;
  }

  if (elapsed < 86_400_000) {
    return `${Math.max(1, Math.round(elapsed / 3_600_000))}h ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}
