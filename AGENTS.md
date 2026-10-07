# Toy Store Admin 项目协作说明

## 项目定位

这是一个面向单门店、单仓库玩具店的销售管理后台。当前 MVP 已覆盖商品、入库、库存流水、客户、销售订单、整单出库、二态收款、角色化首页和用户管理；后续功能按 `docs/superpowers/specs/` 中已确认的规格分阶段实现。

## 技术栈与目录

- 前端：React 19、TypeScript、Vite、React Router、Ant Design。
- 后端：Supabase Auth、PostgreSQL、Storage、Edge Functions。
- 测试：Vitest、Testing Library、pgTAP、Playwright。
- `src/app/`：应用入口、布局和路由。
- `src/auth/`：登录、会话、角色和受保护路由。
- `src/features/`：按业务领域组织页面、API、类型和测试。
- `src/lib/`：Supabase 客户端、数据库类型和错误映射。
- `supabase/migrations/`：数据库结构、权限和业务函数迁移。
- `supabase/tests/database/`：数据库结构、权限与业务规则测试。
- `supabase/functions/`：需要服务端密钥的 Edge Functions。
- `e2e/`：跨模块端到端验收。
- `docs/operations/`：运行、部署与验收记录。

## 常用验证命令

```bash
npm test -- --run
npm run build
npx supabase test db
npm run setup:e2e
npm run test:e2e:local
deno test supabase/functions/admin-users/index.test.ts --allow-env
```

只运行与当前修改相关的测试可用于开发反馈，但任务完成前必须补跑受影响范围的完整测试和生产构建。数据库测试需要本地 Supabase 已启动；浏览器验收需要本地 Supabase、测试账号和可用的 Chrome/Chromium。

## 固定业务规则

- 系统只服务单门店、单仓库和单一币种，不提前抽象多门店或多仓库。
- 数量必须是大于零的整数；金额和库存不得为负数。
- 销售不支持折扣；售价由服务端读取并保存快照，客户端不能决定最终金额。
- 销售收款只有 `unpaid` 和 `paid`，不支持部分收款。
- 采购付款只有未付款和已付清，不支持分期、预付和供应商对账。
- 订单确认不预占库存；出库时整单校验并原子扣减。
- 历史单据保存名称、货号、价格和成本快照，商品资料变化不得改写历史。
- 退换货累计数量不得超过原出库数量；换货只支持同款同数量。
- 店员不得通过 UI、REST、RPC 或报表读取销售成本和毛利润。
- 已确认或已完成的单据与库存流水不可直接修改或删除，只能通过业务流程纠正。

## 数据库、安全与事务

- 所有业务表启用 RLS；前端隐藏按钮不能代替数据库权限校验。
- 成本、利润和管理操作同时使用列级权限、RLS 或受保护函数隔离。
- 采购到货、销售出库、退货、换货、盘点和库存调整通过 PostgreSQL 函数完成。
- 关键函数在事务内锁定单据和商品，重新检查状态、数量与库存，保证原子性和幂等性。
- `security definer` 函数必须固定 `search_path`，并检查调用账号为 `active`。
- 每个业务明细最多产生一条对应库存流水；使用数据库唯一约束防止重复落账。
- 新迁移只向前追加，禁止改写已经提交并可能执行过的迁移文件。
- 修改数据库接口后同步更新 `src/lib/database.types.ts` 和相关 API 测试。

## 前端与交互

- 优先使用 Ant Design 的 `Form`、`Input`、`InputNumber`、`Select`、`Table`、`Drawer`、`Modal`、`Upload`、`Popconfirm`、`Tag`、`message` 等组件，不新增风格不一致的原生表单控件。
- 报表统一使用 ECharts；图表、表格和 Excel 导出必须使用同一份统计结果与筛选条件。
- 页面按现有 `src/features/<domain>/` 结构组织，避免把跨领域逻辑堆入单个组件。
- 前端负责输入提示和交互状态，数据库函数负责最终业务校验和数据一致性。
- 关键提交期间禁用按钮；请求超时后先重新读取单据状态，再决定是否允许重试。
- 表单错误显示在对应字段附近，业务错误转换为用户可理解的中文提示，不直接显示数据库异常文本。
- 保持桌面优先布局和现有响应式行为；不要借功能开发无关重做视觉系统。

## 修改与测试纪律

- 先明确需求、成功标准和边界，再修改代码；有多种业务解释时先确认。
- 只修改完成当前任务所需的文件，不做顺手重构、批量格式化或无关升级。
- 不为单次逻辑创建无必要的抽象层；沿用现有 API、类型和测试组织方式。
- 功能与缺陷均先写能失败的测试，再实现最少代码使其通过。
- 数据库关键流程必须覆盖成功、权限、重复请求、库存不足和并发争抢。
- 每个可独立验收的任务完成后检查 Git 差异并提交独立 commit。
- 禁止提交 `.env*`、服务端密钥、测试凭据、`dist/`、测试报告或本地 Supabase 临时文件。
- 宣告完成前必须提供本轮实际执行的测试和构建结果；历史记录不能代替本轮验证。
