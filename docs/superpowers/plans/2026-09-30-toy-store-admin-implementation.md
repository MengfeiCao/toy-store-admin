# 玩具销售后台 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个供单店店主和店员使用的玩具销售后台，完整支持玩具、入库、库存、客户、销售订单、出库、二态收款和角色化经营首页。

**Architecture:** 使用 React 单页应用承载左侧导航后台，Supabase Auth 管理登录，PostgreSQL 保存 8 张业务表。普通资料操作通过受 RLS 保护的数据接口完成，价格保密、入库、订单确认、出库和收款通过受保护的 PostgreSQL 函数执行，确保权限和事务一致性。

**Tech Stack:** React、TypeScript、Vite、Ant Design、React Router、Supabase Auth/PostgreSQL/Storage、Vitest、Testing Library、pgTAP、Playwright、Vercel

**Spec:** `docs/superpowers/specs/2026-09-30-toy-store-admin-design.md`

## Global Constraints

- 第一版服务单个企业、单个仓库和单一币种；数量只接受大于零的整数。
- 销售订单从玩具资料复制固定售价，界面和请求均不允许店员提交价格或优惠金额。
- 收款只有 `unpaid` 和 `paid`，不创建支付明细表，不支持部分收款。
- 订单确认不预占库存；出库时整单校验并原子扣减，库存不足时不得产生部分结果。
- 已完成订单保存商品名称、货号、售价和出库成本快照，后续商品资料变化不得改写历史数据。
- 店员的任何查询结果都不能包含成本价、商品成本或毛利润；不能只依赖前端隐藏字段。
- 店主创建商品并维护成本、售价和状态；店员只维护获准的非敏感商品字段。
- 已确认入库单、已完成订单和库存流水不能直接修改或删除。
- 页面采用桌面优先的左侧固定导航；复杂订单使用完整页面。
- 不建设独立 Node.js 服务；用户管理使用受保护的 Supabase Edge Function，其他关键业务使用 PostgreSQL 函数。

## Review Focus

- 同一入库或出库请求重复到达时只能生效一次；由 Task 5 和 Task 8 的数据库测试覆盖。
- 两个订单并发争抢不足库存时不能出现负库存或半完成流水；由 Task 8 的并发测试覆盖。
- 店员通过直接 REST/RPC、详情页或首页都不能读取成本和利润；由 Task 2、Task 4、Task 8、Task 9 的权限测试覆盖。
- 新订单必须同时支持“保存草稿”和“不保存草稿直接确认”，两条路径都使用服务端售价；由 Task 7 的组件及数据库测试覆盖。
- 关键请求超时后页面必须先重新查询单据状态，再决定是否允许重试；由 Task 5 和 Task 8 的前端测试覆盖。

---

## File Map

```text
src/
  app/                 路由、全局布局和应用入口
  auth/                登录状态、角色和受保护路由
  lib/                 Supabase 客户端、数据库类型和通用错误映射
  features/
    products/          玩具查询、表单和列表页
    stock/             入库单、确认入库和库存流水
    customers/         客户资料
    sales/             订单草稿、确认、出库和收款
    dashboard/         店主及店员首页
    users/             店主用户管理页和 Edge Function 客户端
  test/                Vitest 全局测试工具
supabase/
  migrations/          表、约束、RLS、RPC 和 Storage 策略
  tests/database/      pgTAP 数据库与权限测试
  functions/admin-users/  受保护的用户管理 Edge Function
e2e/                   Playwright 端到端验收
docs/operations/       环境配置、部署、备份和操作说明
```

### Task 1: 前端基础框架与测试工具

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `index.html`
- Create: `.env.example`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/app/styles.css`
- Create: `src/test/setup.ts`
- Create: `playwright.config.ts`
- Create: `supabase/config.toml`

**Interfaces:**
- Consumes: 无。
- Produces: `App(): JSX.Element`；脚本 `dev`、`build`、`test`、`test:db`、`test:e2e`；环境变量 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。

- [ ] **Step 1: 创建依赖和工具配置**

在 `package.json` 中声明 React、TypeScript、Vite、Ant Design、React Router、Supabase JS、Vitest、Testing Library、jsdom 和 Playwright，并配置上述五个脚本；建立 TypeScript、Vite、Vitest、Playwright 和 Supabase 本地配置。

- [ ] **Step 2: 安装锁定依赖**

Run: `npm install`

Expected: 生成 `package-lock.json`，安装过程无依赖解析错误。

- [ ] **Step 3: 写应用外壳的失败测试**

在 `src/app/App.test.tsx` 编写 `renders_toy_store_title`，断言页面出现“玩具销售后台”。

- [ ] **Step 4: 运行测试并确认失败**

Run: `npm test -- --run src/app/App.test.tsx`

Expected: FAIL，原因是 `App` 或测试环境尚未实现。

- [ ] **Step 5: 实现最小应用入口**

实现 `main.tsx`、`App.tsx` 和基础样式，只渲染标题和应用根节点；测试配置使用 `src/test/setup.ts` 加载 Testing Library matcher。

- [ ] **Step 6: 验证基础框架**

Run: `npm test -- --run && npm run build`

Expected: 测试 PASS，Vite 构建成功且无 TypeScript 错误。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html .env.example playwright.config.ts src supabase/config.toml
git commit -m "chore: scaffold toy store admin"
```

### Task 2: 核心数据库、约束与权限边界

**Files:**
- Create: `supabase/tests/database/001_core_schema.sql`
- Create: `supabase/tests/database/002_role_boundaries.sql`
- Create: `supabase/migrations/202609300001_core_schema.sql`
- Create: `supabase/migrations/202609300002_role_helpers_and_rls.sql`
- Create: `src/lib/database.types.ts`

**Interfaces:**
- Consumes: Supabase 本地配置与 `auth.users`。
- Produces: 8 张业务表；`app_role`、`user_status`、`product_status`、`stock_in_status`、`sales_order_status`、`payment_status`、`payment_method` 枚举；`public.current_user_role() returns app_role`；`public.require_owner() returns void`。

- [ ] **Step 1: 写数据库结构失败测试**

`001_core_schema.sql` 断言 8 张业务表存在、货号和单号唯一、数量为正、价格及库存非负、库存流水恰有一个来源、来源明细唯一。

- [ ] **Step 2: 写角色隔离失败测试**

`002_role_boundaries.sql` 创建店主和店员测试身份，断言未登录用户无业务表权限、禁用用户无访问权、店员无法直接读取 `products.cost_price` 和 `sales_order_items.unit_cost_snapshot`。

- [ ] **Step 3: 运行数据库测试并确认失败**

Run: `npx supabase start && npx supabase db reset && npx supabase test db`

Expected: FAIL，提示业务表或角色函数不存在。

- [ ] **Step 4: 建立 8 张表和数据库约束**

在 `202609300001_core_schema.sql` 精确建立 `users`、`products`、`customers`、`stock_in_orders`、`stock_in_items`、`sales_orders`、`sales_order_items`、`stock_records`，字段与设计规格第 8 节一致。禁止直接更新 `products.stock_qty`，并禁止更新或删除已确认业务记录。

- [ ] **Step 5: 建立角色函数、RLS 与列级保护**

在 `202609300002_role_helpers_and_rls.sql` 建立角色帮助函数、启用全部表的 RLS，并撤销认证用户对成本列和敏感表的直接读取。所有 `security definer` 函数固定 `search_path`，并检查账号为 `active`。

- [ ] **Step 6: 生成前端数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: 类型文件包含 8 张表和全部枚举。

- [ ] **Step 7: 验证数据库**

Run: `npx supabase db reset && npx supabase test db`

Expected: 两个 pgTAP 文件全部 PASS。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations supabase/tests/database src/lib/database.types.ts
git commit -m "feat: add core schema and role boundaries"
```

### Task 3: 登录、角色状态与左侧导航外壳

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/app-error.ts`
- Create: `src/auth/auth.types.ts`
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/AuthProvider.test.tsx`
- Create: `src/auth/ProtectedRoute.tsx`
- Create: `src/auth/ProtectedRoute.test.tsx`
- Create: `src/auth/LoginPage.tsx`
- Create: `src/auth/LoginPage.test.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/app/routes.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `Database` 类型、Supabase Auth、`users.role/status`。
- Produces: `useAuth(): { user; profile; loading; signIn(email, password); signOut() }`；`ProtectedRoute({ allow?: AppRole[] })`；带左侧导航的 `AppShell`。

- [ ] **Step 1: 写认证和路由失败测试**

断言未登录访问业务路由会进入登录页；`disabled` 用户被登出并显示“账号已停用”；店员访问 `/users` 会显示无权限；登录成功进入 `/dashboard`。

- [ ] **Step 2: 运行认证测试并确认失败**

Run: `npm test -- --run src/auth`

Expected: FAIL，原因是认证上下文和路由不存在。

- [ ] **Step 3: 实现 Supabase 客户端与错误类型**

导出 `supabase` 单例；实现 `toAppError(error: unknown): AppError`，统一映射登录失效、权限不足、重复值、网络未知和业务 RPC 错误。

- [ ] **Step 4: 实现认证状态和受保护路由**

`AuthProvider` 订阅 Supabase session，读取用户资料并拒绝禁用账号。`ProtectedRoute` 等待加载完成后检查登录和可选角色。

- [ ] **Step 5: 实现登录页与 A 布局外壳**

登录页仅包含邮箱、密码、登录按钮和错误提示。`AppShell` 使用左侧固定导航，店员不显示用户管理入口，所有页面使用 React Router 懒加载占位路由。

- [ ] **Step 6: 验证认证与构建**

Run: `npm test -- --run src/auth src/app/App.test.tsx && npm run build`

Expected: 全部 PASS，构建成功。

- [ ] **Step 7: Commit**

```bash
git add src/lib src/auth src/app
git commit -m "feat: add authentication and admin shell"
```

### Task 4: 玩具管理与图片

**Files:**
- Create: `supabase/tests/database/003_products.sql`
- Create: `supabase/migrations/202609300003_product_api_and_storage.sql`
- Create: `src/features/products/product.types.ts`
- Create: `src/features/products/products.api.ts`
- Create: `src/features/products/products.api.test.ts`
- Create: `src/features/products/ProductListPage.tsx`
- Create: `src/features/products/ProductListPage.test.tsx`
- Create: `src/features/products/ProductFormDrawer.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: `supabase`、当前角色和 `products` 表。
- Produces: `listProducts(filters: ProductFilters): Promise<ProductListItem[]>`，其中 `costPrice: number | null`；`createProduct(input: CreateProductInput): Promise<string>`；`updateProductPublic(id: string, input: PublicProductInput): Promise<void>`；`updateProductPricing(id: string, input: { costPrice: number; salePrice: number }): Promise<void>`；`setProductStatus(id: string, status: ProductStatus): Promise<void>`；`uploadProductImage(file: File): Promise<string>`。

- [ ] **Step 1: 写商品数据库权限失败测试**

断言店主可创建商品并读取成本；店员列表中的 `cost_price` 为 `null`，不能创建、停用、修改货号/售价/成本；店员可更新获准的非敏感字段；重复货号和负价格失败。

- [ ] **Step 2: 写商品页面失败测试**

断言店主表格出现成本列和新增按钮；店员看不到二者；库存字段只读；图片上传失败时保留其他表单值并出现重试操作。

- [ ] **Step 3: 运行测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/products`

Expected: FAIL，商品 RPC、Storage 策略和页面不存在。

- [ ] **Step 4: 实现商品数据库 API 和 Storage 策略**

提供 `list_products(p_query text, p_status product_status) returns table(id uuid, sku text, barcode text, name text, category text, brand text, age_range text, sale_price numeric, cost_price numeric, stock_qty integer, low_stock_threshold integer, image_path text, status product_status)`、`create_product(p_sku text, p_barcode text, p_name text, p_category text, p_brand text, p_age_range text, p_cost_price numeric, p_sale_price numeric, p_low_stock_threshold integer, p_image_path text) returns uuid`、`update_product_public(p_id uuid, p_barcode text, p_name text, p_category text, p_brand text, p_age_range text, p_low_stock_threshold integer, p_image_path text) returns void`、`update_product_pricing(p_id uuid, p_cost_price numeric, p_sale_price numeric) returns void` 和 `set_product_status(p_id uuid, p_status product_status) returns void`。函数在数据库内检查角色，`list_products` 对店员返回空成本；创建 `product-images` bucket，允许 active 店主或店员读取和上传，只有店主可以删除。

- [ ] **Step 5: 重新生成数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: `Database["public"]["Functions"]` 包含五个商品函数。

- [ ] **Step 6: 实现商品客户端与页面**

实现筛选、列表、店主创建、按角色编辑、停用和图片重试。表单验证名称、货号、分类、成本、售价必填且合法。

- [ ] **Step 7: 验证商品模块**

Run: `npx supabase db reset && npx supabase test db && npm test -- --run src/features/products && npm run build`

Expected: 全部 PASS，店员返回数据不含成本值。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/202609300003_product_api_and_storage.sql supabase/tests/database/003_products.sql src/features/products src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add product management"
```

### Task 5: 入库与库存流水

**Files:**
- Create: `supabase/tests/database/004_stock_in.sql`
- Create: `supabase/migrations/202609300004_stock_in_api.sql`
- Create: `src/features/stock/stock.types.ts`
- Create: `src/features/stock/stock.api.ts`
- Create: `src/features/stock/stock.api.test.ts`
- Create: `src/features/stock/StockInPage.tsx`
- Create: `src/features/stock/StockInPage.test.tsx`
- Create: `src/features/stock/StockLedgerPage.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: 商品目录和当前用户。
- Produces: `saveStockInDraft(input: StockInDraftInput): Promise<string>`；`postStockIn(orderId: string): Promise<void>`；`getStockIn(id: string): Promise<StockInDetail>`；`listStockRecords(filters: StockRecordFilters): Promise<StockRecord[]>`；RPC `post_stock_in(p_order_id uuid) returns void`。

- [ ] **Step 1: 写入库事务失败测试**

以恐龙积木库存 0 创建入库 10 件，断言确认后库存 10、正向流水一条、状态 `posted`；再次确认仍为 10 且流水仍一条；非正整数、重复商品行和已确认单据修改失败。

- [ ] **Step 2: 写入库页面失败测试**

断言草稿可保存和恢复；确认按钮提交时禁用；请求超时后页面调用 `getStockIn` 重新确认状态，不直接重复 `postStockIn`。

- [ ] **Step 3: 运行测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/stock`

Expected: FAIL，入库函数和页面不存在。

- [ ] **Step 4: 实现入库数据库函数**

`post_stock_in` 锁定入库单，校验草稿及明细，原子增加库存、创建唯一来源流水并记录确认人/时间；对已 `posted` 的重复调用返回成功但不重复变更。

- [ ] **Step 5: 重新生成数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: 类型文件包含 `post_stock_in`。

- [ ] **Step 6: 实现入库和流水页面**

入库页支持草稿、编辑、确认和详情；流水页按玩具、日期、入库/出库来源筛选。未知提交结果使用单据状态回查流程。

- [ ] **Step 7: 验证入库模块**

Run: `npx supabase db reset && npx supabase test db && npm test -- --run src/features/stock && npm run build`

Expected: 全部 PASS，库存与流水合计一致。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/202609300004_stock_in_api.sql supabase/tests/database/004_stock_in.sql src/features/stock src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add stock intake and ledger"
```

### Task 6: 客户管理与散客选择

**Files:**
- Create: `src/features/customers/customer.types.ts`
- Create: `src/features/customers/customers.api.ts`
- Create: `src/features/customers/customers.api.test.ts`
- Create: `src/features/customers/CustomerListPage.tsx`
- Create: `src/features/customers/CustomerListPage.test.tsx`
- Create: `src/features/customers/CustomerDrawer.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: `customers` RLS CRUD。
- Produces: `listCustomers(query: string): Promise<Customer[]>`、`saveCustomer(input: CustomerInput): Promise<string>`、`deleteCustomer(id: string): Promise<void>`；订单选择器使用 `CustomerOption | null`，`null` 表示散客。

- [ ] **Step 1: 写客户模块失败测试**

断言客户姓名必填、电话以文本保存、可以按姓名或电话查询、散客选项返回 `null`、已有关联订单的客户删除会显示“已有订单，不能删除”。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/customers`

Expected: FAIL，客户 API 和页面不存在。

- [ ] **Step 3: 实现客户 API 和页面**

实现列表、新增、编辑、删除错误映射和客户抽屉；列表提供姓名/电话搜索，并为销售订单导出散客选项。

- [ ] **Step 4: 验证客户模块**

Run: `npm test -- --run src/features/customers && npm run build`

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/customers src/app/routes.tsx
git commit -m "feat: add customer management"
```

### Task 7: 销售订单草稿与直接确认

**Files:**
- Create: `supabase/tests/database/005_sales_order_save.sql`
- Create: `supabase/migrations/202609300005_sales_order_save_api.sql`
- Create: `src/features/sales/sales.types.ts`
- Create: `src/features/sales/sales.api.ts`
- Create: `src/features/sales/sales.api.test.ts`
- Create: `src/features/sales/SalesOrderListPage.tsx`
- Create: `src/features/sales/SalesOrderEditPage.tsx`
- Create: `src/features/sales/SalesOrderEditPage.test.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: 商品目录、客户选项和订单表。
- Produces: `saveSalesOrder(input: { id?: string; customerId: string | null; remark?: string; items: { productId: string; quantity: number }[]; confirm: boolean }): Promise<string>`；`getSalesOrder(id: string): Promise<SalesOrderDetail>`；`listSalesOrders(filters: SalesOrderFilters): Promise<SalesOrderListItem[]>`；`cancelSalesOrder(id: string): Promise<void>`；RPC `save_sales_order(p_order_id uuid, p_customer_id uuid, p_remark text, p_items jsonb, p_confirm boolean) returns uuid`、`get_sales_order(p_order_id uuid) returns jsonb`、`cancel_sales_order(p_order_id uuid) returns void`。

- [ ] **Step 1: 写订单保存数据库失败测试**

断言请求只提交商品 ID 和数量，数据库从当前商品复制售价及名称/货号快照并计算总额；保存草稿得到 `draft`；全新订单以 `p_confirm=true` 直接得到 `pending_shipment`；草稿确认走同一函数；停用商品、空明细、非正数量失败。

- [ ] **Step 2: 写订单编辑页失败测试**

断言售价字段只读且请求中不存在 price/discount；页面同时显示“保存草稿”和“确认订单”；直接确认不会先调用保存草稿；三个 100 元商品显示总额 300 元。

- [ ] **Step 3: 运行测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/sales/SalesOrderEditPage.test.tsx src/features/sales/sales.api.test.ts`

Expected: FAIL，订单保存 RPC 和页面不存在。

- [ ] **Step 4: 实现订单保存 RPC**

`save_sales_order` 校验订单仍为草稿或新建，合并重复商品行。新加入商品从 `products` 复制在售状态、名称、货号和售价；编辑已有草稿时，相同商品保留原售价快照。函数替换明细、计算总额并按 `p_confirm` 保存为草稿或待出库，客户端价格字段一律忽略。`get_sales_order` 根据当前角色构造详情 JSON，店员响应不含成本字段；`cancel_sales_order` 只允许取消草稿或待出库订单。

- [ ] **Step 5: 重新生成数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: 类型文件包含 `save_sales_order`、`get_sales_order` 和 `cancel_sales_order`。

- [ ] **Step 6: 实现订单列表与编辑页**

实现散客、商品选择、数量、只读售价、实时总额、可选草稿、直接确认、草稿恢复和取消。列表按订单号、客户、订单状态、收款状态和日期筛选。

- [ ] **Step 7: 验证订单保存流程**

Run: `npx supabase db reset && npx supabase test db && npm test -- --run src/features/sales && npm run build`

Expected: 全部 PASS，两条创建路径均得到正确状态和 300 元总额。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/202609300005_sales_order_save_api.sql supabase/tests/database/005_sales_order_save.sql src/features/sales src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add sales order drafting and confirmation"
```

### Task 8: 原子出库与二态收款

**Files:**
- Create: `supabase/tests/database/006_shipment_payment.sql`
- Create: `supabase/migrations/202609300006_shipment_payment_api.sql`
- Create: `src/features/sales/SalesOrderDetailPage.tsx`
- Create: `src/features/sales/SalesOrderDetailPage.test.tsx`
- Modify: `src/features/sales/sales.api.ts`
- Modify: `src/features/sales/sales.api.test.ts`
- Modify: `src/features/sales/sales.types.ts`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: `getSalesOrder`、待出库订单和商品库存。
- Produces: `shipSalesOrder(id: string): Promise<void>`；`markSalesOrderPaid(id: string, method: PaymentMethod): Promise<void>`；`revertSalesOrderPayment(id: string): Promise<void>`；对应 RPC `ship_sales_order(p_order_id uuid)`、`mark_sales_order_paid(p_order_id uuid, p_payment_method payment_method)`、`revert_sales_order_payment(p_order_id uuid)`。

- [ ] **Step 1: 写出库、并发和收款数据库失败测试**

用成本 60、售价 100、库存 10 的恐龙积木验证出库 3 件后库存 7、成本快照 60、负向流水一条、订单完成；重复出库不重复扣减；库存 7 出库 8 完全失败。用两个并发事务争抢最后一件，断言仅一个成功且库存不低于 0。验证未完成订单不能收款、完成订单可从 `unpaid` 到 `paid`、重复标记不重复变更、只有店主可以撤销。

- [ ] **Step 2: 写详情页失败测试**

断言店员详情响应不含成本字段；待出库显示出库按钮；完成未收款显示付款方式和“标记已收款”；已收款只显示状态，店主额外显示撤销按钮。出库请求超时后必须调用 `getSalesOrder`，状态仍待出库时才开放重试。

- [ ] **Step 3: 运行测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/sales/SalesOrderDetailPage.test.tsx`

Expected: FAIL，出库、收款函数和详情页不存在。

- [ ] **Step 4: 实现出库和收款 RPC**

`ship_sales_order` 按固定顺序锁定订单和商品，整单校验库存，复制当前成本，扣减库存并写唯一流水；已完成订单重复调用返回成功但不重复变更。收款和撤销函数检查订单状态、角色和当前收款状态，并记录人员与时间。

- [ ] **Step 5: 重新生成数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: 类型文件包含三个出库和收款函数。

- [ ] **Step 6: 实现安全订单详情接口和页面**

详情 RPC 根据角色对店员返回空成本；页面实现按状态显示操作、按钮防重、未知结果回查和业务错误提示。

- [ ] **Step 7: 验证关键闭环**

Run: `npx supabase db reset && npx supabase test db && npm test -- --run src/features/sales && npm run build`

Expected: 全部 PASS，库存、流水、成本快照和收款状态符合固定案例。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/202609300006_shipment_payment_api.sql supabase/tests/database/006_shipment_payment.sql src/features/sales src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add atomic shipment and payment state"
```

### Task 9: 角色化经营首页与低库存提醒

**Files:**
- Create: `supabase/tests/database/007_dashboard.sql`
- Create: `supabase/migrations/202609300007_dashboard_api.sql`
- Create: `src/features/dashboard/dashboard.types.ts`
- Create: `src/features/dashboard/dashboard.api.ts`
- Create: `src/features/dashboard/dashboard.api.test.ts`
- Create: `src/features/dashboard/DashboardPage.tsx`
- Create: `src/features/dashboard/DashboardPage.test.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: 已完成订单、成本快照、收款状态、当前库存和用户角色。
- Produces: `getDashboard(range: DateRange): Promise<OwnerDashboard | StaffDashboard>`；`listLowStockProducts(): Promise<LowStockProduct[]>`；RPC `get_dashboard(p_from date, p_to date) returns jsonb`、`list_low_stock_products() returns table(id uuid, sku text, name text, stock_qty integer, low_stock_threshold integer)`。店主返回销售额、成本、毛利润和订单数，店员返回销售额、订单数及待出库数。

- [ ] **Step 1: 写统计和权限失败测试**

以固定案例断言店主销售额 300、成本 180、毛利润 120；店员响应对象不包含 `cost` 或 `grossProfit` 键；销售额按出库日期统计；低库存条件为 `stock_qty <= low_stock_threshold` 且商品在售。

- [ ] **Step 2: 写首页失败测试**

断言店主看到销售额、成本、毛利润、订单数和低库存；店员只看到销售额、订单数、待出库和低库存；店员页面 DOM 中不存在“成本”和“毛利润”。

- [ ] **Step 3: 运行测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/dashboard`

Expected: FAIL，统计 RPC 和首页不存在。

- [ ] **Step 4: 实现角色化统计 API**

数据库按 `current_user_role()` 返回不同结构，店员路径不选择成本列。统计只包含 `completed` 订单，使用 `shipped_at` 作为销售日期。

- [ ] **Step 5: 重新生成数据库类型**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Expected: 类型文件包含角色化统计和低库存函数。

- [ ] **Step 6: 实现首页**

使用角色判别渲染指标卡、最近订单和低库存列表，保持 A 方案左侧导航布局。

- [ ] **Step 7: 验证首页**

Run: `npx supabase db reset && npx supabase test db && npm test -- --run src/features/dashboard && npm run build`

Expected: 全部 PASS，店员 API 和 DOM 都无利润数据。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/202609300007_dashboard_api.sql supabase/tests/database/007_dashboard.sql src/features/dashboard src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add role-aware dashboard"
```

### Task 10: 店主用户管理

**Files:**
- Create: `supabase/functions/admin-users/index.ts`
- Create: `supabase/functions/admin-users/index.test.ts`
- Create: `src/features/users/users.types.ts`
- Create: `src/features/users/users.api.ts`
- Create: `src/features/users/users.api.test.ts`
- Create: `src/features/users/UserManagementPage.tsx`
- Create: `src/features/users/UserManagementPage.test.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: Supabase Auth 管理接口、当前用户 JWT 和 `users` 表。
- Produces: Edge Function 操作 `list`、`create`、`set-status`；前端 `listUsers()`、`createStaff({ email, name, password })`、`setUserStatus(id, status)`。

- [ ] **Step 1: 写 Edge Function 权限失败测试**

断言无 JWT 返回 401、店员返回 403、店主可列出用户和创建 `staff`、请求不能创建第二个 `owner`、停用账号后该账号无法继续访问业务数据。

- [ ] **Step 2: 写用户管理页失败测试**

断言仅店主路由可见；表单要求邮箱、姓名和密码；成功后刷新列表；不能停用当前登录的店主账号。

- [ ] **Step 3: 运行测试并确认失败**

Run: `deno test supabase/functions/admin-users/index.test.ts --allow-env && npm test -- --run src/features/users`

Expected: FAIL，Edge Function 和页面不存在。

- [ ] **Step 4: 实现受保护的用户管理函数**

Edge Function 从 Authorization header 验证调用者，查询其 `users` 资料并要求 `owner/active`，再使用服务端密钥调用 Auth Admin API；创建 Auth 用户后写入 `users` 资料，资料写入失败时立即删除刚创建的 Auth 用户。服务端密钥只存在于函数环境变量。

- [ ] **Step 5: 实现用户管理页面**

提供账号列表、新建店员和启用/停用；不提供角色提升入口。

- [ ] **Step 6: 验证用户管理**

Run: `deno test supabase/functions/admin-users/index.test.ts --allow-env && npm test -- --run src/features/users && npm run build`

Expected: 全部 PASS，服务端密钥未进入前端构建。

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/admin-users src/features/users src/app/routes.tsx
git commit -m "feat: add owner user management"
```

### Task 11: 端到端验收、部署与操作文档

**Files:**
- Create: `e2e/auth.setup.ts`
- Create: `e2e/core-flow.spec.ts`
- Create: `e2e/permissions.spec.ts`
- Create: `e2e/error-recovery.spec.ts`
- Create: `scripts/seed-e2e.sql`
- Create: `vercel.json`
- Create: `docs/operations/setup-and-deploy.md`
- Create: `docs/operations/acceptance-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1-10 的全部页面、RPC 和角色。
- Produces: 可重复的本地环境、固定验收数据、生产部署说明和完整验收记录模板。

- [ ] **Step 1: 写固定业务端到端测试**

`core-flow.spec.ts` 使用店主创建恐龙积木（成本 60、售价 100），入库 10，使用“直接确认订单”销售 3 件，出库并标记已收款；断言订单 300、库存 7、成本 180、毛利润 120。再把商品售价改为 120，断言历史订单仍为 300。

- [ ] **Step 2: 写权限和恢复端到端测试**

`permissions.spec.ts` 断言店员看不到成本、利润、用户管理、停用和撤销收款。`error-recovery.spec.ts` 模拟出库响应超时，断言页面回查状态且不重复扣库存；验证库存不足时订单和库存保持原状。

- [ ] **Step 3: 运行端到端测试并确认失败**

Run: `npm run test:e2e`

Expected: 首次 FAIL，原因是测试账号、种子或部署配置尚未建立。

- [ ] **Step 4: 建立可重复的测试种子与运行说明**

`scripts/seed-e2e.sql` 创建固定商品和业务前置数据；`auth.setup.ts` 通过测试环境安全配置生成店主和店员会话。文档说明本地 Supabase、环境变量、迁移、Edge Function、Storage 和测试命令。

- [ ] **Step 5: 完成 Vercel 和生产配置说明**

`vercel.json` 配置 SPA 路由回退。部署文档列出 Supabase URL、公开 anon key、Edge Function secret、认证回调、数据库迁移、备份启用、首个店主账号创建和回滚步骤；不得记录真实密钥。

- [ ] **Step 6: 执行全量验证**

Run: `npm test -- --run && npx supabase db reset && npx supabase test db && npm run test:e2e && npm run build`

Expected: 单元、数据库、端到端测试全部 PASS；生产构建成功；固定案例的 300/7/180/120 全部匹配。

- [ ] **Step 7: 完成验收记录**

在 `docs/operations/acceptance-checklist.md` 逐项记录固定案例、权限案例、重复提交、库存不足、并发出库、登录失效、图片重试和生产配置检查结果。

- [ ] **Step 8: Commit**

```bash
git add e2e scripts/seed-e2e.sql vercel.json docs/operations README.md
git commit -m "test: add end-to-end acceptance and deployment guide"
```

## Final Verification

- [ ] `git status --short` 无意外文件。
- [ ] `npm test -- --run` 全部 PASS。
- [ ] `npx supabase db reset && npx supabase test db` 全部 PASS。
- [ ] `npm run test:e2e` 全部 PASS。
- [ ] `npm run build` 成功，无 TypeScript 错误。
- [ ] 店主固定案例显示销售额 300、成本 180、毛利润 120、库存 7。
- [ ] 店员通过 UI、REST 和 RPC 均无法取得成本或利润。
- [ ] 设计规格中列为第一版不做的功能没有出现在实现或导航中。
