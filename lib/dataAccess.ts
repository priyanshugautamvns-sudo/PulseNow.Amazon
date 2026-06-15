import productsRaw from '@/data/products.json';
import userProfileRaw from '@/data/userProfile.json';
import orderHistoryRaw from '@/data/orderHistory.json';
import inventoryRaw from '@/data/inventory.json';
import demoScenariosRaw from '@/data/demoScenarios.json';
import recipesRaw from '@/data/recipes.json';
import type { Product } from './types';

export const products = productsRaw as Product[];
export const userProfile = userProfileRaw as any;
export const orderHistory = orderHistoryRaw as any[];
export const inventory = inventoryRaw as any;
export const demoScenarios = demoScenariosRaw as any[];
export const recipes = recipesRaw as Recipe[];

export type Recipe = {
  id: string;
  names: string[];
  label: string;
  icon: string;
  serves_default: number;
  intent_hint: string;
  ingredients: { product_id: string; qty?: number; per_guest?: number; per_guest_div?: number; note?: string }[];
};

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getStockAt(storeId: string, productId: string): number {
  const overrides = inventory.stock_overrides?.[storeId] ?? {};
  if (productId in overrides) return overrides[productId];
  return getProductById(productId)?.stock_count ?? 0;
}

export function findRecipeByName(text: string): Recipe | null {
  const t = text.toLowerCase();
  for (const r of recipes) {
    for (const n of r.names) if (t.includes(n)) return r;
  }
  return null;
}
