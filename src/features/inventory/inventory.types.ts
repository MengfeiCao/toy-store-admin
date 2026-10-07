export type InventoryItem={id:string;sku:string;barcode:string|null;name:string;category:string;stockQty:number;lowStockThreshold:number|null;status:'active'|'inactive'};
export type StockCountItem={id:string;productId:string;productName:string;sku:string;bookQuantity:number;actualQuantity:number|null;differenceQuantity:number|null};
export type StockCountDetail={id:string;countNo:string;status:'draft'|'confirmed'|'cancelled';remark?:string|null;items:StockCountItem[]};
export type AdjustmentType='surplus'|'shortage'|'damage'|'manual';
