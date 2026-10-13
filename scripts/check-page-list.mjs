import assert from 'node:assert/strict';
import {
  pageList,
  pageMenu,
  pageUrl,
} from '../apps/web/src/routes/pageList.js';

// These counts come from Google Docs > Car Shop > Page List, not from the menus.
const requiredCounts = {
  public: 5,
  customer: 4,
  seller: 5,
  admin: 6,
  manager: 6,
};
const urls = pageList.map(pageUrl);
assert.equal(
  new Set(urls).size,
  urls.length,
  'Page List contains duplicate URLs',
);
for (const [role, count] of Object.entries(requiredCounts)) {
  const pages = pageList.filter(
    (page) => page.role === role && !page.secondary,
  );
  assert.equal(
    pages.length,
    count,
    `${role}: primary page count differs from the source document`,
  );
  for (const [url, label, end] of pageMenu(role)) {
    assert.ok(
      pages.some((page) => pageUrl(page) === url && page.title === label),
      `${role}: menu has no matching page: ${url}`,
    );
    assert.ok(
      !url.includes(':'),
      `Contextual URL must not be a direct menu link: ${url}`,
    );
    if (url === `/${role}` || url === '/')
      assert.equal(end, true, 'Index menu must match exactly');
  }
}
assert.equal(
  pageList.find(
    (page) => page.role === 'seller' && page.path.startsWith('customers/'),
  )?.menu,
  false,
);
console.log(
  'Page List: 26 primary page groups, 27 unique URLs; menus and role counts pass.',
);
