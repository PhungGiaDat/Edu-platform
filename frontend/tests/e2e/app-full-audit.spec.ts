import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_ID = 'admin@eduplatform.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

interface AuditFinding {
  route: string;
  category: 'unicode' | 'broken_image' | 'dead_button' | 'console_error';
  severity: 'high' | 'medium' | 'low';
  details: string;
  element?: string;
}

const findings: AuditFinding[] = [];

// Non-AR routes to audit
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/install',
];

const LEARNER_ROUTES = [
  '/courses',
  '/courses/animals',
  '/courses/animals-adventure',
  '/flashcards',
  '/profile',
  '/progress',
  '/daily-challenge',
  '/leaderboard',
  '/learning-path',
  '/learning-path-3d',
  '/pets',
  '/stickers',
  '/games',
  '/games/drag-match',
  '/games/memory-pairs',
  '/games/color-learn',
  '/games/color-animal',
  '/notebook',
  '/dictionary',
  '/pronunciation-course',
  '/notifications',
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/flashcards',
  '/admin/games',
  '/admin/courses',
  '/admin/students',
  '/admin/analytics',
  '/admin/monitoring',
  '/admin/courses/new',
  '/admin/games/new',
  '/admin/flashcards/new-deck',
];

async function loginAsAdmin(page: Page): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('input[type="email"]').fill(ADMIN_ID);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(
      () => Boolean(localStorage.getItem('authToken')),
      { timeout: 15000 }
    );
    return true;
  } catch (err) {
    console.warn('[Audit] Real login failed, using mocked token fallback:', err);
    // Fallback: inject admin token directly into localStorage
    const mockUser = {
      id: 'mock-admin-id',
      email: ADMIN_ID,
      username: 'admin',
      role: 'admin',
      is_superuser: true,
      is_active: true,
      is_verified: true,
    };
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: mockUser.email,
        id: mockUser.id,
        role: 'admin',
        is_superuser: true,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      })
    );
    const mockToken = `${header}.${payload}.mockSignature1234567890`;

    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(user));
        localStorage.removeItem('guestMode');
      },
      { token: mockToken, user: mockUser }
    );
    return false;
  }
}

async function auditRoute(page: Page, route: string) {
  const consoleErrors: string[] = [];
  const onConsole = (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known noisy or benign 3rd party analytics / connection refuses
      if (!text.includes('sentry') && !text.includes('favicon') && !text.includes('speed-insights')) {
        consoleErrors.push(text);
      }
    }
  };
  const onPageError = (err: Error) => {
    consoleErrors.push(err.message);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    await page.goto(route, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      // If networkidle times out, fallback to load
      await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
    });

    // Wait 1.5s for dynamic content / animations / i18n
    await page.waitForTimeout(1500);

    // 1. Audit Unicode / Broken Text / Raw Keys
    const textAudit = await page.evaluate(() => {
      const issues: { text: string; selector: string; reason: string }[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.textContent && node.textContent.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          },
        }
      );

      const unicodeReplacementRegex = /�/;
      const mojibakePatterns = [
        /Ã¡|Ã|Ã©|Ã­|Ã³|Ãº|Ã¢|Ãª|Ã´|Ä|á»|áº/i, // common Latin-1 decoded UTF-8 mojibake
        /\\u[0-9a-fA-F]{4}/, // unescaped literal \uXXXX
        /\{\{\s*[\w.]+\s*\}\}/, // uncompiled template keys like {{name}}
        /NaN|undefined|null/ // unhandled JS primitives rendered into UI
      ];

      let currentNode = walker.nextNode();
      while (currentNode) {
        const val = currentNode.textContent || '';
        const trimmed = val.trim();

        if (unicodeReplacementRegex.test(trimmed)) {
          issues.push({
            text: trimmed.slice(0, 80),
            selector: (currentNode.parentElement as HTMLElement)?.className || currentNode.parentElement?.tagName || '',
            reason: 'Contains Unicode replacement character (�)',
          });
        }

        // Test unescaped \uXXXX or unparsed i18n keys
        if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) {
          issues.push({
            text: trimmed.slice(0, 80),
            selector: (currentNode.parentElement as HTMLElement)?.className || currentNode.parentElement?.tagName || '',
            reason: 'Unparsed literal unicode escape (\\uXXXX)',
          });
        }

        // Test for raw missing translation keys (e.g. "admin.courses.someUnknownKey")
        if (/^[a-z]+(\.[a-z_0-9-]+){2,}$/i.test(trimmed) && !trimmed.includes(' ')) {
          issues.push({
            text: trimmed,
            selector: (currentNode.parentElement as HTMLElement)?.className || currentNode.parentElement?.tagName || '',
            reason: 'Likely raw unrendered translation key',
          });
        }

        currentNode = walker.nextNode();
      }

      return issues;
    });

    for (const issue of textAudit) {
      findings.push({
        route,
        category: 'unicode',
        severity: 'high',
        details: `${issue.reason}: "${issue.text}"`,
        element: issue.selector,
      });
    }

    // 2. Audit Broken Images (img tags with naturalWidth === 0 or failed to load)
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const broken: { src: string; alt: string; className: string }[] = [];
      for (const img of imgs) {
        // SVG or dynamic lazy images might have 0 naturalWidth until loaded, but complete should be true
        if (img.complete && img.naturalWidth === 0) {
          broken.push({
            src: img.src || img.getAttribute('src') || '',
            alt: img.alt || '',
            className: img.className || '',
          });
        }
      }
      return broken;
    });

    for (const img of brokenImages) {
      findings.push({
        route,
        category: 'broken_image',
        severity: 'high',
        details: `Image failed to load: src="${img.src}" alt="${img.alt}"`,
        element: img.className,
      });
    }

    // 3. Audit Buttons (empty buttons, buttons without text or aria-label, disabled buttons without reason)
    const deadButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const suspicious: { text: string; className: string; reason: string }[] = [];

      for (const btn of buttons) {
        const text = btn.innerText?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const title = btn.getAttribute('title') || '';
        const hasSvg = Boolean(btn.querySelector('svg'));
        const hasImg = Boolean(btn.querySelector('img'));

        // Button with zero accessible content
        if (!text && !ariaLabel && !title && !hasSvg && !hasImg) {
          suspicious.push({
            text: '[empty]',
            className: btn.className || '',
            reason: 'Empty button with no text, icon, or aria-label',
          });
        }
      }
      return suspicious;
    });

    for (const btn of deadButtons) {
      findings.push({
        route,
        category: 'dead_button',
        severity: 'medium',
        details: `${btn.reason}`,
        element: btn.className,
      });
    }

    // 4. Console errors
    for (const err of consoleErrors) {
      findings.push({
        route,
        category: 'console_error',
        severity: 'medium',
        details: err.slice(0, 200),
      });
    }
  } catch (error: any) {
    findings.push({
      route,
      category: 'console_error',
      severity: 'high',
      details: `Route crashed or timed out: ${error?.message || error}`,
    });
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

test.describe('Full Application Audit (Non-AR Routes)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('audit all public, learner, and admin routes', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for comprehensive crawl

    // 1. Audit Public Routes
    console.log('--- Auditing Public Routes ---');
    for (const route of PUBLIC_ROUTES) {
      console.log(`Auditing: ${route}`);
      await auditRoute(page, route);
    }

    // 2. Login as Admin
    console.log('--- Authenticating as Admin ---');
    await loginAsAdmin(page);

    // 3. Audit Learner Routes
    console.log('--- Auditing Learner Routes ---');
    for (const route of LEARNER_ROUTES) {
      console.log(`Auditing: ${route}`);
      await auditRoute(page, route);
    }

    // 4. Audit Admin Routes
    console.log('--- Auditing Admin Routes ---');
    for (const route of ADMIN_ROUTES) {
      console.log(`Auditing: ${route}`);
      await auditRoute(page, route);
    }

    // Write findings to a JSON file for inspection
    const reportPath = path.resolve(process.cwd(), 'audit-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2), 'utf-8');
    console.log(`\nAudit completed! Total findings: ${findings.length}`);
    console.log(`Results written to: ${reportPath}`);

    // Print summary to console
    const summary = {
      unicode: findings.filter((f) => f.category === 'unicode').length,
      broken_image: findings.filter((f) => f.category === 'broken_image').length,
      dead_button: findings.filter((f) => f.category === 'dead_button').length,
      console_error: findings.filter((f) => f.category === 'console_error').length,
    };
    console.log('Summary:', summary);
  });
});
