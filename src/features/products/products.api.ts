import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { CreateProductInput, ProductFilters, ProductListItem, ProductStatus, PublicProductInput } from './product.types';

type ProductRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  brand: string | null;
  age_range: string | null;
  sale_price: number;
  cost_price: number | null;
  stock_qty: number;
  low_stock_threshold: number | null;
  image_path: string | null;
  status: ProductStatus;
};

function mapProduct(row: ProductRow): ProductListItem {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    category: row.category,
    brand: row.brand,
    ageRange: row.age_range,
    salePrice: Number(row.sale_price),
    costPrice: row.cost_price === null ? null : Number(row.cost_price),
    stockQty: row.stock_qty,
    lowStockThreshold: row.low_stock_threshold,
    imagePath: row.image_path,
    status: row.status,
  };
}

export async function listProducts(filters: ProductFilters): Promise<ProductListItem[]> {
  const { data, error } = await supabase.rpc('list_products', {
    p_query: filters.query?.trim() ?? '',
    p_status: filters.status && filters.status !== 'all' ? filters.status : null,
  });
  if (error) throw toAppError(error);
  return ((data ?? []) as ProductRow[]).map(mapProduct);
}

export async function createProduct(input: CreateProductInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_product', {
    p_sku: input.sku.trim(),
    p_barcode: input.barcode?.trim() || null,
    p_name: input.name.trim(),
    p_category: input.category.trim(),
    p_brand: input.brand?.trim() || null,
    p_age_range: input.ageRange?.trim() || null,
    p_cost_price: input.costPrice,
    p_sale_price: input.salePrice,
    p_low_stock_threshold: input.lowStockThreshold ?? null,
    p_image_path: input.imagePath ?? null,
  });
  if (error) throw toAppError(error);
  return String(data);
}

export async function updateProductPublic(id: string, input: PublicProductInput): Promise<void> {
  const { error } = await supabase.rpc('update_product_public', {
    p_id: id,
    p_barcode: input.barcode?.trim() || null,
    p_name: input.name.trim(),
    p_category: input.category.trim(),
    p_brand: input.brand?.trim() || null,
    p_age_range: input.ageRange?.trim() || null,
    p_low_stock_threshold: input.lowStockThreshold ?? null,
    p_image_path: input.imagePath ?? null,
  });
  if (error) throw toAppError(error);
}

export async function updateProductPricing(id: string, input: { costPrice: number; salePrice: number }): Promise<void> {
  const { error } = await supabase.rpc('update_product_pricing', { p_id: id, p_cost_price: input.costPrice, p_sale_price: input.salePrice });
  if (error) throw toAppError(error);
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const { error } = await supabase.rpc('set_product_status', { p_id: id, p_status: status });
  if (error) throw toAppError(error);
}

export async function uploadProductImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
  if (error) throw toAppError(error);
  return path;
}
