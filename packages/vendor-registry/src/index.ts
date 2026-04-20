import type { VendorCategory, VendorRegistryEntry } from '@pra/shared';

const registry: VendorRegistryEntry[] = [
  {
    id: 'vendor_google_analytics',
    canonicalName: 'Google Analytics',
    aliases: ['GA4', 'Google tag manager'],
    domains: ['google-analytics.com', 'googletagmanager.com'],
    defaultCategory: 'analytics',
    notes: 'Google Analytics and tag manager assets.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_doubleclick',
    canonicalName: 'Google Ads / DoubleClick',
    aliases: ['DoubleClick', 'Google Ads'],
    domains: ['doubleclick.net', 'googleadservices.com'],
    defaultCategory: 'advertising',
    notes: 'Advertising and remarketing endpoints.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_meta',
    canonicalName: 'Meta',
    aliases: ['Facebook', 'Meta Pixel'],
    domains: ['facebook.net', 'connect.facebook.net', 'facebook.com'],
    defaultCategory: 'advertising',
    notes: 'Meta tracking and social assets.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_hotjar',
    canonicalName: 'Hotjar',
    aliases: ['Hotjar'],
    domains: ['hotjar.com', 'static.hotjar.com'],
    defaultCategory: 'analytics',
    notes: 'Heatmap and session replay tooling.',
    confidenceRules: ['domain-match'],
  },
];

export interface ClassifiedVendor {
  vendorId: string | null;
  vendorName: string;
  category: VendorCategory;
  confidence: number;
  source: 'domain-match' | 'unknown';
}

export function getVendorRegistry(): VendorRegistryEntry[] {
  return registry;
}

export function classifyVendorByHost(hostname: string): ClassifiedVendor {
  const normalized = hostname.toLowerCase();

  for (const vendor of registry) {
    const matchedDomain = vendor.domains.find((domain) => normalized === domain || normalized.endsWith(`.${domain}`));

    if (matchedDomain) {
      return {
        vendorId: vendor.id,
        vendorName: vendor.canonicalName,
        category: vendor.defaultCategory,
        confidence: 0.98,
        source: 'domain-match',
      };
    }
  }

  return {
    vendorId: null,
    vendorName: 'Unknown vendor',
    category: 'unknown',
    confidence: 0.1,
    source: 'unknown',
  };
}