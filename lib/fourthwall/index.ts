import { Cart, Collection, Product } from "lib/types";
import { reshapeCart, reshapeProduct, reshapeProducts } from "./reshape";
import { FourthwallCart, FourthwallCollection, FourthwallProduct } from "./types";

const API_URL = process.env.NEXT_PUBLIC_FW_API_URL || 'https://storefront-api.fourthwall.com';
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_FW_STOREFRONT_TOKEN || '';

/**
 * Helpers
 */
async function fourthwallGet<T>(url: string, query: Record<string, string | number | undefined>, options: RequestInit = {}): Promise<{ status: number; body: T }> {
  const constructedUrl = new URL(url);
  // add query parameters
  Object.keys(query).forEach((key) => {
    if (query[key] !== undefined) {
      constructedUrl.searchParams.append(key, query[key].toString());
    }
  });
  constructedUrl.searchParams.append('storefront_token', STOREFRONT_TOKEN);
  try {
    const result = await fetch(
      constructedUrl.toString(),
      {
        method: 'GET',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }
    );

    const body = await result.json();

    return {
      status: result.status,
      body
    };
  } catch (e) {
    throw {
      error: e,
      url
    };
  }
}

async function fourthwallPost<T>(url: string, data: any, options: RequestInit = {}): Promise<{ status: number; body: T }> {
  try {
    const result = await fetch(`${url}?storefront_token=${STOREFRONT_TOKEN}`, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });

    const body = await result.json();

    return {
      status: result.status,
      body
    };
  } catch (e) {
    throw {
      error: e,
      url,
      data
    };
  }
}

/**
 * Collection operations
 */
export async function getCollections(): Promise<Collection[]> {
  const res = await fourthwallGet<{ results: FourthwallCollection[] }>(`${API_URL}/api/public/v1.0/collections`, {});

  return res.body.results.map((collection) => ({
    handle: collection.slug,
    title: collection.name,
    description: collection.description,
  }));
}

export async function getCollectionProducts({
  collection,
  currency,
  limit,
}: {
  collection: string;
  currency: string;
  limit?: number;
}): Promise<Product[]> {
  const res = await fourthwallGet<{results: FourthwallProduct[]}>(`${API_URL}/v1/collections/${collection}/products`, {
    currency,
    limit
  });

  if (!res.body.results) {
    console.warn(`No collection found for \`${collection}\``);
    return [];
  }


  return reshapeProducts(res.body.results);
}

/**
 * Product operations
 */
export async function getProduct({ handle, currency } : { handle: string, currency: string }): Promise<Product | undefined> {
  const res = await fourthwallGet<FourthwallProduct>(`${API_URL}/v1/products/${handle}`, { currency });

  return reshapeProduct(res.body);
}

/**
 * Cart operations
 */
export async function getCart(cartId: string | undefined, currency: string): Promise<Cart | undefined> {
  if (!cartId) {
    return undefined;
  }

  const res = await fourthwallGet<FourthwallCart>(`${API_URL}/v1/carts/${cartId}`, {
    currency
  }, {
    cache: 'no-store'
  });

  return reshapeCart(res.body);
}

export async function createCart(): Promise<Cart> {
  const res = await fourthwallPost<FourthwallCart>(`${API_URL}/v1/carts`, {
    items: []
  });

  return reshapeCart(res.body);
}

export async function addToCart(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[]
): Promise<Cart> {

  const items = lines.map((line) => ({
    variantId: line.merchandiseId,
    quantity: line.quantity
  }));

  const res = await fourthwallPost<FourthwallCart>(`${API_URL}/v1/carts/${cartId}/add`, {
    items,
  }, {
    cache: 'no-store'    
  });

  return reshapeCart(res.body);
}

export async function removeFromCart(cartId: string, lineIds: string[]): Promise<Cart> {
  const items = lineIds.map((id) => ({
    variantId: id
  }));

  const res = await fourthwallPost<FourthwallCart>(`${API_URL}/v1/carts/${cartId}/remove`, {
    items,
  }, {
    cache: 'no-store'
  });

  return reshapeCart(res.body);
}

export async function updateCart(
  cartId: string,
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  const items = lines.map((line) => ({
    variantId: line.merchandiseId,
    quantity: line.quantity
  }));

  const res = await fourthwallPost<FourthwallCart>(`${API_URL}/v1/carts/${cartId}/change`, {
    items,
  }, {
    cache: 'no-store'
  });

  return reshapeCart(res.body);
}
