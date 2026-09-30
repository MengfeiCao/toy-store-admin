# 本地运行与部署

## 本地环境

1. 安装 Node.js 22、Supabase CLI 和 Docker。
2. 在项目根目录复制 `.env.example` 为 `.env.local`，填写 Supabase URL 和公开 anon key。不要把 service role key 写入前端环境变量。
3. 启动本地 Supabase：`supabase start`。
4. 应用迁移并运行数据库测试：`supabase db reset && supabase test db`。
5. 部署 `supabase/functions/admin-users`，并仅在函数环境中配置 `SUPABASE_SERVICE_ROLE_KEY`。
6. 启动前端：`npm run dev`；验证：`npm test -- --run`。

## 首个店主账号

使用 Supabase Auth 创建首个邮箱账号，再在 `public.users` 写入同一用户 ID、姓名、`owner` 角色和 `active` 状态。之后由店主在“用户管理”中创建店员。

## Vercel 部署

1. 将仓库连接到 Vercel，构建命令使用 `npm run build`，输出目录使用 `dist`。
2. 配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，只使用公开 anon key。
3. 在 Supabase 项目中执行迁移、启用 Storage 的 `product-images` bucket，并部署 Edge Function。
4. 在 Auth 的 Site URL / Redirect URLs 中加入生产域名。
5. 开启数据库备份和恢复演练；生产密钥只保存在 Supabase/Vercel secret 配置中。

`vercel.json` 已配置 SPA 回退，刷新 `/dashboard`、`/sales` 等前端路由不会返回 404。

## 回滚

先回滚 Vercel 到上一个稳定部署，再按迁移记录回退数据库变更。涉及库存、出库和收款的迁移禁止直接删除生产数据，先备份并执行反向脚本。
