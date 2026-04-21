import type { VendorCategory, VendorRegistryEntry } from '@pra/shared';

const registry: VendorRegistryEntry[] = [
  // Analytics & Behavior Tracking
  {
    id: 'vendor_google_analytics',
    canonicalName: 'Google Analytics',
    aliases: ['GA4', 'Google tag manager', 'Universal Analytics'],
    domains: ['google-analytics.com', 'googletagmanager.com', 'analytics.google.com', 'www.googletagmanager.com'],
    defaultCategory: 'analytics',
    notes: 'Google Analytics and tag manager assets.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_hotjar',
    canonicalName: 'Hotjar',
    aliases: ['Hotjar'],
    domains: ['hotjar.com', 'static.hotjar.com', 'vars.hotjar.com'],
    defaultCategory: 'analytics',
    notes: 'Heatmap and session replay tooling.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_mixpanel',
    canonicalName: 'Mixpanel',
    aliases: ['Mixpanel'],
    domains: ['mixpanel.com', 'api.mixpanel.com', 'api-js.mixpanel.com'],
    defaultCategory: 'analytics',
    notes: 'Product analytics and user behavior tracking.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_amplitude',
    canonicalName: 'Amplitude',
    aliases: ['Amplitude'],
    domains: ['amplitude.com', 'api.amplitude.com', 'api2.amplitude.com'],
    defaultCategory: 'analytics',
    notes: 'Product and behavioral analytics platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_segment',
    canonicalName: 'Segment',
    aliases: ['Segment'],
    domains: ['segment.com', 'api.segment.com', 'cdn.segment.com'],
    defaultCategory: 'analytics',
    notes: 'Customer data platform and analytics hub.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_intercom',
    canonicalName: 'Intercom',
    aliases: ['Intercom'],
    domains: ['intercom.io', 'widget.intercom.io', 'js.intercomcdn.com'],
    defaultCategory: 'analytics',
    notes: 'Customer communication and support platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_crazy_egg',
    canonicalName: 'Crazy Egg',
    aliases: ['Crazy Egg'],
    domains: ['crazyegg.com', 'script.crazyegg.com', 'd3ey6hztolqozi.cloudfront.net'],
    defaultCategory: 'analytics',
    notes: 'Heatmap and session recording tool.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_lucky_orange',
    canonicalName: 'Lucky Orange',
    aliases: ['Lucky Orange'],
    domains: ['luckyorange.com', 'app.luckyorange.com'],
    defaultCategory: 'analytics',
    notes: 'Session replay and heatmapping platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_fullstory',
    canonicalName: 'FullStory',
    aliases: ['FullStory'],
    domains: ['fullstory.com', 'fs.zendesk.com', 'rs.fullstory.com'],
    defaultCategory: 'analytics',
    notes: 'Digital experience analytics platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_databox',
    canonicalName: 'Databox',
    aliases: ['Databox'],
    domains: ['databox.com', 'api.databox.com'],
    defaultCategory: 'analytics',
    notes: 'Business analytics and reporting platform.',
    confidenceRules: ['domain-match'],
  },

  // Advertising & Retargeting
  {
    id: 'vendor_doubleclick',
    canonicalName: 'Google Ads / DoubleClick',
    aliases: ['DoubleClick', 'Google Ads', 'Google DFP'],
    domains: ['doubleclick.net', 'googleadservices.com', 'google.com', 'pagead2.googlesyndication.com'],
    defaultCategory: 'advertising',
    notes: 'Advertising and remarketing endpoints.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_meta',
    canonicalName: 'Meta',
    aliases: ['Facebook', 'Meta Pixel', 'Facebook Pixel'],
    domains: ['facebook.net', 'connect.facebook.net', 'facebook.com', 'graph.facebook.com'],
    defaultCategory: 'advertising',
    notes: 'Meta tracking and social assets.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_adroll',
    canonicalName: 'AdRoll',
    aliases: ['AdRoll', 'RollupFlip'],
    domains: ['adroll.com', 'ib.adnxs.com', 'rlcdn.com'],
    defaultCategory: 'advertising',
    notes: 'Retargeting and digital advertising platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_criteo',
    canonicalName: 'Criteo',
    aliases: ['Criteo'],
    domains: ['criteo.com', 'criteo.net', 'crtg.net'],
    defaultCategory: 'advertising',
    notes: 'Performance marketing and retargeting platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_quantcast',
    canonicalName: 'Quantcast',
    aliases: ['Quantcast'],
    domains: ['quantcast.com', 'q.quora.com'],
    defaultCategory: 'advertising',
    notes: 'Audience targeting and data platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_outbrain',
    canonicalName: 'Outbrain',
    aliases: ['Outbrain'],
    domains: ['outbrain.com', 'widgets.outbrain.com'],
    defaultCategory: 'advertising',
    notes: 'Content discovery and native advertising platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_taboola',
    canonicalName: 'Taboola',
    aliases: ['Taboola'],
    domains: ['taboola.com', 'trc.taboola.com'],
    defaultCategory: 'advertising',
    notes: 'Content recommendation and native advertising.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_appnexus',
    canonicalName: 'AppNexus / Xandr',
    aliases: ['AppNexus', 'Xandr'],
    domains: ['appnexus.com', 'ib.adnxs.com', 'adnxs.com'],
    defaultCategory: 'advertising',
    notes: 'Supply-side advertising platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_amazon_ads',
    canonicalName: 'Amazon Advertising',
    aliases: ['Amazon Ads', 'Amazon DSP'],
    domains: ['amazon-adsystem.com', 'amazon.com'],
    defaultCategory: 'advertising',
    notes: 'Amazon advertising and DSP platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_rubicon',
    canonicalName: 'Rubicon Project',
    aliases: ['Rubicon Project', 'Magnite'],
    domains: ['rubiconproject.com', 'fastlane.rubiconproject.com'],
    defaultCategory: 'advertising',
    notes: 'Real-time bidding and programmatic advertising.',
    confidenceRules: ['domain-match'],
  },

  // Social Media & Sharing
  {
    id: 'vendor_twitter',
    canonicalName: 'Twitter / X',
    aliases: ['Twitter', 'X', 'Twitter Pixel'],
    domains: ['twitter.com', 'platform.twitter.com', 't.co'],
    defaultCategory: 'social',
    notes: 'Twitter tracking and conversion pixels.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_linkedin',
    canonicalName: 'LinkedIn',
    aliases: ['LinkedIn', 'LinkedIn Insights'],
    domains: ['linkedin.com', 'px.ads.linkedin.com', 'snap.licdn.com'],
    defaultCategory: 'social',
    notes: 'LinkedIn tracking and conversion pixels.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_pinterest',
    canonicalName: 'Pinterest',
    aliases: ['Pinterest', 'Pinterest Pixel'],
    domains: ['pinterest.com', 'ct.pinterest.com'],
    defaultCategory: 'social',
    notes: 'Pinterest tracking and conversion pixels.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_snapchat',
    canonicalName: 'Snapchat',
    aliases: ['Snapchat', 'Snapchat Pixel'],
    domains: ['snapchat.com', 'sc-static.net'],
    defaultCategory: 'social',
    notes: 'Snapchat tracking and analytics.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_tiktok',
    canonicalName: 'TikTok',
    aliases: ['TikTok', 'TikTok Pixel', 'ByteDance'],
    domains: ['tiktok.com', 'analytics.tiktok.com', 'tiktok.pixels.tiktok.com'],
    defaultCategory: 'social',
    notes: 'TikTok tracking and conversion pixels.',
    confidenceRules: ['domain-match'],
  },

  // Video & Media
  {
    id: 'vendor_youtube',
    canonicalName: 'YouTube',
    aliases: ['YouTube', 'Google Video'],
    domains: ['youtube.com', 'youtube-nocookie.com', 'ytimg.com'],
    defaultCategory: 'functional',
    notes: 'YouTube video embedding and analytics.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_vimeo',
    canonicalName: 'Vimeo',
    aliases: ['Vimeo'],
    domains: ['vimeo.com', 'player.vimeo.com'],
    defaultCategory: 'functional',
    notes: 'Vimeo video hosting and analytics.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_wistia',
    canonicalName: 'Wistia',
    aliases: ['Wistia'],
    domains: ['wistia.com', 'wistia.net', 'fast.wistia.net'],
    defaultCategory: 'functional',
    notes: 'Video hosting and analytics platform.',
    confidenceRules: ['domain-match'],
  },

  // Email Marketing & CRM
  {
    id: 'vendor_mailchimp',
    canonicalName: 'Mailchimp',
    aliases: ['Mailchimp', 'MailChimp'],
    domains: ['mailchimp.com', 'chimpstatic.com'],
    defaultCategory: 'marketing',
    notes: 'Email marketing and marketing automation platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_klaviyo',
    canonicalName: 'Klaviyo',
    aliases: ['Klaviyo'],
    domains: ['klaviyo.com', 'klaviyocdn.com'],
    defaultCategory: 'marketing',
    notes: 'Email and SMS marketing automation.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_activecampaign',
    canonicalName: 'ActiveCampaign',
    aliases: ['ActiveCampaign'],
    domains: ['activecampaign.com', 'api.activecampaign.com'],
    defaultCategory: 'marketing',
    notes: 'Customer experience automation platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_convertkit',
    canonicalName: 'ConvertKit',
    aliases: ['ConvertKit'],
    domains: ['convertkit.com', 'convertkit-assets.s3.amazonaws.com'],
    defaultCategory: 'marketing',
    notes: 'Email marketing for creators.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_hubspot',
    canonicalName: 'HubSpot',
    aliases: ['HubSpot'],
    domains: ['hubspot.com', 'js.hs-scripts.com', 'js.hubspotcdn.com'],
    defaultCategory: 'marketing',
    notes: 'CRM and marketing automation platform.',
    confidenceRules: ['domain-match'],
  },

  // Performance & CDN
  {
    id: 'vendor_cloudflare',
    canonicalName: 'Cloudflare',
    aliases: ['Cloudflare', 'CloudFlare'],
    domains: ['cloudflare.com', 'cdn.cloudflare.net'],
    defaultCategory: 'functional',
    notes: 'Content delivery network and performance optimization.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_akamai',
    canonicalName: 'Akamai',
    aliases: ['Akamai'],
    domains: ['akamai.net', 'akamaized.net'],
    defaultCategory: 'functional',
    notes: 'Content delivery and DDoS protection.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_fastly',
    canonicalName: 'Fastly',
    aliases: ['Fastly'],
    domains: ['fastly.net'],
    defaultCategory: 'functional',
    notes: 'Content delivery network platform.',
    confidenceRules: ['domain-match'],
  },

  // Fonts & UI Resources
  {
    id: 'vendor_google_fonts',
    canonicalName: 'Google Fonts',
    aliases: ['Google Fonts'],
    domains: ['fonts.googleapis.com', 'fonts.gstatic.com'],
    defaultCategory: 'functional',
    notes: 'Google Fonts CDN for web typography.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_typekit',
    canonicalName: 'Adobe TypeKit',
    aliases: ['TypeKit', 'Adobe Fonts'],
    domains: ['typekit.net', 'use.typekit.com'],
    defaultCategory: 'functional',
    notes: 'Adobe font hosting and management.',
    confidenceRules: ['domain-match'],
  },

  // CDN Libraries & Resources
  {
    id: 'vendor_jsdelivr',
    canonicalName: 'jsDelivr',
    aliases: ['jsDelivr', 'CDN JS'],
    domains: ['jsdelivr.net', 'cdn.jsdelivr.net'],
    defaultCategory: 'functional',
    notes: 'Open source CDN for JavaScript libraries.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_unpkg',
    canonicalName: 'unpkg',
    aliases: ['unpkg'],
    domains: ['unpkg.com'],
    defaultCategory: 'functional',
    notes: 'Fast global content delivery network for npm.',
    confidenceRules: ['domain-match'],
  },

  // Consent & Cookie Management
  {
    id: 'vendor_onetrust',
    canonicalName: 'OneTrust',
    aliases: ['OneTrust', 'Consent Manager'],
    domains: ['onetrust.com', 'cdn.cookielaw.org'],
    defaultCategory: 'functional',
    notes: 'Consent management platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_cookiebot',
    canonicalName: 'Cookiebot',
    aliases: ['Cookiebot', 'CookieConsent'],
    domains: ['cookiebot.com', 'cdn.cookiebot.com'],
    defaultCategory: 'functional',
    notes: 'GDPR and ePrivacy cookie compliance platform.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_sourcepoint',
    canonicalName: 'SourcePoint',
    aliases: ['SourcePoint', 'Consent Manager'],
    domains: ['sourcepoint.com', 'cdn.sourcepoint.com'],
    defaultCategory: 'functional',
    notes: 'Privacy and consent management platform.',
    confidenceRules: ['domain-match'],
  },

  // Error Tracking & Monitoring
  {
    id: 'vendor_sentry',
    canonicalName: 'Sentry',
    aliases: ['Sentry', 'Error Tracking'],
    domains: ['sentry.io'],
    defaultCategory: 'functional',
    notes: 'Error tracking and performance monitoring.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_bugsnag',
    canonicalName: 'Bugsnag',
    aliases: ['Bugsnag'],
    domains: ['bugsnag.com', 'notify.bugsnag.com'],
    defaultCategory: 'functional',
    notes: 'Application monitoring and error tracking.',
    confidenceRules: ['domain-match'],
  },
  {
    id: 'vendor_rollbar',
    canonicalName: 'Rollbar',
    aliases: ['Rollbar'],
    domains: ['rollbar.com', 'api.rollbar.com'],
    defaultCategory: 'functional',
    notes: 'Error and logs monitoring platform.',
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