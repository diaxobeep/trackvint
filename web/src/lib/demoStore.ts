/**
 * Store mémoire serverless (demo) — partagé tant que l'instance est chaude.
 */

export type DemoSale = {
  id: string;
  userId: string;
  vintedItemId: string;
  title: string;
  brand: string;
  priceCents: number;
  photoUrl?: string;
  sellerLogin?: string;
  sellerPhotoUrl?: string;
  itemUrl?: string;
  soldAt: string;
  saleSpeedHours?: number;
};

type DemoSeller = {
  id: string;
  userId: string;
  vintedSellerId: string;
  vintedUsername: string;
  domain: string;
  sourceUrl: string;
  photoUrl?: string;
  isActive: boolean;
};

type DemoSearch = {
  id: string;
  userId: string;
  searchUrl: string;
  label: string;
  parsedFilters: Record<string, string>;
  domain: string;
  isActive: boolean;
};

const g = globalThis as typeof globalThis & {
  __tvDemo?: {
    sellers: Map<string, DemoSeller>;
    searches: Map<string, DemoSearch>;
    sales: Map<string, DemoSale>;
  };
};

function bucket() {
  if (!g.__tvDemo) {
    g.__tvDemo = {
      sellers: new Map(),
      searches: new Map(),
      sales: new Map(),
    };
    // seed
    g.__tvDemo.sellers.set('demo:275730317', {
      id: 'st_275730317',
      userId: 'demo',
      vintedSellerId: '275730317',
      vintedUsername: 'anna-411',
      domain: 'vinted.fr',
      sourceUrl: 'https://www.vinted.fr/member/275730317-anna-411',
      photoUrl:
        'https://images1.vinted.net/t/06_00c2d_FLiiNEAXN3xH7SdpLqhZhL7P/f800/1782733744.jpeg',
      isActive: true,
    });
    g.__tvDemo.searches.set('demo:sezane', {
      id: 'sr_sezane',
      userId: 'demo',
      searchUrl:
        'https://www.vinted.fr/catalog?search_text=s%C3%A9zane&order=newest_first',
      label: 'Sézane',
      parsedFilters: { search_text: 'sézane', order: 'newest_first' },
      domain: 'vinted.fr',
      isActive: true,
    });
    g.__tvDemo.sales.set('demo:1001', {
      id: 'sale_1001',
      userId: 'demo',
      vintedItemId: '1001',
      title: 'Cardigan Sézane laine mérinos',
      brand: 'Sézane',
      priceCents: 4500,
      sellerLogin: 'anna-411',
      sellerPhotoUrl:
        'https://images1.vinted.net/t/06_00c2d_FLiiNEAXN3xH7SdpLqhZhL7P/f800/1782733744.jpeg',
      itemUrl: 'https://www.vinted.fr/items/1001',
      soldAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      saleSpeedHours: 3,
    });
    g.__tvDemo.sales.set('demo:1002', {
      id: 'sale_1002',
      userId: 'demo',
      vintedItemId: '1002',
      title: 'Robe midi fleurie',
      brand: 'Sézane',
      priceCents: 6200,
      sellerLogin: 'anna-411',
      itemUrl: 'https://www.vinted.fr/items/1002',
      soldAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
      saleSpeedHours: 36,
    });
  }
  return g.__tvDemo;
}

export const demoStore = {
  upsertSeller(data: Omit<DemoSeller, 'id' | 'isActive'> & { id?: string }) {
    const b = bucket();
    const key = `${data.userId}:${data.vintedSellerId}`;
    const existing = b.sellers.get(key);
    if (existing) {
      Object.assign(existing, data, { isActive: true });
      return { created: false, tracker: existing };
    }
    const tracker: DemoSeller = {
      id: `st_${data.vintedSellerId}`,
      isActive: true,
      ...data,
    };
    b.sellers.set(key, tracker);
    return { created: true, tracker };
  },
  upsertSearch(data: Omit<DemoSearch, 'id' | 'isActive'> & { id?: string }) {
    const b = bucket();
    const key = `${data.userId}:${data.searchUrl}`;
    const existing = b.searches.get(key);
    if (existing) {
      Object.assign(existing, data, { isActive: true });
      return { created: false, tracker: existing };
    }
    const tracker: DemoSearch = {
      id: `sr_${Date.now().toString(36)}`,
      isActive: true,
      ...data,
    };
    b.searches.set(key, tracker);
    return { created: true, tracker };
  },
  listSellers(userId = 'demo') {
    return [...bucket().sellers.values()].filter((t) => t.userId === userId || t.userId === 'demo');
  },
  listSearches(userId = 'demo') {
    return [...bucket().searches.values()].filter((t) => t.userId === userId || t.userId === 'demo');
  },
  listSales(userId = 'demo', limit = 40) {
    return [...bucket().sales.values()]
      .filter((s) => s.userId === userId || s.userId === 'demo')
      .sort((a, b) => b.soldAt.localeCompare(a.soldAt))
      .slice(0, limit);
  },
};
