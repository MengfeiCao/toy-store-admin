
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "customers": {
                  Row: {
                    "address": string | null,"created_at": string,"id": string,"name": string,"phone": string | null,"remark": string | null,"updated_at": string
                  }
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"name": string,"phone"?: string | null,"remark"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"remark"?: string | null,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"products": {
                  Row: {
                    "age_range": string | null,"barcode": string | null,"brand": string | null,"category": string,"cost_price": number,"created_at": string,"id": string,"image_path": string | null,"low_stock_threshold": number | null,"name": string,"sale_price": number,"sku": string,"status": Database["public"]['Enums']["product_status"],"stock_qty": number,"updated_at": string
                  }
                  Insert: {
                    "age_range"?: string | null,"barcode"?: string | null,"brand"?: string | null,"category": string,"cost_price": number,"created_at"?: string,"id"?: string,"image_path"?: string | null,"low_stock_threshold"?: number | null,"name": string,"sale_price": number,"sku": string,"status"?: Database["public"]['Enums']["product_status"],"stock_qty"?: number,"updated_at"?: string
                  }
                  Update: {
                    "age_range"?: string | null,"barcode"?: string | null,"brand"?: string | null,"category"?: string,"cost_price"?: number,"created_at"?: string,"id"?: string,"image_path"?: string | null,"low_stock_threshold"?: number | null,"name"?: string,"sale_price"?: number,"sku"?: string,"status"?: Database["public"]['Enums']["product_status"],"stock_qty"?: number,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"purchase_order_items": {
                  Row: {
                    "id": string,"product_id": string,"product_name_snapshot": string,"purchase_order_id": string,"quantity": number,"received_quantity": number,"sku_snapshot": string,"unit_cost": number
                  }
                  Insert: {
                    "id"?: string,"product_id": string,"product_name_snapshot": string,"purchase_order_id": string,"quantity": number,"received_quantity"?: number,"sku_snapshot": string,"unit_cost": number
                  }
                  Update: {
                    "id"?: string,"product_id"?: string,"product_name_snapshot"?: string,"purchase_order_id"?: string,"quantity"?: number,"received_quantity"?: number,"sku_snapshot"?: string,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
      columns: ["purchase_order_id"]
isOneToOne: false
      referencedRelation: "purchase_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"purchase_orders": {
                  Row: {
                    "cancelled_at": string | null,"cancelled_by": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"created_by": string,"id": string,"order_no": string,"payment_status": Database["public"]['Enums']["payment_status"],"remark": string | null,"status": Database["public"]['Enums']["purchase_order_status"],"supplier_id": string,"supplier_name_snapshot": string,"total_amount": number,"updated_at": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"cancelled_by"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by": string,"id"?: string,"order_no": string,"payment_status"?: Database["public"]['Enums']["payment_status"],"remark"?: string | null,"status"?: Database["public"]['Enums']["purchase_order_status"],"supplier_id": string,"supplier_name_snapshot": string,"total_amount"?: number,"updated_at"?: string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"cancelled_by"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"order_no"?: string,"payment_status"?: Database["public"]['Enums']["payment_status"],"remark"?: string | null,"status"?: Database["public"]['Enums']["purchase_order_status"],"supplier_id"?: string,"supplier_name_snapshot"?: string,"total_amount"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_orders_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"sales_order_items": {
                  Row: {
                    "id": string,"product_id": string,"product_name_snapshot": string,"quantity": number,"sales_order_id": string,"sku_snapshot": string,"unit_cost_snapshot": number | null,"unit_price": number
                  }
                  Insert: {
                    "id"?: string,"product_id": string,"product_name_snapshot": string,"quantity": number,"sales_order_id": string,"sku_snapshot": string,"unit_cost_snapshot"?: number | null,"unit_price": number
                  }
                  Update: {
                    "id"?: string,"product_id"?: string,"product_name_snapshot"?: string,"quantity"?: number,"sales_order_id"?: string,"sku_snapshot"?: string,"unit_cost_snapshot"?: number | null,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_order_items_sales_order_id_fkey"
      columns: ["sales_order_id"]
isOneToOne: false
      referencedRelation: "sales_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"sales_orders": {
                  Row: {
                    "confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"created_by": string,"customer_id": string | null,"id": string,"order_no": string,"paid_at": string | null,"paid_by": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_reverted_at": string | null,"payment_reverted_by": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"remark": string | null,"shipped_at": string | null,"shipped_by": string | null,"status": Database["public"]['Enums']["sales_order_status"],"total_amount": number
                  }
                  Insert: {
                    "confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by": string,"customer_id"?: string | null,"id"?: string,"order_no": string,"paid_at"?: string | null,"paid_by"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_reverted_at"?: string | null,"payment_reverted_by"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"remark"?: string | null,"shipped_at"?: string | null,"shipped_by"?: string | null,"status"?: Database["public"]['Enums']["sales_order_status"],"total_amount"?: number
                  }
                  Update: {
                    "confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string,"customer_id"?: string | null,"id"?: string,"order_no"?: string,"paid_at"?: string | null,"paid_by"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_reverted_at"?: string | null,"payment_reverted_by"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"remark"?: string | null,"shipped_at"?: string | null,"shipped_by"?: string | null,"status"?: Database["public"]['Enums']["sales_order_status"],"total_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_orders_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_orders_paid_by_fkey"
      columns: ["paid_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_orders_payment_reverted_by_fkey"
      columns: ["payment_reverted_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_orders_shipped_by_fkey"
      columns: ["shipped_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_in_items": {
                  Row: {
                    "id": string,"product_id": string,"quantity": number,"stock_in_order_id": string
                  }
                  Insert: {
                    "id"?: string,"product_id": string,"quantity": number,"stock_in_order_id": string
                  }
                  Update: {
                    "id"?: string,"product_id"?: string,"quantity"?: number,"stock_in_order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_in_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_in_items_stock_in_order_id_fkey"
      columns: ["stock_in_order_id"]
isOneToOne: false
      referencedRelation: "stock_in_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_in_orders": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"order_no": string,"posted_at": string | null,"posted_by": string | null,"remark": string | null,"status": Database["public"]['Enums']["stock_in_status"]
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"order_no": string,"posted_at"?: string | null,"posted_by"?: string | null,"remark"?: string | null,"status"?: Database["public"]['Enums']["stock_in_status"]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"order_no"?: string,"posted_at"?: string | null,"posted_by"?: string | null,"remark"?: string | null,"status"?: Database["public"]['Enums']["stock_in_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_in_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_in_orders_posted_by_fkey"
      columns: ["posted_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_records": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"product_id": string,"quantity_delta": number,"sales_order_item_id": string | null,"stock_in_item_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"product_id": string,"quantity_delta": number,"sales_order_item_id"?: string | null,"stock_in_item_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"product_id"?: string,"quantity_delta"?: number,"sales_order_item_id"?: string | null,"stock_in_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_records_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_records_sales_order_item_id_fkey"
      columns: ["sales_order_item_id"]
isOneToOne: false
      referencedRelation: "sales_order_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_records_stock_in_item_id_fkey"
      columns: ["stock_in_item_id"]
isOneToOne: false
      referencedRelation: "stock_in_items"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "address": string | null,"contact_name": string | null,"created_at": string,"created_by": string,"id": string,"name": string,"phone": string | null,"remark": string | null,"status": Database["public"]['Enums']["supplier_status"],"updated_at": string
                  }
                  Insert: {
                    "address"?: string | null,"contact_name"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"name": string,"phone"?: string | null,"remark"?: string | null,"status"?: Database["public"]['Enums']["supplier_status"],"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"contact_name"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"remark"?: string | null,"status"?: Database["public"]['Enums']["supplier_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "suppliers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"role": Database["public"]['Enums']["app_role"],"status": Database["public"]['Enums']["user_status"]
                  }
                  Insert: {
                    "created_at"?: string,"id": string,"name": string,"role"?: Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["user_status"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"role"?: Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["user_status"]
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancel_purchase_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"cancel_sales_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"confirm_purchase_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"create_product":
{ Args: { "p_age_range": string | null,"p_barcode": string | null,"p_brand": string | null,"p_category": string,"p_cost_price": number,"p_image_path": string | null,"p_low_stock_threshold": number | null,"p_name": string,"p_sale_price": number,"p_sku": string }; Returns: string
                           },
"current_user_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"get_dashboard":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"get_purchase_order":
{ Args: { "p_order_id": string }; Returns: Json
                           },
"get_sales_order":
{ Args: { "p_order_id": string }; Returns: Json
                           },
"get_stock_in":
{ Args: { "p_order_id": string }; Returns: Json
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_low_stock_products":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"low_stock_threshold": number,"name": string,"sku": string,"stock_qty": number
            }[]
                           },
"list_products":
{ Args: { "p_query"?: string,"p_status"?: Database["public"]['Enums']["product_status"] | null }; Returns: {
              "age_range": string | null,"barcode": string | null,"brand": string | null,"category": string,"cost_price": number | null,"id": string,"image_path": string | null,"low_stock_threshold": number | null,"name": string,"sale_price": number,"sku": string,"status": Database["public"]['Enums']["product_status"],"stock_qty": number
            }[]
                           },
"list_purchase_orders":
{ Args: { "p_date"?: string | null,"p_payment_status"?: Database["public"]['Enums']["payment_status"] | null,"p_query"?: string,"p_status"?: Database["public"]['Enums']["purchase_order_status"] | null,"p_supplier_id"?: string | null }; Returns: {
              "created_at": string,"id": string,"order_no": string,"payment_status": Database["public"]['Enums']["payment_status"],"status": Database["public"]['Enums']["purchase_order_status"],"supplier_name": string,"total_amount": number
            }[]
                           },
"list_sales_orders":
{ Args: { "p_date"?: string | null,"p_payment_status"?: string | null,"p_query"?: string,"p_status"?: string | null }; Returns: {
              "created_at": string,"customer_name": string | null,"id": string,"order_no": string,"payment_status": Database["public"]['Enums']["payment_status"],"status": Database["public"]['Enums']["sales_order_status"],"total_amount": number
            }[]
                           },
"list_stock_records":
{ Args: { "p_date"?: string | null,"p_product_id"?: string | null,"p_source"?: string | null }; Returns: {
              "created_at": string,"id": string,"product_id": string,"product_name": string,"quantity_delta": number,"sku": string,"source": string,"source_order_no": string | null
            }[]
                           },
"mark_sales_order_paid":
{ Args: { "p_order_id": string,"p_payment_method": Database["public"]['Enums']["payment_method"] }; Returns: undefined
                           },
"post_stock_in":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"require_owner":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"revert_sales_order_payment":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"save_purchase_order_draft":
{ Args: { "p_items": Json,"p_order_id": string | null,"p_remark": string | null,"p_supplier_id": string }; Returns: string
                           },
"save_sales_order":
{ Args: { "p_confirm"?: boolean,"p_customer_id"?: string | null,"p_items"?: Json,"p_order_id"?: string | null,"p_remark"?: string | null }; Returns: string
                           },
"save_stock_in_draft":
{ Args: { "p_items"?: Json,"p_order_id"?: string | null,"p_remark"?: string | null }; Returns: string
                           },
"set_product_status":
{ Args: { "p_id": string,"p_status": Database["public"]['Enums']["product_status"] }; Returns: undefined
                           },
"ship_sales_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"update_product_pricing":
{ Args: { "p_cost_price": number,"p_id": string,"p_sale_price": number }; Returns: undefined
                           },
"update_product_public":
{ Args: { "p_age_range": string | null,"p_barcode": string | null,"p_brand": string | null,"p_category": string,"p_id": string,"p_image_path": string | null,"p_low_stock_threshold": number | null,"p_name": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "owner"|"staff","payment_method": "wechat"|"alipay"|"cash"|"other","payment_status": "unpaid"|"paid","product_status": "active"|"inactive","purchase_order_status": "draft"|"confirmed"|"partially_received"|"completed"|"cancelled","sales_order_status": "draft"|"pending_shipment"|"completed"|"cancelled","stock_in_status": "draft"|"posted","supplier_status": "active"|"inactive","user_status": "active"|"disabled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {
            "app_role": ["owner", "staff"],"payment_method": ["wechat", "alipay", "cash", "other"],"payment_status": ["unpaid", "paid"],"product_status": ["active", "inactive"],"purchase_order_status": ["draft", "confirmed", "partially_received", "completed", "cancelled"],"sales_order_status": ["draft", "pending_shipment", "completed", "cancelled"],"stock_in_status": ["draft", "posted"],"supplier_status": ["active", "inactive"],"user_status": ["active", "disabled"]
          }
        }
} as const
