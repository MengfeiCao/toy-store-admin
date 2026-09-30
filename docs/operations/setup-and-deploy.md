# 本地运行与部署

## 本地环境

1. 安装 Node.js 22、Supabase CLI 和 Docker。
2. 在项目根目录复制 `.env.example` 为 `.env.local`，填写 Supabase URL 和公开 anon key。不要把 service role key 写入前端环境变量。
3. 启动本地 Supabase：`supabase start`。首次建库运行 `supabase db reset`；已有本地数据时运行 `supabase migration up --local`，避免清空数据。
4. 启动用户管理函数：`supabase functions serve admin-users --no-verify-jwt`。函数从本地 Supabase 配置读取服务端密钥，服务端密钥不要写入前端环境变量。
5. 启动前端：`npm run dev`。
6. 准备并运行完整验收：先执行 `npm run setup:e2e`，再执行 `npm run test:e2e:local`。macOS 直接使用已安装的 Google Chrome；其他系统先运行 `npx playwright install chromium`。
7. 运行其余检查：`npm test -- --run && supabase test db && npm run build`。

## 采购与库存操作

1. 先维护供应商和商品，再创建采购单；确认后的采购单不再编辑商品和价格。
2. 在采购单详情登记一次或多次到货。每次到货会原子更新采购进度、商品库存、成本价和库存流水。
3. 采购单可独立标记付款；重复请求不会重复生成到货或付款记录。
4. 盘点创建时会保存账面库存快照。确认前若库存已变化，系统会拒绝过期盘点，应重新创建盘点单。
5. 盘盈、短缺、破损和手工调整必须填写原因，且会生成不可修改的库存流水。
6. 历史手工入库仍可在“历史手工入库”查看，但数据库已拒绝新增或确认；新增库存请使用采购到货。

## 售后操作

1. 仅已完成出库的销售订单显示“办理售后”。选择退货退款或同款换货，再填写每项数量和退回状况。
2. 完好商品恢复可售库存；损坏商品记录为售后报损，不回到可售库存。
3. 已收款订单退货按原销售单价立即生成退款记录，原订单保持已收款；未收款订单按退货后的净额一次性收款。
4. 换货只支持同款同数量，不收补差价、不退差价；库存不足时整个换货事务回滚。
5. 售后提交使用固定请求标识，网络超时后可用原请求安全重试，不会重复回库、出库或退款。

商品图片存放在 Supabase Storage 的 `product-images` bucket。浏览器只使用公开 anon key，服务端密钥不得写入 `.env.local` 或前端构建产物。

## 首个店主账号

使用 Supabase Auth 创建首个邮箱账号，再在 `public.users` 写入同一用户 ID、姓名、`owner` 角色和 `active` 状态。之后由店主在“用户管理”中创建店员。

## Vercel 部署

1. 创建 Supabase Cloud 项目后运行 `supabase login`，再用 `supabase link --project-ref <项目编号>` 连接项目。
2. 运行 `supabase db push` 应用迁移；迁移会创建 `product-images` bucket 和权限策略。
3. 运行 `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<服务端密钥>`，再运行 `supabase functions deploy admin-users --no-verify-jwt`。
4. 将仓库连接到 Vercel，构建命令使用 `npm run build`，输出目录使用 `dist`。
5. 在 Vercel 配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，只使用公开 anon key。
6. 在 Supabase Auth 的 Site URL / Redirect URLs 中加入生产域名。
7. 按“首个店主账号”步骤创建生产店主，登录后再从“用户管理”创建店员。
8. 开启数据库备份并做一次恢复演练；生产密钥只保存在 Supabase/Vercel secret 配置中。

`vercel.json` 已配置 SPA 回退，刷新 `/dashboard`、`/sales` 等前端路由不会返回 404。

## 回滚

先回滚 Vercel 到上一个稳定部署，再按迁移记录回退数据库变更。涉及库存、出库和收款的迁移禁止直接删除生产数据，先备份并执行反向脚本。
