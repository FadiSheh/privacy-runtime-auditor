import PDFDocument from 'pdfkit';

import type { CompletedScan } from '@pra/shared';

export interface RenderedPdf {
  filename: string;
  contentType: 'application/pdf';
  buffer: Buffer;
}

export async function renderPdfReport(report: CompletedScan): Promise<RenderedPdf> {
  const document = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on('data', (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
    document.on('end', () => {
      resolve({
        filename: `pra-report-${report.scanId}.pdf`,
        contentType: 'application/pdf',
        buffer: Buffer.concat(chunks),
      });
    });
    document.on('error', reject);

    document.fontSize(22).text('Privacy Runtime Auditor', { align: 'left' });
    document.moveDown(0.5);
    document.fontSize(12).text(`Root URL: ${report.rootUrl}`);
    document.text(`Scan ID: ${report.scanId}`);
    document.text(`Overall score: ${report.scores.overall}`);
    document.text(`Risk level: ${report.riskLevel}`);
    document.text(`Privacy-dependent trackers: ${report.privacyDependentTrackers.length}`);
    document.text(`Ad trackers: ${report.privacySignals.adTrackers.count}`);
    document.text(`Third-party cookies: ${report.privacySignals.thirdPartyCookies.count}`);
    document.moveDown();
    document.fontSize(16).text('Top Findings');
    document.moveDown(0.5);

    for (const finding of report.findings.slice(0, 10)) {
      document.fontSize(12).text(`${finding.ruleCode} · ${finding.severity.toUpperCase()} · ${finding.title}`);
      document.fontSize(10).text(finding.summary);
      document.moveDown(0.5);
    }

    document.addPage();
    document.fontSize(16).text('Privacy-Dependent Trackers');
    document.moveDown(0.5);

    if (report.privacyDependentTrackers.length === 0) {
      document.fontSize(10).text('No tracker changed behavior across the completed consent scenarios.');
    } else {
      for (const tracker of report.privacyDependentTrackers.slice(0, 10)) {
        document.fontSize(12).text(`${tracker.trackerLabel} · ${tracker.pageUrl}`);
        document
          .fontSize(10)
          .text(`Active: ${tracker.activeScenarios.join(', ')} · Inactive: ${tracker.inactiveScenarios.join(', ')}`);
        document.moveDown(0.5);
      }
    }

    document.addPage();
    document.fontSize(16).text('Privacy Signals');
    document.moveDown(0.5);

    [
      ['Ad trackers', report.privacySignals.adTrackers.summary],
      ['Third-party cookies', report.privacySignals.thirdPartyCookies.summary],
      ['Cookie blocker evasion', report.privacySignals.cookieBlockerEvasion.summary],
      ['Canvas fingerprinting', report.privacySignals.canvasFingerprinting.summary],
      ['Session recorders', report.privacySignals.sessionRecorders.summary],
      ['Keystroke capture', report.privacySignals.keystrokeCapture.summary],
      ['Facebook Pixel', report.privacySignals.facebookPixel.summary],
      ['TikTok Pixel', report.privacySignals.tiktokPixel.summary],
      ['X Pixel', report.privacySignals.xPixel.summary],
      ['GA remarketing', report.privacySignals.googleAnalyticsRemarketing.summary],
    ].forEach(([label, value]) => {
      document.fontSize(12).text(`${label}: ${value}`);
      document.moveDown(0.35);
    });

    document.addPage();
    document.fontSize(16).text('Scanned Pages');
    document.moveDown(0.5);

    for (const page of report.pages) {
      document.fontSize(12).text(`${page.pageKind.toUpperCase()} · ${page.url}`);
      document.fontSize(10).text(`Scenarios: ${page.scenarioResults.map((result) => result.scenarioType).join(', ')}`);
      document.moveDown(0.5);
    }

    document.end();
  });
}

export function renderJsonReport(report: CompletedScan) {
  return JSON.stringify(report, null, 2);
}