import type { PageScanResult, PrivacySignalCheck, PrivacySignalsSummary, RuntimeArtifact } from '@pra/shared';

const SESSION_RECORDER_VENDORS = new Set([
  'vendor_hotjar',
  'vendor_fullstory',
  'vendor_mouseflow',
  'vendor_contentsquare',
  'vendor_crazy_egg',
  'vendor_lucky_orange',
]);

const IDENTIFIER_PARAM_PATTERN = /^(gclid|fbclid|msclkid|ttclid|twclid|_gl|uid|user_?id|visitor_?id|device_?id|fingerprint|session_?id|cid|guid|uuid|partner_?id|adid|match|sync)$/i;
const CANVAS_METHOD_PATTERN = /(canvas\.(toDataURL|toBlob|getImageData|measureText)|webgl\.(getParameter|readPixels|getSupportedExtensions))/i;
const KEYSTROKE_EVENT_PATTERN = /^(keydown|keyup|keypress|beforeinput|input|change)$/i;
const FACEBOOK_PIXEL_PATTERN = /(connect\.facebook\.net\/.*fbevents\.js|facebook\.com\/tr\?|fbq\()/i;
const TIKTOK_PIXEL_PATTERN = /(analytics\.tiktok\.com|tiktok\.pixels\.tiktok\.com|ttq\.|ttq\()/i;
const X_PIXEL_PATTERN = /(analytics\.twitter\.com|static\.ads-twitter\.com|platform\.twitter\.com|twq\()/i;
const REMARKETING_PATTERN = /(googleadservices\.com|doubleclick\.net|ads\/ga-audiences|remarketing|allow_ad_personalization_signals|gclid|dma=|npa=0)/i;
const TRACKING_CATEGORY_PATTERN = /^(analytics|advertising|marketing|social)$/;
const TRACKING_ENDPOINT_PATTERN = /\/(collect|track|tracking|pixel|beacon|event|events|conversion|remarketing|audience|analytics|ads?|sync|match)(\/|$|\?)/i;
const STATIC_RESOURCE_TYPES = new Set(['document', 'stylesheet', 'image', 'media', 'font']);
const STATIC_EXTENSION_PATTERN = /\.(avif|css|gif|ico|jpe?g|js|map|mjs|mp4|png|svg|webm|webp|woff2?|ttf|otf)(\?|$)/i;

function flattenArtifacts(pages: PageScanResult[]): RuntimeArtifact[] {
  return pages.flatMap((page) => page.scenarioResults.flatMap((scenario) => scenario.artifacts));
}

function uniq(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function toCheck(detected: boolean, summary: string, entities: string[] = [], evidence: string[] = []): PrivacySignalCheck {
  return {
    detected,
    summary,
    count: entities.length,
    entities,
    evidence,
  };
}

function artifactLabel(artifact: RuntimeArtifact): string {
  return artifact.vendorName ?? artifact.domain ?? artifact.name ?? artifact.id;
}

function artifactLocator(artifact: RuntimeArtifact): string {
  return artifact.url ?? `${artifact.artifactType}:${artifact.domain ?? artifact.name ?? artifact.id}`;
}

function hasIdentifierSignal(artifact: RuntimeArtifact): boolean {
  if (artifact.artifactType !== 'request') {
    return false;
  }

  const identifierNames = [
    ...getUrlParameterNames(artifact.url),
    ...getFormEncodedParameterNames(typeof artifact.raw.postData === 'string' ? artifact.raw.postData : ''),
  ];

  return identifierNames.some((name) => IDENTIFIER_PARAM_PATTERN.test(name));
}

function getUrlParameterNames(url: string | null): string[] {
  if (!url) {
    return [];
  }

  try {
    return Array.from(new URL(url).searchParams.keys());
  } catch {
    return [];
  }
}

function getFormEncodedParameterNames(value: string): string[] {
  if (!value || !value.includes('=')) {
    return [];
  }

  try {
    return Array.from(new URLSearchParams(value).keys());
  } catch {
    return [];
  }
}

function isStaticContentRequest(artifact: RuntimeArtifact): boolean {
  if (artifact.artifactType !== 'request') {
    return false;
  }

  const resourceType = typeof artifact.raw.resourceType === 'string' ? artifact.raw.resourceType : '';
  const responseHeaders = typeof artifact.raw.responseHeaders === 'object' && artifact.raw.responseHeaders !== null
    ? artifact.raw.responseHeaders as Record<string, unknown>
    : {};
  const contentType = String(responseHeaders['content-type'] ?? responseHeaders['Content-Type'] ?? '');

  return (
    STATIC_RESOURCE_TYPES.has(resourceType) ||
    STATIC_EXTENSION_PATTERN.test(artifact.url ?? '') ||
    /^(image|font|text\/css|video|audio)\//i.test(contentType)
  );
}

function isTrackingLikeArtifact(artifact: RuntimeArtifact): boolean {
  const category = artifact.category ?? 'unknown';
  if (TRACKING_CATEGORY_PATTERN.test(category)) {
    return true;
  }

  if (artifact.artifactType !== 'request') {
    return false;
  }

  return TRACKING_ENDPOINT_PATTERN.test(artifact.url ?? '');
}

function isCookieBlockerEvasionCandidate(artifact: RuntimeArtifact): boolean {
  if (!isTrackingLikeArtifact(artifact)) {
    return false;
  }

  if (isStaticContentRequest(artifact) && !TRACKING_CATEGORY_PATTERN.test(artifact.category ?? 'unknown')) {
    return false;
  }

  return true;
}

function hasRemarketingSignal(artifact: RuntimeArtifact): boolean {
  const haystack = [artifact.url, artifact.name, typeof artifact.raw.postData === 'string' ? artifact.raw.postData : '']
    .filter(Boolean)
    .join(' ');

  return REMARKETING_PATTERN.test(haystack);
}

function detectSpecificPixel(
  artifacts: RuntimeArtifact[],
  predicate: (artifact: RuntimeArtifact) => boolean,
  foundMessage: (entities: string[]) => string,
  notFoundMessage: string,
): PrivacySignalCheck {
  const matches = artifacts.filter(predicate);
  const entities = uniq(matches.map(artifactLabel));
  const evidence = uniq(matches.map(artifactLocator)).slice(0, 10);

  return toCheck(
    entities.length > 0,
    entities.length > 0 ? foundMessage(entities) : notFoundMessage,
    entities,
    evidence,
  );
}

export function summarizePrivacySignals(pages: PageScanResult[]): PrivacySignalsSummary {
  const artifacts = flattenArtifacts(pages);

  const adTrackerArtifacts = artifacts.filter(
    (artifact) =>
      !artifact.firstParty &&
      artifact.category === 'advertising' &&
      (artifact.artifactType === 'request' || artifact.artifactType === 'script' || artifact.artifactType === 'iframe'),
  );
  const adTrackers = uniq(adTrackerArtifacts.map(artifactLabel));

  const thirdPartyCookieArtifacts = artifacts.filter((artifact) => artifact.artifactType === 'cookie' && artifact.firstParty === false);
  const thirdPartyCookies = uniq(
    thirdPartyCookieArtifacts.map((artifact) => `${artifact.name ?? 'cookie'} @ ${artifact.domain ?? 'unknown-domain'}`),
  );

  const storageArtifacts = artifacts.filter(
    (artifact) =>
      (artifact.artifactType === 'local-storage' || artifact.artifactType === 'session-storage' || artifact.artifactType === 'indexed-db') &&
      isCookieBlockerEvasionCandidate(artifact),
  );
  const storageSignals = uniq(storageArtifacts.map((artifact) => `${artifact.artifactType}:${artifact.name ?? artifact.domain ?? artifact.id}`));

  const etagArtifacts = artifacts.filter(
    (artifact) =>
      artifact.artifactType === 'request' &&
      isCookieBlockerEvasionCandidate(artifact) &&
      typeof artifact.raw.responseHeaders === 'object' &&
      artifact.raw.responseHeaders !== null &&
      'etag' in (artifact.raw.responseHeaders as Record<string, unknown>),
  );
  const cnameArtifacts = artifacts.filter(
    (artifact) =>
      artifact.firstParty === true &&
      Boolean(artifact.vendorId) &&
      (artifact.category === 'advertising' || artifact.category === 'analytics' || artifact.category === 'social'),
  );
  const identifierArtifacts = artifacts.filter((artifact) => isCookieBlockerEvasionCandidate(artifact) && hasIdentifierSignal(artifact));
  const syncArtifacts = artifacts.filter(
    (artifact) => artifact.artifactType === 'request' && isCookieBlockerEvasionCandidate(artifact) && /sync|redirect|match/i.test(artifact.url ?? ''),
  );

  const cookieBlockerSignals = uniq([
    ...storageSignals.map((signal) => `storage:${signal}`),
    ...etagArtifacts.map((artifact) => `etag:${artifactLocator(artifact)}`),
    ...cnameArtifacts.map((artifact) => `cname:${artifact.domain}`),
    ...identifierArtifacts.map((artifact) => `identifier:${artifactLocator(artifact)}`),
    ...syncArtifacts.map((artifact) => `sync:${artifactLocator(artifact)}`),
  ]);

  const canvasArtifacts = artifacts.filter(
    (artifact) =>
      (artifact.artifactType === 'browser-api' && CANVAS_METHOD_PATTERN.test(artifact.name ?? '')) ||
      /fingerprint/i.test(artifact.url ?? '') ||
      /fingerprint/i.test(artifact.name ?? ''),
  );
  const canvasEntities = uniq(canvasArtifacts.map(artifactLabel));

  const sessionRecorderArtifacts = artifacts.filter(
    (artifact) => SESSION_RECORDER_VENDORS.has(artifact.vendorId ?? '') || /hotjar|fullstory|mouseflow|contentsquare|crazy egg|lucky orange/i.test(artifact.vendorName ?? artifact.name ?? ''),
  );
  const sessionRecorders = uniq(sessionRecorderArtifacts.map(artifactLabel));

  const keystrokeArtifacts = artifacts.filter(
    (artifact) =>
      (artifact.artifactType === 'event-listener' && KEYSTROKE_EVENT_PATTERN.test(artifact.name ?? '')) ||
      Boolean(artifact.raw.transmittedDuringInput) ||
      Boolean(artifact.raw.capturesKeystrokes),
  );
  const keystrokeSignals = uniq(keystrokeArtifacts.map(artifactLabel));

  const googleRemarketingArtifacts = artifacts.filter(
    (artifact) =>
      artifact.vendorId === 'vendor_google_analytics' ||
      artifact.vendorId === 'vendor_doubleclick' ||
      hasRemarketingSignal(artifact),
  ).filter(hasRemarketingSignal);
  const googleRemarketingEntities = uniq(googleRemarketingArtifacts.map(artifactLabel));

  return {
    adTrackers: toCheck(
      adTrackers.length > 0,
      adTrackers.length > 0 ? `${adTrackers.length} ad trackers found` : '0 ad trackers found',
      adTrackers,
      uniq(adTrackerArtifacts.map(artifactLocator)).slice(0, 10),
    ),
    thirdPartyCookies: toCheck(
      thirdPartyCookies.length > 0,
      thirdPartyCookies.length > 0 ? `${thirdPartyCookies.length} third-party cookies found` : '0 third-party cookies found',
      thirdPartyCookies,
      uniq(thirdPartyCookieArtifacts.map(artifactLocator)).slice(0, 10),
    ),
    cookieBlockerEvasion: toCheck(
      cookieBlockerSignals.length > 0,
      cookieBlockerSignals.length > 0
        ? `Potential tracking that evades cookie blockers was detected via ${cookieBlockerSignals.length} signal(s).`
        : "Tracking that evades cookie blockers wasn't found.",
      cookieBlockerSignals,
      cookieBlockerSignals.slice(0, 10),
    ),
    canvasFingerprinting: toCheck(
      canvasEntities.length > 0,
      canvasEntities.length > 0 ? `Canvas fingerprinting detected via ${canvasEntities.join(', ')}.` : 'Canvas fingerprinting was not detected',
      canvasEntities,
      uniq(canvasArtifacts.map(artifactLocator)).slice(0, 10),
    ),
    sessionRecorders: toCheck(
      sessionRecorders.length > 0,
      sessionRecorders.length > 0 ? `Session recording services found: ${sessionRecorders.join(', ')}.` : 'Session recording services not found',
      sessionRecorders,
      uniq(sessionRecorderArtifacts.map(artifactLocator)).slice(0, 10),
    ),
    keystrokeCapture: toCheck(
      keystrokeSignals.length > 0,
      keystrokeSignals.length > 0 ? `Potential keystroke capture detected via ${keystrokeSignals.join(', ')}.` : 'We did not find this website capturing keystrokes.',
      keystrokeSignals,
      uniq(keystrokeArtifacts.map(artifactLocator)).slice(0, 10),
    ),
    facebookPixel: detectSpecificPixel(
      artifacts,
      (artifact) => artifact.vendorId === 'vendor_meta' && FACEBOOK_PIXEL_PATTERN.test(`${artifact.url ?? ''} ${artifact.name ?? ''}`),
      (entities) => `Facebook Pixel found via ${entities.join(', ')}.`,
      'Facebook Pixel not found',
    ),
    tiktokPixel: detectSpecificPixel(
      artifacts,
      (artifact) => artifact.vendorId === 'vendor_tiktok' && TIKTOK_PIXEL_PATTERN.test(`${artifact.url ?? ''} ${artifact.name ?? ''}`),
      (entities) => `TikTok Pixel found via ${entities.join(', ')}.`,
      'TikTok Pixel not found',
    ),
    xPixel: detectSpecificPixel(
      artifacts,
      (artifact) => artifact.vendorId === 'vendor_twitter' && X_PIXEL_PATTERN.test(`${artifact.url ?? ''} ${artifact.name ?? ''}`),
      (entities) => `X Pixel found via ${entities.join(', ')}.`,
      'X Pixel not found',
    ),
    googleAnalyticsRemarketing: toCheck(
      googleRemarketingEntities.length > 0,
      googleRemarketingEntities.length > 0
        ? `Google Analytics remarketing signals found via ${googleRemarketingEntities.join(', ')}.`
        : "Google Analytics 'remarketing audiences' feature not found.",
      googleRemarketingEntities,
      uniq(googleRemarketingArtifacts.map(artifactLocator)).slice(0, 10),
    ),
  };
}
