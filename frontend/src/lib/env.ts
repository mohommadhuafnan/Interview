function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Vercel Services: use same-origin rewrites (/api -> /_/backend/api)
  if (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL) {
    return '';
  }
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:8000';
}

function resolveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/_/backend`;
  }
  return 'ws://localhost:8000';
}

export const API_BASE = resolveApiUrl();
export const WS_BASE = resolveWsUrl();
