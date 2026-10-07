# 玩具店管理后台 2.1 商品、采购与库存基础设计规格

## 1. 背景与目标

当前 MVP 已支持商品、手工入库、库存流水、客户、销售订单、整单出库、二态收款、经营首页和用户管理。2.1 阶段补齐正常采购和可靠库存管理，使门店形成下面的业务闭环：

```text
供应商 → 采购单 → 分批到货 → 当前库存与库存流水 → 一次性付款
                              ↓
                     盘点 / 盘盈 / 盘亏 / 报损 / 人工调整
                              ↓
                         库存预警与补货入口
```

本阶段的成功标准是店主和店员可以从供应商建档开始，完成采购确认、分批到货、采购付款、盘点和库存调整；所有库存变化都可追溯、可防重、不会产生负库存或部分落账。

## 2. 已确认的业务边界

- 单门店、单仓库和单一币种。
- 采购付款只有未付款和已付清，不支持分期付款、预付款和供应商对账。
- 采购到货可以分批，每项累计到货量不得超过采购数量。
- 到货后商品当前成本更新为本批采购价，不计算移动平均成本。
- 采购单与到货单保存商品名称、货号和采购价快照。
- 店员可以完成供应商、采购、到货、付款、盘点和库存调整。
- 店员可以在采购业务页面读取采购单价和总金额，但不能通过商品、库存、首页或报表接口读取商品成本和毛利润。
- 正常进货统一走采购到货。现有手工入库只保留历史查询，停止新增、编辑和确认。
- 非采购库存变化统一走盘点或库存调整。
- 本阶段不实现采购退货、采购付款撤销、审批流、条码扫描开单、打印、售后和经营报表。
- 本阶段完成可部署代码和操作文档，但不实际部署 Supabase 或 Vercel。

## 3. 实施方式与交付顺序

采用纵向业务闭环，每一批同时完成数据库、权限、前端页面和测试：

1. 商品条码、主图、库存预警值和供应商管理。
2. 采购单草稿、确认、取消、列表和详情。
3. 分批到货、采购付款、库存更新和历史到货查询。
4. 当前库存、盘点、库存调整、库存预警和手工入库只读化。

每一批都必须保持现有销售、出库、收款和角色权限测试通过，不采用先铺完所有数据库再统一做页面，也不采用先做静态页面再补业务规则。

## 4. 数据模型

### 4.1 枚举

新增：

- `supplier_status`：`active`、`inactive`。
- `purchase_order_status`：`draft`、`confirmed`、`partially_received`、`completed`、`cancelled`。
- `stock_count_status`：`draft`、`confirmed`、`cancelled`。
- `stock_adjustment_type`：`stock_count`、`surplus`、`shortage`、`damage`、`manual`。盘点生成的调整可能同时包含正负差异，因此使用独立的 `stock_count` 类型。

采购单继续复用现有 `payment_status` 的 `unpaid`、`paid`，不新增含义相同的付款状态枚举。

### 4.2 suppliers

- `id uuid` 主键。
- `name text`，必填。
- `contact_name text`，可空。
- `phone text`，可空。
- `address text`，可空。
- `remark text`，可空。
- `status supplier_status`，默认 `active`。
- `created_by uuid`、`created_at timestamptz`、`updated_at timestamptz`。

供应商不提供物理删除。已被采购单引用或暂时不合作时统一停用；停用供应商不可用于新采购单，但历史采购单继续显示其快照资料。

### 4.3 purchase_orders

- `id uuid` 主键。
- `order_no text`，服务端生成且唯一。
- `supplier_id uuid`，引用供应商。
- `supplier_name_snapshot text`。
- `status purchase_order_status`，默认 `draft`。
- `total_amount numeric(12,2)`，非负并由服务端计算。
- `payment_status payment_status`，默认 `unpaid`。
- `remark text`，可空。
- `created_by`、`created_at`、`updated_at`。
- `confirmed_by`、`confirmed_at`。
- `cancelled_by`、`cancelled_at`。

### 4.4 purchase_order_items

- `id uuid` 主键。
- `purchase_order_id uuid`。
- `product_id uuid`。
- `quantity integer`，大于零。
- `received_quantity integer`，默认零且范围为 `0..quantity`。
- `unit_cost numeric(12,2)`，非负。
- `product_name_snapshot text`。
- `sku_snapshot text`。
- 同一采购单内同一商品只能出现一次。

采购单确认后，供应商、明细、数量、采购价、快照和总金额均不可直接修改。

### 4.5 purchase_receipts

- `id uuid` 主键，同时作为客户端在重试时复用的请求 ID。
- `receipt_no text`，服务端生成且唯一。
- `purchase_order_id uuid`。
- `supplier_name_snapshot text`。
- `received_by uuid`。
- `received_at timestamptz`。
- `remark text`，可空。

到货单在事务成功时直接成为不可编辑记录，不建设到货草稿或到货取消状态。

### 4.6 purchase_receipt_items

- `id uuid` 主键。
- `purchase_receipt_id uuid`。
- `purchase_order_item_id uuid`。
- `product_id uuid`。
- `quantity integer`，大于零。
- `unit_cost_snapshot numeric(12,2)`，非负。
- `product_name_snapshot text`。
- `sku_snapshot text`。
- 同一到货单内同一采购明细只能出现一次。

### 4.7 supplier_payments

- `id uuid` 主键，同时作为客户端在重试时复用的请求 ID。
- `purchase_order_id uuid`，唯一。
- `amount numeric(12,2)`，等于采购单总金额。
- `paid_by uuid`。
- `paid_at timestamptz`。

每张采购单最多一条付款记录。付款记录不可编辑或删除。

### 4.8 stock_counts

- `id uuid` 主键。
- `count_no text`，服务端生成且唯一。
- `status stock_count_status`，默认 `draft`。
- `remark text`，可空。
- `created_by`、`created_at`、`updated_at`。
- `confirmed_by`、`confirmed_at`。
- `confirmation_request_id uuid`，确认成功后唯一且不可变。

新建盘点单时由服务端为全部启用商品生成盘点明细和账面库存快照。

### 4.9 stock_count_items

- `id uuid` 主键。
- `stock_count_id uuid`。
- `product_id uuid`。
- `product_name_snapshot text`。
- `sku_snapshot text`。
- `book_quantity integer`，非负。
- `actual_quantity integer`，草稿阶段可空，填写后必须非负。
- `difference_quantity integer`，确认时由服务端计算为实际数量减账面数量。
- 同一盘点单内同一商品只能出现一次。

### 4.10 stock_adjustments

- `id uuid` 主键，同时作为客户端重试复用的请求 ID；盘点确认生成的调整使用盘点确认请求 ID。
- `adjustment_no text`，服务端生成且唯一。
- `type stock_adjustment_type`。
- `reason text`，必填。
- `stock_count_id uuid`，可空；盘点差异生成时填写，并保证每张盘点单最多关联一张调整单。
- `created_by uuid`、`created_at timestamptz`。

直接调整提交后立即成为不可编辑记录，不建设调整草稿。

### 4.11 stock_adjustment_items

- `id uuid` 主键。
- `stock_adjustment_id uuid`。
- `product_id uuid`。
- `quantity_delta integer`，不得为零。
- `before_quantity integer`，非负。
- `after_quantity integer`，非负且等于调整前数量加变化数量。
- `product_name_snapshot text`。
- `sku_snapshot text`。
- 同一调整单内同一商品只能出现一次。

### 4.12 stock_records 扩展

现有库存流水表继续作为唯一库存流水来源，新增：

- `purchase_receipt_item_id uuid`，可空并唯一。
- `stock_adjustment_item_id uuid`，可空并唯一。

更新来源约束，保证 `stock_in_item_id`、`sales_order_item_id`、`purchase_receipt_item_id`、`stock_adjustment_item_id` 中恰好一个非空。保留明确外键，不改成无法建立引用完整性的通用字符串来源。

旧手工入库流水保持原外键，不迁移为采购到货。

## 5. 状态与业务流程

### 5.1 供应商

- 店主和店员都可以新增、编辑和停用供应商。
- 停用供应商不能创建或确认新的采购单。
- 已使用停用供应商的历史采购单继续可查。

### 5.2 采购单

```text
draft → confirmed → partially_received → completed
  │          │
  └──────────┴────────→ cancelled（仅未到货且未付款）
```

- 草稿允许修改供应商、明细、数量、采购价和备注。
- 保存草稿时服务端根据采购数量乘采购价重新计算总金额。
- 确认时重新验证供应商启用、商品存在、数量为正和采购价非负，并冻结业务字段。
- 草稿可以取消。
- 已确认但从未到货且未付款的采购单可以取消。
- 发生任何到货或付款后不能取消。
- 已取消和已完成采购单不能继续到货。

### 5.3 分批到货

一次到货事务必须：

1. 使用到货请求 ID 查询是否已经处理；请求内容一致时返回原到货单，不重复落账；同一 ID 对应不同内容时拒绝请求。
2. 锁定采购单、相关采购明细和商品。
3. 在锁内重新检查采购状态和剩余未到数量。
4. 创建到货单和到货明细。
5. 增加 `products.stock_qty`。
6. 更新采购明细累计到货数量。
7. 将商品 `cost_price` 更新为本批采购价。
8. 为每条到货明细创建唯一正向库存流水。
9. 根据所有明细累计到货数量更新采购单为部分到货或已完成。

任何校验或写入失败时整单回滚。两个并发到货请求必须串行检查剩余数量，不能超额到货。

### 5.4 采购付款

- 已确认、部分到货或已完成采购单可以一次性标记已付清。
- 草稿和已取消采购单不能付款。
- 付款请求 ID 已处理时返回原记录。
- 采购单已经付款时不得产生第二条付款记录。
- 付款金额固定为采购单总金额。
- 本阶段不支持撤销付款。

### 5.5 库存盘点

```text
创建盘点并快照全部启用商品 → 填写实际数量 → 查看差异 → 确认或取消
```

- 草稿可以反复保存实际数量和备注。
- 确认前所有明细必须填写实际数量。
- 确认时锁定全部涉及商品，并检查当前库存仍等于账面库存快照。
- 任一商品已经变化时整张盘点单失败，用户必须刷新或重新创建盘点，不允许用旧快照覆盖新库存。
- 确认成功后，只为非零差异生成一张库存调整单、调整明细和流水。
- 无差异盘点可以确认，不生成调整单。
- 已确认或已取消盘点不可修改。
- 同一确认请求和内容重复到达时只生效一次；同一请求 ID 对应不同内容时拒绝请求。

### 5.6 库存调整

- 直接调整支持盘盈、盘亏、报损和人工调整。
- 一次调整可包含多个商品，每个商品只出现一次。
- 盘盈的变化数量必须为正数。
- 盘亏和报损的变化数量必须为负数。
- 人工调整允许正数或负数，但不得为零。
- 所有负向变化在锁内检查库存；任一商品不足时整单回滚。
- 成功后记录调整前数量、变化数量、调整后数量并生成唯一库存流水。
- 同一请求 ID 和内容重复到达时返回原调整，不重复落账；同一 ID 对应不同内容时拒绝请求。

### 5.7 手工入库退役

- 保留 `stock_in_orders`、`stock_in_items`、列表、详情和相关历史流水。
- 前端菜单改为“历史手工入库”，只提供筛选、列表和详情。
- 数据库中的手工入库保存和确认入口统一返回 `MANUAL_STOCK_IN_DISABLED`。
- 现存草稿保留用于审计，但不得继续编辑或确认。
- 不将历史手工入库自动转换成供应商或采购单。

## 6. 数据库接口

函数命名在实施计划中按现有 Supabase RPC 风格落地，至少提供以下职责明确的接口：

- 供应商列表、创建、更新和状态变更。
- 采购单列表、详情、保存草稿、确认和取消。
- 采购到货提交、到货列表和详情。
- 采购付款提交。
- 当前库存与库存预警列表。
- 盘点单列表、详情、创建、保存草稿、确认和取消。
- 库存调整提交、列表和详情。
- 历史手工入库列表与详情。

列表接口负责分页、搜索和筛选。关键写操作使用 `security definer` 函数，固定 `search_path`，检查调用用户为 `active`，并在数据库中执行最终状态、金额、数量和权限校验。

客户端只保存公开 Supabase 配置，不接触服务端密钥。

## 7. 页面与导航

### 7.1 采购管理

- `/suppliers`：供应商列表，支持搜索、新增、编辑和启停。
- `/purchases`：采购单列表，支持单号、供应商、采购状态、付款状态和日期筛选。
- `/purchases/new` 与 `/purchases/:id`：采购草稿完整编辑页。
- `/purchases/:id/detail`：采购详情、到货进度、付款、取消和历史到货记录。
- `/purchase-receipts`：到货历史列表，支持到货单号、采购单、供应商和日期筛选。

采购详情使用“登记到货”抽屉，只展示尚未到齐的明细及剩余数量。采购付款和取消使用明确的二次确认。

### 7.2 库存管理

- `/inventory`：当前库存，只读展示库存和预警状态。
- `/records`：继续使用现有库存流水页并扩展采购与调整来源。
- `/stock-counts`、`/stock-counts/:id`：盘点列表和完整盘点页。
- `/stock-adjustments`：库存调整列表和新增入口。
- `/stock-alerts`：库存预警列表。
- `/stock-in-history`：历史手工入库列表与详情。

### 7.3 商品与首页

- 商品表单补齐条码、单张主图上传/预览和库存预警值。
- 图片上传显示进度、成功预览和失败重试，失败不清空其他表单值。
- 启用商品在 `stock_qty <= low_stock_threshold` 时进入预警；未设置预警值的商品不提醒。
- 经营首页继续展示现有低库存摘要，不在 2.1 新增采购统计图表。

### 7.4 UI 约束

- 新页面和本阶段修改的页面使用 Ant Design 的 `Form`、`Input`、`InputNumber`、`Select`、`Table`、`Drawer`、`Modal`、`Upload`、`Image`、`Popconfirm`、`Tag`、`Progress`、`message` 和 `Empty` 等合适组件。
- 复杂采购单和盘点使用完整页面，不塞入狭窄弹窗。
- 保持现有桌面优先和响应式布局，不借本阶段重构全部 MVP 页面。
- 关键提交期间禁用按钮，防止用户重复触发。

## 8. 权限与审计

- 店主和店员都可管理供应商、采购、到货、付款、盘点和库存调整。
- 店员可以在采购单、到货单和采购付款接口中读取完成业务所需的采购价格与金额。
- 店员使用的商品、当前库存、首页和其他经营接口不得返回 `products.cost_price` 或毛利润。
- 供应商、采购、到货、付款、盘点和调整都记录操作人和操作时间。
- 已确认采购单、到货单、付款记录、已确认盘点、库存调整和库存流水不可直接修改或删除。
- RLS 与业务函数同时校验身份和状态，前端隐藏按钮不能作为权限边界。

## 9. 错误处理与幂等

数据库使用稳定业务错误码，前端通过现有错误映射转换为中文提示，至少包含：

- `SUPPLIER_INACTIVE`
- `PURCHASE_NOT_EDITABLE`
- `PURCHASE_NOT_RECEIVABLE`
- `OVER_RECEIPT`
- `REQUEST_ID_CONFLICT`
- `PURCHASE_ALREADY_PAID`
- `STOCK_COUNT_STALE`
- `INSUFFICIENT_STOCK`
- `DUPLICATE_BARCODE`
- `DUPLICATE_DOCUMENT_NO`
- `MANUAL_STOCK_IN_DISABLED`

关键请求由客户端生成 UUID 并在超时重试时复用。服务端对请求 ID 对应的业务单据和内容进行一致性检查，不能把不同操作误判为同一次请求。前端超时后先按单据或请求 ID 重新查询；确认数据库未处理时才允许重新提交。字段错误显示在对应控件附近，业务结果使用 Ant Design 消息组件，不向用户直接显示数据库异常文本。

## 10. 测试设计

### 10.1 数据库行为测试

测试必须执行真实业务函数，而不是只检查表、函数、触发器或 RLS 是否存在：

- 采购总额由服务端计算，确认后业务字段不可修改。
- 停用供应商不能创建或确认采购单。
- 两次分批到货正确累计并自动完成采购单。
- 超额到货整单回滚。
- 相同请求 ID 重复提交只产生一次库存和流水。
- 并发到货不能超过采购数量。
- 到货后商品当前成本更新，采购和到货价格快照保持不变。
- 采购付款只产生一条记录，金额等于采购单总金额。
- 盘点快照过期时拒绝确认，不覆盖新库存。
- 无差异盘点可以确认且不生成调整。
- 多商品负向调整中任一项库存不足时整单回滚。
- 并发负向调整不能产生负库存。
- 店员只能从采购业务接口读取采购金额，无法从其他接口读取商品成本和毛利润。
- 手工入库保存和确认接口返回停用错误。

### 10.2 前端测试

- 供应商、采购单、到货、盘点、调整和预警的列表、空态、加载和错误状态。
- 采购和盘点表单校验、金额展示、差异展示、提交禁用和错误保留。
- 商品图片上传成功、失败和重试。
- 店员可见采购价格，但不可见商品成本、毛利润和其他店主专属入口。
- 关键请求超时后先回查状态，再显示可重试或已完成结果。

### 10.3 端到端固定案例

1. 创建供应商和采购 10 件商品。
2. 首批到货 4 件，采购单进入部分到货，库存增加 4。
3. 重复提交首批请求，库存不再增加。
4. 第二批到货 6 件，采购单完成，库存累计增加 10。
5. 标记采购已付清，重复付款不产生第二条付款记录。
6. 创建盘点后先发生库存变化，旧盘点确认被拒绝。
7. 重新盘点并确认差异，库存和流水一致。
8. 店员可以完成采购操作，但看不到商品成本和毛利润。
9. 原有商品、销售、出库、收款和经营首页验收目标继续通过；原测试中用于准备库存的手工入库步骤改为采购到货。

## 11. 迁移与兼容策略

- 只新增向前迁移，不修改已提交的 13 个迁移文件。
- 新表、枚举、索引、RLS、函数和触发器按纵向批次追加。
- 扩展 `stock_records` 前先更新来源约束，再增加采购到货和库存调整唯一索引。
- 已有商品条码、图片和预警值数据原样保留。
- 已有手工入库和流水原样保留，不自动创建供应商或采购单。
- 现存手工入库草稿保留只读，不允许继续落账。
- 修改数据库接口后重新生成并提交 `src/lib/database.types.ts`。

## 12. 阶段出口

2.1 完成必须同时满足：

- 商品、供应商、采购、到货、付款、当前库存、盘点、调整和预警页面达到本规格范围。
- 数据库结构、权限、事务、幂等和并发测试全部通过。
- 前端单元与组件测试全部通过。
- 2.1 端到端固定案例以及调整库存前置方式后的原 MVP 销售端到端案例全部通过。
- TypeScript 检查和生产构建通过。
- Git 差异仅包含本阶段相关改动，无密钥、环境文件、构建产物或测试报告。
- 操作文档和验收清单同步更新。
- 不以实际云端部署作为本阶段完成条件。
