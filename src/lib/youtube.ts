export function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Allow direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_-]{6,40}$/.test(id) ? id : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{6,40}$/.test(vParam)) {
        return vParam;
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
        const candidate = segments[1];
        return /^[a-zA-Z0-9_-]{6,40}$/.test(candidate) ? candidate : '';
      }
    }
  } catch {
    return '';
  }

  return '';
}

export function getYoutubeThumbnailUrl(youtubeId: string): string {
  if (!youtubeId) return '';
  return `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
}

export function getYoutubeEmbedUrl(youtubeId: string): string {
  if (!youtubeId) return '';
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=0&rel=0`;
}
