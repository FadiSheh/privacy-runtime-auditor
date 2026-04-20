import { load } from 'cheerio';

import type { PolicyExtract, PolicyPage, RuntimeArtifact, VendorCategory } from '@pra/shared';

const policyLinkMatchers = [/privacy/i, /cookie/i, /policy/i, /preferences/i];
const categoryMatchers: Array<{ category: VendorCategory; pattern: RegExp }> = [
  { category: 'analytics', pattern: /analytics|measurement|metrics/i },
  { category: 'advertising', pattern: /advertising|marketing|remarketing|targeting/i },
  { category: 'social', pattern: /social|sharing/i },
  { category: 'functional', pattern: /functional|preference/i },
  { category: 'essential', pattern: /essential|strictly necessary|necessary/i },
];

export function discoverPolicyLinks(html: string, baseUrl: string): Array<{ type: 'privacy' | 'cookie'; url: string }> {
  const $ = load(html);
  const links = new Map<string, 'privacy' | 'cookie'>();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    if (!href) {
      return;
    }

    const absoluteUrl = new URL(href, baseUrl).toString();
    const haystack = `${href} ${text}`;
    const matched = policyLinkMatchers.some((pattern) => pattern.test(haystack));

    if (matched) {
      links.set(absoluteUrl, /cookie/i.test(haystack) ? 'cookie' : 'privacy');
    }
  });

  return Array.from(links.entries()).map(([url, type]) => ({ url, type }));
}

export function extractPolicySummary(html: string): PolicyExtract {
  const $ = load(html);
  const rawText = $('body').text().replace(/\s+/g, ' ').trim();
  const headings = $('h1, h2, h3')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(Boolean);
  const categories = categoryMatchers
    .filter(({ pattern }) => pattern.test(rawText))
    .map(({ category }) => category);
  const retentionStatements = sentences.filter((sentence) => /retain|retention|store for/i.test(sentence));
  const consentStatements = sentences.filter((sentence) => /consent|opt-?out|reject|preferences/i.test(sentence));

  const vendors = Array.from(
    new Set(
      sentences
        .filter((sentence) => /google|meta|facebook|doubleclick|hotjar|analytics/i.test(sentence))
        .flatMap((sentence) => {
          const matches = sentence.match(/Google Analytics|Google|Meta|Facebook|DoubleClick|Hotjar/gi);
          return matches ?? [];
        }),
    ),
  );

  const purposes = sentences.filter((sentence) => /purpose|use.*data|measure|advertis|analy/i.test(sentence)).slice(0, 10);

  return {
    headings,
    rawText,
    vendors,
    categories,
    purposes,
    retentionStatements,
    consentStatements,
  };
}

export interface PolicyRuntimeMismatch {
  runtimeOnlyVendors: string[];
  declaredButUnobservedVendors: string[];
  categoryMismatches: string[];
}

export function diffPolicyAgainstRuntime(policies: PolicyPage[], artifacts: RuntimeArtifact[]): PolicyRuntimeMismatch {
  const declaredVendors = new Set(
    policies.flatMap((policy) => policy.extracted.vendors.map((vendor) => vendor.toLowerCase())),
  );
  const declaredCategories = new Set(
    policies.flatMap((policy) => policy.extracted.categories.map((category) => category.toLowerCase())),
  );
  const runtimeVendors = new Set(
    artifacts.map((artifact) => artifact.vendorName?.toLowerCase()).filter((value): value is string => Boolean(value)),
  );
  const runtimeCategories = new Set(
    artifacts.map((artifact) => artifact.category?.toLowerCase()).filter((value): value is string => Boolean(value)),
  );

  return {
    runtimeOnlyVendors: Array.from(runtimeVendors).filter((vendor) => !declaredVendors.has(vendor)),
    declaredButUnobservedVendors: Array.from(declaredVendors).filter((vendor) => !runtimeVendors.has(vendor)),
    categoryMismatches: Array.from(runtimeCategories).filter((category) => !declaredCategories.has(category)),
  };
}