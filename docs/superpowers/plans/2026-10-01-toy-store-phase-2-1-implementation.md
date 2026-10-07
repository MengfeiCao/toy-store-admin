# 玩具店管理后台 2.1 商品、采购与库存基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 MVP 上交付供应商、采购单、分批到货、采购付款、盘点、库存调整、库存预警和手工入库退役的完整可用闭环。

**Architecture:** 沿用 React feature 目录与 Supabase RPC 架构，按商品/供应商、采购单、到货付款、库存控制四个纵向批次交付。关键写操作全部由 PostgreSQL `security definer` 函数完成，使用行锁、唯一约束和客户端请求 UUID 保证原子性、并发安全与幂等；前端只负责交互、校验提示和状态回查。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、React Router 7、Ant Design 5、Supabase Auth/PostgreSQL/Storage、Vitest、Testing Library、pgTAP、Playwright

**Spec:** `docs/superpowers/specs/2026-10-01-toy-store-phase-2-1-design.md`

## Global Constraints

- 单门店、单仓库、单一币种，不抽象门店或仓库维度。
- 正常进货统一走采购到货；旧手工入库只读，数据库拒绝新增、编辑和确认。
- 采购付款仅支持未付款到已付清，不支持部分付款、预付款或撤销。
- 到货、盘点和调整必须事务化，库存不得为负，不能产生部分流水。
- 采购与到货保存名称、货号和采购价快照；到货将商品当前成本更新为本批采购价。
- 店员仅可在采购业务接口读取采购金额，商品、库存、首页和报表接口不得返回成本或毛利润。
- 已确认采购、到货、付款、已确认盘点、调整和流水不可直接修改或删除。
- 新增向前迁移，不修改现有 `202609300001` 至 `202609300013` 迁移。
- 新增和修改页面使用 Ant Design；不在 2.1 重写未触及的 MVP 页面。
- 每个任务遵循红—绿测试循环、独立验证、Git 差异检查和独立提交。

## Review Focus

- 同一请求 ID 携带不同采购、到货或调整内容时必须返回 `REQUEST_ID_CONFLICT`，不得误返回旧结果；Task 4、Task 6 数据库测试覆盖。
- 两个并发到货请求争抢同一剩余数量时最多一个成功，累计到货不得超额；Task 4 并发测试覆盖。
- 两个并发负向调整争抢库存时库存不得为负，失败事务不得留下单据或流水；Task 6 并发测试覆盖。
- 盘点创建后发生采购到货、销售出库或调整时，旧盘点整单拒绝确认；Task 6 行为测试覆盖。
- 店员能在采购页面查看采购价，但无法通过产品、库存、首页、REST 或其他 RPC 获取成本与毛利润；Task 2、Task 3、Task 7 权限测试覆盖。

---

### Task 1: 业务错误映射与商品资料完善

**Files:**
- Modify: `src/lib/app-error.ts`
- Modify: `src/lib/app-error.test.ts`
- Modify: `src/features/products/products.api.ts`
- Modify: `src/features/products/products.api.test.ts`
- Modify: `src/features/products/ProductFormDrawer.tsx`
- Modify: `src/features/products/ProductFormDrawer.test.tsx`
- Modify: `src/features/products/ProductListPage.tsx`

**Interfaces:**
- Consumes: 现有 `toAppError`、商品 RPC 和 `product-images` Storage bucket。
- Produces: 规格第 9 节业务错误码的中文映射；`getProductImageUrl(path: string): string`；使用 Ant Design `Drawer/Form/Upload/Image/InputNumber` 的商品表单。

- [ ] **Step 1: 写错误码和商品交互失败测试**

断言 `SUPPLIER_INACTIVE`、`OVER_RECEIPT`、`STOCK_COUNT_STALE`、`INSUFFICIENT_STOCK`、`REQUEST_ID_CONFLICT`、`MANUAL_STOCK_IN_DISABLED` 映射为明确中文；商品表单支持条码、预警值、单图上传预览、失败重试且保留字段值。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/app-error.test.ts src/features/products`

Expected: FAIL，现有错误映射和原生商品表单不满足断言。

- [ ] **Step 3: 实现最小错误映射与 Ant Design 商品表单**

保留既有商品 API 行为；`getProductImageUrl` 使用 Storage `getPublicUrl`。上传限制为一张图片，失败保留待上传文件和其他表单状态；店员仍看不到成本/售价控件。

- [ ] **Step 4: 验证商品模块与构建**

Run: `npm test -- --run src/lib/app-error.test.ts src/features/products && npm run build`

Expected: PASS；生产构建成功。

- [ ] **Step 5: Commit**

```bash
git add src/lib src/features/products
git commit -m "feat: complete product media and validation"
```

### Task 2: 供应商数据库、权限与页面

**Files:**
- Create: `supabase/migrations/202610010001_suppliers.sql`
- Create: `supabase/tests/database/008_suppliers.sql`
- Create: `src/features/suppliers/supplier.types.ts`
- Create: `src/features/suppliers/suppliers.api.ts`
- Create: `src/features/suppliers/suppliers.api.test.ts`
- Create: `src/features/suppliers/SupplierListPage.tsx`
- Create: `src/features/suppliers/SupplierListPage.test.tsx`
- Create: `src/features/suppliers/SupplierDrawer.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: `supabase`、当前 active 用户与现有错误映射。
- Produces: `SupplierStatus`、`SupplierListItem`、`SupplierInput`；`listSuppliers(filters)`、`createSupplier(input)`、`updateSupplier(id,input)`、`setSupplierStatus(id,status)`；`SupplierListPage`。

- [ ] **Step 1: 写供应商数据库失败测试**

断言表、枚举、RLS、创建人和更新时间存在；未登录/禁用用户不能访问；active 店主和店员可增改及启停；不提供 DELETE 权限；停用供应商仍可查询。

- [ ] **Step 2: 运行数据库测试并确认失败**

Run: `npx supabase test db`

Expected: FAIL，供应商结构和策略不存在。

- [ ] **Step 3: 实现供应商迁移**

新增 `supplier_status`、`suppliers`、更新时间触发器、RLS 与最小 CRUD 策略；名称只要求非空，不添加未经规格确认的唯一限制。

- [ ] **Step 4: 写供应商 API 与页面失败测试**

断言搜索、空态、新增、编辑、停用/启用、提交禁用和错误保留；店主与店员均可操作。

- [ ] **Step 5: 实现供应商 API、Ant Design 页面与路由**

页面使用 `Table`、`Form`、`Drawer`、`Popconfirm`、`Tag` 和 `message`；API 只暴露规格中的字段。

- [ ] **Step 6: 生成类型并验证供应商模块**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Run: `npx supabase test db && npm test -- --run src/features/suppliers && npm run build`

Expected: 数据库、前端测试和构建全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202610010001_suppliers.sql supabase/tests/database/008_suppliers.sql src/features/suppliers src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add supplier management"
```

### Task 3: 采购单草稿、确认、取消与页面

**Files:**
- Create: `supabase/migrations/202610010002_purchase_orders.sql`
- Create: `supabase/tests/database/009_purchase_orders.sql`
- Create: `src/features/purchases/purchase.types.ts`
- Create: `src/features/purchases/purchases.api.ts`
- Create: `src/features/purchases/purchases.api.test.ts`
- Create: `src/features/purchases/PurchaseOrderListPage.tsx`
- Create: `src/features/purchases/PurchaseOrderListPage.test.tsx`
- Create: `src/features/purchases/PurchaseOrderEditPage.tsx`
- Create: `src/features/purchases/PurchaseOrderEditPage.test.tsx`
- Create: `src/features/purchases/PurchaseOrderDetailPage.tsx`
- Create: `src/features/purchases/PurchaseOrderDetailPage.test.tsx`
- Modify: `src/lib/database.types.ts`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: 商品列表、供应商列表、active 用户和 `payment_status`。
- Produces: `PurchaseOrderStatus`、`PurchaseOrderListItem`、`PurchaseOrderDetail`、`PurchaseOrderDraftInput`；`listPurchaseOrders`、`getPurchaseOrder`、`savePurchaseOrderDraft`、`confirmPurchaseOrder`、`cancelPurchaseOrder`。

- [ ] **Step 1: 写采购单行为与权限失败测试**

实际调用 RPC 验证草稿保存、服务端金额计算、确认冻结、停用供应商拒绝、重复商品拒绝、未到货未付款可取消、未登录/禁用用户拒绝，以及店员采购接口可读单价但商品接口仍无成本。

- [ ] **Step 2: 运行数据库测试并确认失败**

Run: `npx supabase test db`

Expected: FAIL，采购结构和 RPC 不存在。

- [ ] **Step 3: 实现采购迁移与 RPC**

新增采购状态、订单和明细表、编号生成、保护触发器、RLS，以及 `list_purchase_orders`、`get_purchase_order`、`save_purchase_order_draft`、`confirm_purchase_order`、`cancel_purchase_order`。快照和总额均由服务端写入。

- [ ] **Step 4: 写采购 API 与页面失败测试**

断言列表筛选、新建/编辑草稿、商品行增删、金额实时展示、确认、取消、详情状态和错误保留。

- [ ] **Step 5: 实现采购 API 与 Ant Design 页面**

采购编辑使用完整页面与 `Form.List`/`Table`/`InputNumber`；详情页先交付基础信息、状态和操作区，为 Task 5 到货与付款扩展保留明确组件边界。

- [ ] **Step 6: 生成类型并验证采购模块**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Run: `npx supabase test db && npm test -- --run src/features/purchases && npm run build`

Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202610010002_purchase_orders.sql supabase/tests/database/009_purchase_orders.sql src/features/purchases src/lib/database.types.ts src/app/routes.tsx
git commit -m "feat: add purchase order workflow"
```

### Task 4: 分批到货与采购付款数据库事务

**Files:**
- Create: `supabase/migrations/202610010003_purchase_receipts_payments.sql`
- Create: `supabase/tests/database/010_purchase_receipts_payments.sql`
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Consumes: Task 3 采购表与商品库存保护机制。
- Produces: `post_purchase_receipt(p_request_id uuid,p_purchase_order_id uuid,p_remark text,p_items jsonb) returns uuid`；`mark_purchase_order_paid(p_request_id uuid,p_purchase_order_id uuid) returns uuid`；到货/付款列表与详情 RPC。

- [ ] **Step 1: 写到货、幂等、并发和付款失败测试**

覆盖 10 件采购分两次 4+6 到货、状态变化、库存与成本、正向流水、超额回滚、相同请求重放、相同 ID 不同内容冲突、两个并发请求争抢剩余数量，以及一次性付款和重复付款。

- [ ] **Step 2: 运行数据库测试并确认失败**

Run: `npx supabase test db`

Expected: FAIL，到货与付款结构和函数不存在。

- [ ] **Step 3: 实现到货和付款迁移**

新增到货单/明细、付款表、`stock_records.purchase_receipt_item_id`、唯一索引和扩展来源约束；关键函数锁定采购、明细和商品，在同一事务写单据、库存、成本、累计数量和流水。

- [ ] **Step 4: 运行行为与并发测试**

Run: `npx supabase test db`

Expected: 包含真实状态和数量断言的全部测试 PASS；重复请求不增加库存或付款记录。

- [ ] **Step 5: 生成类型并验证完整数据库套件**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Run: `npx supabase test db`

Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202610010003_purchase_receipts_payments.sql supabase/tests/database/010_purchase_receipts_payments.sql src/lib/database.types.ts
git commit -m "feat: add atomic purchase receiving and payment"
```

### Task 5: 到货、付款与采购详情界面

**Files:**
- Modify: `src/features/purchases/purchase.types.ts`
- Modify: `src/features/purchases/purchases.api.ts`
- Modify: `src/features/purchases/purchases.api.test.ts`
- Modify: `src/features/purchases/PurchaseOrderDetailPage.tsx`
- Modify: `src/features/purchases/PurchaseOrderDetailPage.test.tsx`
- Create: `src/features/purchases/PurchaseReceiptDrawer.tsx`
- Create: `src/features/purchases/PurchaseReceiptListPage.tsx`
- Create: `src/features/purchases/PurchaseReceiptListPage.test.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: Task 4 RPC。
- Produces: `postPurchaseReceipt(input)`、`markPurchaseOrderPaid(orderId,requestId)`、`listPurchaseReceipts(filters)`、`getPurchaseReceipt(id)`；采购详情到货进度、付款状态和历史到货列表。

- [ ] **Step 1: 写到货和付款交互失败测试**

断言只显示剩余明细、数量上限、固定请求 ID、提交禁用、超时按请求 ID 回查、重复请求显示原结果、付款确认与状态刷新。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/purchases`

Expected: FAIL，界面和客户端函数尚不存在。

- [ ] **Step 3: 实现到货 API、抽屉、列表和付款操作**

首次打开动作时生成 `crypto.randomUUID()`，重试沿用；到货数量只允许 `1..remainingQuantity`；技术超时先查询请求结果。

- [ ] **Step 4: 验证采购前端与构建**

Run: `npm test -- --run src/features/purchases && npm run build`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/purchases src/app/routes.tsx
git commit -m "feat: add purchase receiving interface"
```

### Task 6: 盘点与库存调整数据库事务

**Files:**
- Create: `supabase/migrations/202610010004_inventory_controls.sql`
- Create: `supabase/tests/database/011_inventory_controls.sql`
- Create: `supabase/tests/database/012_phase_2_1_permissions.sql`
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Consumes: 商品、库存保护和扩展后的 `stock_records`。
- Produces: 当前库存/预警查询；`create_stock_count`、`save_stock_count_draft`、`confirm_stock_count`、`cancel_stock_count`；`post_stock_adjustment`；盘点/调整列表和详情 RPC。

- [ ] **Step 1: 写盘点、调整、权限和并发失败测试**

覆盖全部启用商品快照、草稿保存、无差异确认、正负差异调整、旧快照拒绝、重复确认、请求 ID 内容冲突、多商品整单回滚、符号规则和两个并发负向调整；验证店员库存查询不含成本。

- [ ] **Step 2: 运行数据库测试并确认失败**

Run: `npx supabase test db`

Expected: FAIL，盘点与调整结构/RPC 不存在。

- [ ] **Step 3: 实现盘点、调整与库存查询迁移**

新增盘点、盘点明细、调整、调整明细、`stock_records.stock_adjustment_item_id` 和来源约束；函数按稳定顺序锁定商品，检查快照或负库存，成功后一次性写调整与流水。

- [ ] **Step 4: 运行数据库行为测试**

Run: `npx supabase test db`

Expected: 全部 PASS，过期盘点和失败调整不修改任何库存或流水。

- [ ] **Step 5: 生成类型并复验**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Run: `npx supabase test db`

Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202610010004_inventory_controls.sql supabase/tests/database/011_inventory_controls.sql supabase/tests/database/012_phase_2_1_permissions.sql src/lib/database.types.ts
git commit -m "feat: add stock counts and adjustments"
```

### Task 7: 当前库存、盘点、调整和预警页面

**Files:**
- Create: `src/features/inventory/inventory.types.ts`
- Create: `src/features/inventory/inventory.api.ts`
- Create: `src/features/inventory/inventory.api.test.ts`
- Create: `src/features/inventory/InventoryPage.tsx`
- Create: `src/features/inventory/InventoryPage.test.tsx`
- Create: `src/features/inventory/StockCountListPage.tsx`
- Create: `src/features/inventory/StockCountDetailPage.tsx`
- Create: `src/features/inventory/StockCountPages.test.tsx`
- Create: `src/features/inventory/StockAdjustmentPage.tsx`
- Create: `src/features/inventory/StockAdjustmentPage.test.tsx`
- Create: `src/features/inventory/StockAlertsPage.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: Task 6 RPC。
- Produces: `listInventory`、`listStockAlerts`、`createStockCount`、`getStockCount`、`saveStockCountDraft`、`confirmStockCount`、`cancelStockCount`、`postStockAdjustment`、`listStockAdjustments`；对应路由页面。

- [ ] **Step 1: 写库存页面失败测试**

断言库存搜索与预警、盘点批量输入和差异、过期提示、确认回查、调整类型符号约束、原因必填、多商品提交、空态和店员无成本列。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/inventory`

Expected: FAIL，库存 feature 不存在。

- [ ] **Step 3: 实现库存 API 与 Ant Design 页面**

盘点使用完整页面与可编辑表格；直接调整使用完整表单；所有关键请求固定请求 UUID，超时先回查单据状态。

- [ ] **Step 4: 验证库存前端与构建**

Run: `npm test -- --run src/features/inventory && npm run build`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory src/app/routes.tsx
git commit -m "feat: add inventory control pages"
```

### Task 8: 手工入库退役、库存流水扩展与导航整合

**Files:**
- Create: `supabase/migrations/202610010005_retire_manual_stock_in.sql`
- Create: `supabase/tests/database/013_manual_stock_in_retirement.sql`
- Modify: `src/features/stock/stock.types.ts`
- Modify: `src/features/stock/stock.api.ts`
- Modify: `src/features/stock/stock.api.test.ts`
- Replace: `src/features/stock/StockInPage.tsx`
- Modify: `src/features/stock/StockInPage.test.tsx`
- Modify: `src/features/stock/StockLedgerPage.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Consumes: 所有 2.1 页面和库存来源。
- Produces: 只读 `listStockInHistory/getStockIn`；扩展后的 `StockRecordSource`；采购管理与库存管理导航分组。

- [ ] **Step 1: 写退役与流水失败测试**

断言数据库保存/确认手工入库返回 `MANUAL_STOCK_IN_DISABLED`；历史列表详情可读；库存流水正确显示销售、历史入库、采购到货、盘点和调整来源。

- [ ] **Step 2: 运行相关测试并确认失败**

Run: `npx supabase test db && npm test -- --run src/features/stock src/app/App.test.tsx`

Expected: FAIL，旧入口仍可写且导航/流水未扩展。

- [ ] **Step 3: 实现退役迁移与只读页面**

保留查询 RPC，将保存和确认 RPC 改为稳定业务错误；不删除旧表、草稿或流水。

- [ ] **Step 4: 整合导航、路由和库存流水**

加入供应商、采购单、采购到货、当前库存、盘点、调整、预警、历史手工入库入口；保留客户、销售和用户管理权限行为。

- [ ] **Step 5: 生成类型并验证集成**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts`

Run: `npx supabase test db && npm test -- --run src/features/stock src/app/App.test.tsx && npm run build`

Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202610010005_retire_manual_stock_in.sql supabase/tests/database/013_manual_stock_in_retirement.sql src/features/stock src/app src/lib/database.types.ts
git commit -m "feat: retire manual stock intake"
```

### Task 9: 2.1 端到端验收与操作文档

**Files:**
- Create: `e2e/purchase-inventory.spec.ts`
- Modify: `e2e/core-flow.spec.ts`
- Modify: `e2e/permissions.spec.ts`
- Modify: `scripts/seed-e2e.sql`
- Modify: `docs/operations/setup-and-deploy.md`
- Modify: `docs/operations/acceptance-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1–8 全部功能。
- Produces: 可重复运行的 2.1 端到端验收和更新后的本地操作说明。

- [ ] **Step 1: 写 2.1 浏览器验收**

覆盖供应商、10 件采购、4+6 分批到货、重复请求、付款、过期盘点、重新盘点、调整、预警和店员权限；将原销售闭环的库存准备从手工入库改为采购到货。

- [ ] **Step 2: 运行端到端测试并修复测试暴露的问题**

Run: `npm run setup:e2e`

Run: `npm run test:e2e:local`

Expected: 新旧全部浏览器案例 PASS。

- [ ] **Step 3: 更新运行说明和验收记录**

文档写明迁移、Storage、测试数据、手工入库退役、采购与盘点操作，不记录真实密钥。

- [ ] **Step 4: 执行全量验证**

Run: `npm test -- --run`

Run: `npx supabase db reset`

Run: `npx supabase test db`

Run: `npm run setup:e2e`

Run: `npm run test:e2e:local`

Run: `npm run build`

Expected: 单元/组件、数据库、浏览器和生产构建全部通过。

- [ ] **Step 5: 检查差异并 Commit**

```bash
git status --short
git diff --check
git add e2e scripts docs/operations README.md
git commit -m "test: complete phase 2.1 acceptance"
```
