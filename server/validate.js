import { resolveMx, resolve4, resolve6 } from 'node:dns/promises';

const ROLE_PREFIXES = new Set([
  'info', 'contact', 'hello', 'hi', 'office', 'admin', 'support', 'sales',
  'booking', 'bookings', 'book', 'reservations', 'reservation', 'rentals',
  'reception', 'frontdesk', 'team', 'inquiries', 'enquiries', 'mail', 'service', 'help',
]);

// Things scrapers often pick up by mistake: image file names, placeholders, tracking
const FILE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'css', 'js', 'ico']);
const JUNK_DOMAINS = ['example.com', 'domain.com', 'yourdomain.com', 'sentry.io', 'wixpress.com'];

const SYNTAX = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function withTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Remember DNS answers for an hour so we don't repeat lookups
const cache = new Map();
const TTL = 60 * 60 * 1000;

async function hasAddress(domain) {
  try {
    if ((await withTimeout(resolve4(domain))).length) return true;
  } catch {}
  try {
    if ((await withTimeout(resolve6(domain))).length) return true;
  } catch {}
  return false;
}

async function checkDomain(domain) {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < TTL) return hit.result;

  let result;
  try {
    const mx = await withTimeout(resolveMx(domain));
    if (mx.length === 1 && (!mx[0].exchange || mx[0].exchange === '.')) {
      result = { status: 'invalid', reason: 'Domain does not accept email' };
    } else if (mx.length > 0) {
      result = { status: 'mx_ok', reason: 'Domain has mail servers' };
    } else {
      result = { status: 'invalid', reason: 'No mail server found' };
    }
  } catch (err) {
    if (err.code === 'ENODATA') {
      // No MX record: mail can still go to the domain's own address
      result = (await hasAddress(domain))
        ? { status: 'mx_ok', reason: 'No MX record, uses domain address' }
        : { status: 'invalid', reason: 'No mail server found' };
    } else if (err.code === 'ENOTFOUND') {
      result = { status: 'invalid', reason: 'Domain does not exist' };
    } else {
      return { status: 'unknown', reason: 'DNS lookup failed or timed out' };
    }
  }
  cache.set(domain, { result, at: Date.now() });
  return result;
}

function related(a, b) {
  return a === b || a.endsWith('.' + b) || b.endsWith('.' + a);
}

export async function validateEmail(raw, websiteDomain = '') {
  const email = String(raw).trim().toLowerCase();
  const base = { email, role: false, domainMatch: null };

  if (!SYNTAX.test(email) || email.length > 254) {
    return { ...base, status: 'invalid', reason: 'Bad format' };
  }
  const [local, domain] = email.split('@');
  const tld = domain.split('.').pop();
  if (FILE_EXTENSIONS.has(tld) || JUNK_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
    return { ...base, status: 'invalid', reason: 'Looks like a file name or placeholder' };
  }

  const dns = await checkDomain(domain);
  return {
    email,
    role: ROLE_PREFIXES.has(local),
    domainMatch: websiteDomain ? related(domain, websiteDomain) : null,
    status: dns.status,
    reason: dns.reason,
  };
}

const STATUS_RANK = { mx_ok: 0, unknown: 1, invalid: 2 };

// If a business has several emails, choose the most useful one
export function pickBest(checks) {
  return [...checks].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      Number(b.domainMatch === true) - Number(a.domainMatch === true) ||
      Number(a.role) - Number(b.role)
  )[0];
}