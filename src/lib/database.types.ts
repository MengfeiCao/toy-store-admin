export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; role: Database['public']['Enums']['app_role']; status: Database['public']['Enums']['user_status']; created_at: string };
        Insert: { id: string; name: string; role?: Database['public']['Enums']['app_role']; status?: Database['public']['Enums']['user_status']; created_at?: string };
        Update: { id?: string; name?: string; role?: Database['public']['Enums']['app_role']; status?: Database['public']['Enums']['user_status']; created_at?: string };
        Relationships: [];
      };
      products: {
        Row: { id: string; sku: string; barcode: string | null; name: string; category: string; brand: string | null; age_range: string | null; image_path: string | null; cost_price: number; sale_price: number; stock_qty: number; low_stock_threshold: number | null; status: Database['public']['Enums']['product_status']; created_at: string; updated_at: string };
        Insert: { id?: string; sku: string; barcode?: string | null; name: string; category: string; brand?: string | null; age_range?: string | null; image_path?: string | null; cost_price: number; sale_price: number; stock_qty?: number; low_stock_threshold?: number | null; status?: Database['public']['Enums']['product_status']; created_at?: string; updated_at?: string };
        Update: { id?: string; sku?: string; barcode?: string | null; name?: string; category?: string; brand?: string | null; age_range?: string | null; image_path?: string | null; cost_price?: number; sale_price?: number; stock_qty?: number; low_stock_threshold?: number | null; status?: Database['public']['Enums']['product_status']; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      customers: {
        Row: { id: string; name: string; phone: string | null; address: string | null; remark: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; phone?: string | null; address?: string | null; remark?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; phone?: string | null; address?: string | null; remark?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      stock_in_orders: {
        Row: { id: string; order_no: string; status: Database['public']['Enums']['stock_in_status']; remark: string | null; created_by: string; created_at: string; posted_by: string | null; posted_at: string | null };
        Insert: { id?: string; order_no: string; status?: Database['public']['Enums']['stock_in_status']; remark?: string | null; created_by: string; created_at?: string; posted_by?: string | null; posted_at?: string | null };
        Update: { id?: string; order_no?: string; status?: Database['public']['Enums']['stock_in_status']; remark?: string | null; created_by?: string; created_at?: string; posted_by?: string | null; posted_at?: string | null };
        Relationships: [];
      };
      stock_in_items: {
        Row: { id: string; stock_in_order_id: string; product_id: string; quantity: number };
        Insert: { id?: string; stock_in_order_id: string; product_id: string; quantity: number };
        Update: { id?: string; stock_in_order_id?: string; product_id?: string; quantity?: number };
        Relationships: [];
      };
      sales_orders: {
        Row: { id: string; order_no: string; customer_id: string | null; status: Database['public']['Enums']['sales_order_status']; total_amount: number; remark: string | null; payment_status: Database['public']['Enums']['payment_status']; payment_method: Database['public']['Enums']['payment_method'] | null; paid_at: string | null; paid_by: string | null; payment_reverted_at: string | null; payment_reverted_by: string | null; created_by: string; created_at: string; confirmed_by: string | null; confirmed_at: string | null; shipped_by: string | null; shipped_at: string | null };
        Insert: { id?: string; order_no: string; customer_id?: string | null; status?: Database['public']['Enums']['sales_order_status']; total_amount?: number; remark?: string | null; payment_status?: Database['public']['Enums']['payment_status']; payment_method?: Database['public']['Enums']['payment_method'] | null; paid_at?: string | null; paid_by?: string | null; payment_reverted_at?: string | null; payment_reverted_by?: string | null; created_by: string; created_at?: string; confirmed_by?: string | null; confirmed_at?: string | null; shipped_by?: string | null; shipped_at?: string | null };
        Update: { id?: string; order_no?: string; customer_id?: string | null; status?: Database['public']['Enums']['sales_order_status']; total_amount?: number; remark?: string | null; payment_status?: Database['public']['Enums']['payment_status']; payment_method?: Database['public']['Enums']['payment_method'] | null; paid_at?: string | null; paid_by?: string | null; payment_reverted_at?: string | null; payment_reverted_by?: string | null; created_by?: string; created_at?: string; confirmed_by?: string | null; confirmed_at?: string | null; shipped_by?: string | null; shipped_at?: string | null };
        Relationships: [];
      };
      sales_order_items: {
        Row: { id: string; sales_order_id: string; product_id: string; quantity: number; product_name_snapshot: string; sku_snapshot: string; unit_price: number; unit_cost_snapshot: number | null };
        Insert: { id?: string; sales_order_id: string; product_id: string; quantity: number; product_name_snapshot: string; sku_snapshot: string; unit_price: number; unit_cost_snapshot?: number | null };
        Update: { id?: string; sales_order_id?: string; product_id?: string; quantity?: number; product_name_snapshot?: string; sku_snapshot?: string; unit_price?: number; unit_cost_snapshot?: number | null };
        Relationships: [];
      };
      stock_records: {
        Row: { id: string; product_id: string; quantity_delta: number; stock_in_item_id: string | null; sales_order_item_id: string | null; created_by: string; created_at: string };
        Insert: { id?: string; product_id: string; quantity_delta: number; stock_in_item_id?: string | null; sales_order_item_id?: string | null; created_by: string; created_at?: string };
        Update: { id?: string; product_id?: string; quantity_delta?: number; stock_in_item_id?: string | null; sales_order_item_id?: string | null; created_by?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: Database['public']['Enums']['app_role'] | null };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      require_owner: { Args: Record<string, never>; Returns: undefined };
      list_products: { Args: { p_query: string; p_status: Database['public']['Enums']['product_status'] | null }; Returns: Array<{ id: string; sku: string; barcode: string | null; name: string; category: string; brand: string | null; age_range: string | null; sale_price: number; cost_price: number | null; stock_qty: number; low_stock_threshold: number | null; image_path: string | null; status: Database['public']['Enums']['product_status'] }> };
      create_product: { Args: { p_sku: string; p_barcode: string | null; p_name: string; p_category: string; p_brand: string | null; p_age_range: string | null; p_cost_price: number; p_sale_price: number; p_low_stock_threshold: number | null; p_image_path: string | null }; Returns: string };
      update_product_public: { Args: { p_id: string; p_barcode: string | null; p_name: string; p_category: string; p_brand: string | null; p_age_range: string | null; p_low_stock_threshold: number | null; p_image_path: string | null }; Returns: undefined };
      update_product_pricing: { Args: { p_id: string; p_cost_price: number; p_sale_price: number }; Returns: undefined };
      set_product_status: { Args: { p_id: string; p_status: Database['public']['Enums']['product_status'] }; Returns: undefined };
      save_stock_in_draft: { Args: { p_order_id: string | null; p_remark: string | null; p_items: Json }; Returns: string };
      get_stock_in: { Args: { p_order_id: string }; Returns: Json };
      post_stock_in: { Args: { p_order_id: string }; Returns: undefined };
      list_stock_records: { Args: { p_product_id: string | null; p_source: string | null; p_date: string | null }; Returns: Array<{ id: string; product_id: string; product_name: string; sku: string; quantity_delta: number; source: string; source_order_no: string | null; created_at: string }> };
      save_sales_order: { Args: { p_order_id: string | null; p_customer_id: string | null; p_remark: string | null; p_items: Json; p_confirm: boolean }; Returns: string };
      get_sales_order: { Args: { p_order_id: string }; Returns: Json };
      list_sales_orders: { Args: { p_query: string; p_status: string | null; p_payment_status: string | null; p_date: string | null }; Returns: Array<{ id: string; order_no: string; customer_name: string | null; status: string; total_amount: number; payment_status: string; created_at: string }> };
      cancel_sales_order: { Args: { p_order_id: string }; Returns: undefined };
      ship_sales_order: { Args: { p_order_id: string }; Returns: undefined };
      mark_sales_order_paid: { Args: { p_order_id: string; p_payment_method: Database['public']['Enums']['payment_method'] }; Returns: undefined };
      revert_sales_order_payment: { Args: { p_order_id: string }; Returns: undefined };
    };
    Enums: {
      app_role: 'owner' | 'staff';
      user_status: 'active' | 'disabled';
      product_status: 'active' | 'inactive';
      stock_in_status: 'draft' | 'posted';
      sales_order_status: 'draft' | 'pending_shipment' | 'completed' | 'cancelled';
      payment_status: 'unpaid' | 'paid';
      payment_method: 'wechat' | 'alipay' | 'cash' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
};
