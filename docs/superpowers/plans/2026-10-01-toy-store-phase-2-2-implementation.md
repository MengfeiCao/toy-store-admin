# 玩具店后台 2.2 售后管理实施计划

### Task 1: 售后数据结构与原子事务

**Files:**
- Create: `supabase/migrations/202610010007_after_sales.sql`
- Create: `supabase/tests/database/014_after_sales.sql`
- Modify: `src/lib/database.types.ts`

- [ ] 先写数据库失败测试，覆盖退货、退款、换货、上限、库存不足和幂等。
- [ ] 实现售后表、RLS、不可变约束、库存流水扩展和 `post_after_sales`。
- [ ] 实现列表、详情与销售订单售后汇总接口。
- [ ] 重建数据库并运行全部 pgTAP 测试。
- [ ] 提交 `feat: add atomic after-sales workflow`。

### Task 2: 售后前端 API 与页面

**Files:**
- Create: `src/features/after-sales/*`
- Modify: `src/features/sales/sales.types.ts`
- Modify: `src/features/sales/SalesOrderDetailPage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/AppShell.tsx`

- [ ] 先写 API、列表和表单失败测试。
- [ ] 实现售后 API、类型、列表、新建页和详情页。
- [ ] 在已完成销售详情接入入口，补充导航与路由。
- [ ] 验证相关 Vitest 与生产构建。
- [ ] 提交 `feat: add after-sales management pages`。

### Task 3: 售后验收与文档

**Files:**
- Create: `e2e/after-sales.spec.ts`
- Modify: `docs/operations/acceptance-checklist.md`
- Modify: `docs/operations/setup-and-deploy.md`
- Modify: `README.md`

- [ ] 编写已付款部分退货、损坏退货、同款换货和店员权限浏览器验收。
- [ ] 按重建库、数据库、账号、浏览器顺序执行完整回归。
- [ ] 更新操作与验收文档。
- [ ] 运行前端测试、数据库测试、浏览器测试和生产构建。
- [ ] 提交 `test: verify after-sales workflow`。
