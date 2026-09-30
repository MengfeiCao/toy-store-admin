# 乐奇玩具销售后台

这是一个面向单店玩具销售的后台，当前覆盖商品与图片、供应商、采购单、分批到货、采购付款、当前库存、盘点、库存调整与预警、库存流水、客户、销售订单、出库、收款、角色化首页和店主用户管理。

旧的手工入库入口已退役为只读历史查询；新增库存统一通过采购到货、盘点差异或库存调整产生。

## 开发命令

```bash
npm install
npm run dev
npm test -- --run
npm run build
npm run setup:e2e
npm run test:e2e:local
```

只运行指定浏览器用例时，可在命令后追加路径，例如 `npm run test:e2e:local -- e2e/purchase-inventory.spec.ts`。

本地 Supabase、迁移、Edge Function 和 Vercel 配置请看 [部署与操作说明](docs/operations/setup-and-deploy.md)，验收记录填写 [验收清单](docs/operations/acceptance-checklist.md)。
