import type { Database } from '../../lib/database.types';

export type ProductStatus = Database['public']['Enums']['product_status'];

export interface ProductFilters {
  query?: string;
  status?: ProductStatus | 'all';
}

export interface ProductListItem {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  ageRange?: string | null;
  salePrice: number;
  costPrice: number | null;
  stockQty: number;
  lowStockThreshold?: number | null;
  imagePath?: string | null;
  status: ProductStatus;
}

export interface BarcodeProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  salePrice: number;
  stockQty: number;
}

export interface CreateProductInput {
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  brand?: string;
  ageRange?: string;
  costPrice: number;
  salePrice: number;
  lowStockThreshold?: number;
  imagePath?: string;
}

export interface PublicProductInput {
  barcode?: string;
  name: string;
  category: string;
  brand?: string;
  ageRange?: string;
  lowStockThreshold?: number;
  imagePath?: string;
}
