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
    document.moveDown();
    document.fontSize(16).text('Top Findings');
    document.moveDown(0.5);

    for (const finding of report.findings.slice(0, 10)) {
      document.fontSize(12).text(`${finding.ruleCode} · ${finding.severity.toUpperCase()} · ${finding.title}`);
      document.fontSize(10).text(finding.summary);
      document.moveDown(0.5);
    }

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