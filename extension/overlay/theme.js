/**
 * Identité visuelle TrackVint — alignée ResellTrack (noir + lime).
 */

export const THEME = {
  name: 'TrackVint',
  bg: '#000000',
  surface: '#0a0a0a',
  surfaceRaised: '#111111',
  surfaceCard: '#1a1a1a',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.62)',
  textDim: 'rgba(255, 255, 255, 0.42)',
  accent: '#92ef4a',
  accentSoft: 'rgba(146, 239, 74, 0.1)',
  accentStrong: '#7ad636',
  onAccent: '#0b1702',
  danger: '#ff5c7a',
  dangerSoft: 'rgba(255, 92, 122, 0.12)',
  warn: '#f0b429',
  info: '#6aa8ff',
  infoSoft: 'rgba(59, 130, 246, 0.12)',
  font: 'ui-sans-serif, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, Menlo, monospace',
  radius: '14px',
  radiusSm: '10px',
};

export function themeCssVariables() {
  return `
:host {
  --tv-bg: ${THEME.bg};
  --tv-surface: ${THEME.surface};
  --tv-raised: ${THEME.surfaceRaised};
  --tv-card: ${THEME.surfaceCard};
  --tv-border: ${THEME.border};
  --tv-text: ${THEME.text};
  --tv-muted: ${THEME.textMuted};
  --tv-dim: ${THEME.textDim};
  --tv-accent: ${THEME.accent};
  --tv-accent-soft: ${THEME.accentSoft};
  --tv-accent-strong: ${THEME.accentStrong};
  --tv-on-accent: ${THEME.onAccent};
  --tv-danger: ${THEME.danger};
  --tv-danger-soft: ${THEME.dangerSoft};
  --tv-warn: ${THEME.warn};
  --tv-info: ${THEME.info};
  --tv-info-soft: ${THEME.infoSoft};
  --tv-font: ${THEME.font};
  --tv-mono: ${THEME.mono};
  --tv-radius: ${THEME.radius};
  --tv-radius-sm: ${THEME.radiusSm};
  --tv-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--tv-border);
  all: initial;
  font-family: var(--tv-font);
  color: var(--tv-text);
  -webkit-font-smoothing: antialiased;
}
`;
}
