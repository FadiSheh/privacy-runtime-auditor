import { expect, test } from '@playwright/test';

const runningStatus = {
  scanId: 'scan_demo',
  status: 'running',
  progress: 35,
  progressPrecise: 35,
  pageCount: 4,
  completedScenarios: 5,
  totalScenarios: 16,
  currentActivity: {
    phase: 'REPLAY',
    message: 'Scanning fixture pages',
  },
};

const completedStatus = {
  ...runningStatus,
  status: 'completed',
  progress: 100,
  completedScenarios: 16,
};

const report = {
  scanId: 'scan_demo',
  projectId: 'project_demo',
  rootUrl: 'https://example.com/',
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  scores: {
    overall: 62,
    preConsentBehavior: 50,
    consentUx: 65,
    runtimeBlockingEffectiveness: 58,
    policyRuntimeAlignment: 68,
    regressionStability: 90,
  },
  riskLevel: 'elevated',
  findings: [
    {
      id: 'finding_1',
      ruleCode: 'R001',
      severity: 'high',
      title: 'Non-essential tracking before consent',
      summary: 'Analytics and advertising activity was observed before consent.',
      description: 'Before consent the site loaded analytics.',
      remediation: 'Delay non-essential tags until consent.',
      evidence: [{ label: 'analytics.js', type: 'request' }],
    },
  ],
  pages: [
    {
      url: 'https://example.com/',
      pageKind: 'homepage',
      scenarioResults: [
        {
          scenarioType: 'no-consent',
          status: 'completed',
          screenshotPath: '/tmp/scan.png',
          consent: {
            present: true,
            rejectVisible: false,
            granularControlsPresent: true,
            bannerText: 'Cookie choices',
            limitations: [],
          },
          artifacts: [
            {
              id: 'artifact_1',
              artifactType: 'request',
              vendorName: 'Meta',
              category: 'advertising',
              domain: 'connect.facebook.net',
              url: 'https://connect.facebook.net/en_US/fbevents.js',
            },
          ],
        },
      ],
    },
  ],
  policies: [
    {
      type: 'privacy',
      url: 'https://example.com/privacy',
      extracted: {
        vendors: ['Google Analytics'],
        categories: ['analytics'],
        consentStatements: ['We ask for consent before analytics cookies.'],
      },
    },
  ],
  privacySignals: {
    adTrackers: { detected: true, summary: 'Advertising tracker found', count: 1, entities: ['Meta'], evidence: ['artifact_1'] },
    thirdPartyCookies: { detected: false, summary: 'Third-party cookies not found', count: 0, entities: [], evidence: [] },
    cookieBlockerEvasion: { detected: false, summary: 'Cookie-blocker evasion not found', count: 0, entities: [], evidence: [] },
    canvasFingerprinting: { detected: false, summary: 'Canvas fingerprinting not found', count: 0, entities: [], evidence: [] },
    sessionRecorders: { detected: false, summary: 'Session recorders not found', count: 0, entities: [], evidence: [] },
    keystrokeCapture: { detected: false, summary: 'Keystroke capture not found', count: 0, entities: [], evidence: [] },
    facebookPixel: { detected: true, summary: 'Facebook Pixel found', count: 1, entities: ['Meta'], evidence: ['artifact_1'] },
    tiktokPixel: { detected: false, summary: 'TikTok Pixel not found', count: 0, entities: [], evidence: [] },
    xPixel: { detected: false, summary: 'X Pixel not found', count: 0, entities: [], evidence: [] },
    googleAnalyticsRemarketing: { detected: false, summary: 'GA remarketing not found', count: 0, entities: [], evidence: [] },
  },
  diff: {
    newVendors: ['Meta'],
    newCookies: ['meta_pixel'],
    newFailures: ['R001'],
    resolvedFindings: [],
  },
  limitations: [],
};

test('user can start a scan and view the final report', async ({ page }) => {
  let statusChecks = 0;

  await page.route('http://127.0.0.1:3999/projects', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({
      status: 201,
      json: {
        id: 'project_demo',
        name: 'Primary Website',
        rootUrl: 'https://example.com/',
        defaultLocale: 'en',
        defaultRegion: 'eu',
        createdAt: new Date().toISOString(),
      },
    });
  });

  await page.route('http://127.0.0.1:3999/projects/project_demo/scans', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'scan_demo', status: 'queued' } });
  });

  await page.route('http://127.0.0.1:3999/scans/scan_demo/status', async (route) => {
    statusChecks += 1;
    await route.fulfill({ json: statusChecks > 1 ? completedStatus : runningStatus });
  });

  await page.route('http://127.0.0.1:3999/scans/scan_demo/report.json', async (route) => {
    await route.fulfill({ json: report });
  });

  await page.goto('/');
  await page.getByLabel('Project name').fill('Primary Website');
  await page.getByLabel('Root URL').fill('https://example.com');
  await page.getByRole('button', { name: /START AUDIT/ }).click();

  await expect(page).toHaveURL(/\/scans\/scan_demo/);
  await expect(page.getByText('Audit report · https://example.com/')).toBeVisible();
  await expect(page.getByText('Findings (1)')).toBeVisible();
  await expect(page.getByText('Non-essential tracking before consent')).toBeVisible();
  await expect(page.getByText(/^Meta$/).first()).toBeVisible();
});
