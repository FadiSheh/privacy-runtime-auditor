import { createServer, type Server } from 'node:http';

export interface FixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
}

const pages = {
  compliant: {
    body: `
      <div id="banner">
        <p>We use cookies to improve analytics.</p>
        <button id="accept-all">Accept all</button>
        <button id="reject-all">Reject all</button>
        <button id="manage">Manage preferences</button>
        <div id="preferences" hidden>
          <label><input id="analytics-toggle" type="checkbox" checked /> Analytics</label>
          <button id="save-preferences">Save preferences</button>
        </div>
      </div>
      <script>
        const loadAnalytics = () => {
          const script = document.createElement('script');
          script.src = 'https://www.google-analytics.com/analytics.js';
          document.head.appendChild(script);
          fetch('https://www.google-analytics.com/g/collect?v=2');
          document.cookie = 'analytics_cookie=1; path=/';
        };
        document.getElementById('accept-all').addEventListener('click', loadAnalytics);
        document.getElementById('manage').addEventListener('click', () => {
          document.getElementById('preferences').hidden = false;
        });
        document.getElementById('save-preferences').addEventListener('click', () => {
          const checked = document.getElementById('analytics-toggle').checked;
          if (checked) {
            loadAnalytics();
          }
        });
      </script>
    `,
    policy: 'We use Google Analytics only after consent. Categories include analytics and essential cookies.',
  },
  noncompliant: {
    body: `
      <div id="banner">
        <p>Cookie choices</p>
        <button id="accept-all">Accept all</button>
      </div>
      <script>
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(script);
        fetch('https://connect.facebook.net/en_US/fbevents.js');
        document.cookie = 'meta_pixel=1; path=/';
      </script>
    `,
    policy: 'We use essential cookies and Google Analytics with consent.',
  },
  missingBanner: {
    body: `
      <script>
        const script = document.createElement('script');
        script.src = 'https://doubleclick.net/pixel.js';
        document.head.appendChild(script);
        fetch('https://doubleclick.net/pixel.js');
        document.cookie = 'doubleclick=1; path=/';
      </script>
    `,
    policy: 'We use advertising and analytics vendors with consent.',
  },
  ineffectiveReject: {
    body: `
      <div id="banner">
        <p>Cookie preferences</p>
        <button id="accept-all">Accept all</button>
        <button id="reject-all">Reject all</button>
      </div>
      <script>
        const loadMeta = () => {
          const script = document.createElement('script');
          script.src = 'https://connect.facebook.net/en_US/fbevents.js';
          document.head.appendChild(script);
          fetch('https://connect.facebook.net/en_US/fbevents.js');
          document.cookie = 'meta_pixel=1; path=/';
        };
        document.getElementById('accept-all').addEventListener('click', loadMeta);
        document.getElementById('reject-all').addEventListener('click', loadMeta);
      </script>
    `,
    policy: 'We block advertising until consent is granted.',
  },
};

function renderPage(kind: keyof typeof pages, path: string) {
  return `
    <html>
      <body>
        <nav>
          <a href="/${kind}/">Home</a>
          <a href="/${kind}/privacy-policy">Privacy Policy</a>
          <a href="/${kind}/products">Products</a>
          <a href="/${kind}/contact">Contact</a>
        </nav>
        <main>
          <h1>${kind} fixture</h1>
          <p>Current path: ${path}</p>
          ${pages[kind].body}
        </main>
      </body>
    </html>
  `;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const [, kind, slug = ''] = url.pathname.split('/');
    const siteKind = (kind || 'compliant') as keyof typeof pages;
    const page = pages[siteKind] ?? pages.compliant;

    response.setHeader('content-type', 'text/html; charset=utf-8');

    if (slug === 'privacy-policy') {
      response.end(`<html><body><h1>Privacy Policy</h1><p>${page.policy}</p></body></html>`);
      return;
    }

    response.end(renderPage(siteKind, url.pathname));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start fixture server');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
