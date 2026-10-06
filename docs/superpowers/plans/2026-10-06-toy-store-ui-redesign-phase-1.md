# Toy Store UI Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一的后台设计基础，并将“玩具管理”改造成后续页面可复用的视觉样板。

**Architecture:** 继续使用 React 19 和 Ant Design 5。通过一个静态主题对象统一 Ant Design 令牌，再用 CSS 变量同步应用外壳；业务数据、接口、路由和权限保持不变。第一轮只改应用外壳与商品列表，避免全站同时重写。

**Tech Stack:** React 19、TypeScript 5、Ant Design 5、Vite 7、Vitest、Testing Library、Playwright

**Spec:** `docs/superpowers/specs/2026-10-06-toy-store-ui-redesign-design.md`

## Global Constraints

- 保留 React、Ant Design、Supabase、现有路由和业务流程。
- 不新增组件库、图标库、字体包或动画库。
- 保留左侧导航与菜单区域独立滚动。
- 中文优先使用系统字体，不加载远程字体。
- 第一轮只改应用主题、应用外壳和玩具管理页。
- 每个任务遵循测试先行，并在通过目标测试后独立提交。

---

### Task 1: 建立应用主题令牌

**Files:**
- Create: `src/app/theme.ts`
- Create: `src/app/theme.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**
- Produces: `appTheme: ThemeConfig`，供 `App` 的 `ConfigProvider` 使用。
- Produces: `:root` CSS 变量，供侧栏和页面布局使用。

- [ ] **Step 1: 编写失败的主题测试**

```ts
import { describe, expect, it } from 'vitest';
import { appTheme } from './theme';

describe('appTheme', () => {
  it('uses_the_toy_store_design_tokens', () => {
    expect(appTheme.token).toMatchObject({
      colorPrimary: '#2563EB',
      colorBgLayout: '#F6F8FB',
      colorText: '#182230',
      borderRadius: 8,
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/app/theme.test.ts`

Expected: FAIL，提示无法找到 `./theme`。

- [ ] **Step 3: 创建最小主题配置**

```ts
import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563EB',
    colorBgLayout: '#F6F8FB',
    colorBgContainer: '#FFFFFF',
    colorText: '#182230',
    colorTextSecondary: '#667085',
    colorBorderSecondary: '#E4E7EC',
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  },
  components: {
    Button: { controlHeight: 36 },
    Input: { controlHeight: 36 },
    Select: { controlHeight: 36 },
    Table: { headerBg: '#F8FAFC', headerColor: '#475467' },
  },
};
```

- [ ] **Step 4: 在应用入口启用主题**

将 `App.tsx` 的返回结构改为：

```tsx
<ConfigProvider theme={appTheme}>
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
</ConfigProvider>
```

在 `styles.css` 的 `:root` 中加入与主题一致的 CSS 变量，并将已有应用外壳硬编码颜色替换为这些变量：

```css
--color-primary: #2563eb;
--color-sidebar: #172238;
--color-layout: #f6f8fb;
--color-text: #182230;
--color-text-secondary: #667085;
--color-border: #e4e7ec;
--radius-control: 8px;
```

- [ ] **Step 5: 运行主题与应用测试**

Run: `npm test -- --run src/app/theme.test.ts src/app/App.test.tsx`

Expected: 两个测试文件全部 PASS。

- [ ] **Step 6: 提交主题基础**

```bash
git add src/app/theme.ts src/app/theme.test.ts src/app/App.tsx src/app/styles.css
git commit -m "style: establish admin theme tokens"
```

---

### Task 2: 统一应用外壳和键盘焦点

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**
- Consumes: Task 1 的 CSS 变量。
- Produces: `#main-content` 主内容锚点和 `.skip-link` 键盘入口。

- [ ] **Step 1: 编写失败的外壳可访问性测试**

在现有 `AppShell` 测试中增加：

```ts
it('provides_a_skip_link_to_the_main_content', () => {
  render(<MemoryRouter initialEntries={['/dashboard']}><AppShell /></MemoryRouter>);

  expect(screen.getByRole('link', { name: '跳到主要内容' }))
    .toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/app/AppShell.test.tsx`

Expected: FAIL，找不到“跳到主要内容”链接。

- [ ] **Step 3: 添加跳转入口并保持导航结构不变**

在 `.app-shell` 内、`aside` 之前加入：

```tsx
<a className="skip-link" href="#main-content">跳到主要内容</a>
```

将主内容元素改为：

```tsx
<main className="app-content" id="main-content"><Outlet /></main>
```

- [ ] **Step 4: 调整外壳 CSS**

实施以下确定性规则：

```css
.app-content { min-width: 0; padding: 32px 40px; }
.feature-page { width: 100%; max-width: 1440px; margin: 0 auto; }
.nav-link { transition: background-color 160ms ease, color 160ms ease; }
.nav-link:focus-visible,
.account-summary button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.skip-link {
  position: fixed;
  z-index: 100;
  top: 8px;
  left: 232px;
  transform: translateY(-160%);
}
.skip-link:focus { transform: translateY(0); }
.metric-card strong,
.ant-statistic-content,
.ant-table-cell { font-variant-numeric: tabular-nums; }
```

侧栏继续使用 `height: 100vh`、`.sidebar-nav { overflow-y: auto }`，不得把滚动转移到整个侧栏或页面。

- [ ] **Step 5: 运行外壳测试**

Run: `npm test -- --run src/app/AppShell.test.tsx`

Expected: 现有导航结构测试和新增可访问性测试全部 PASS。

- [ ] **Step 6: 提交应用外壳**

```bash
git add src/app/AppShell.tsx src/app/AppShell.test.tsx src/app/styles.css
git commit -m "style: refine admin shell layout"
```

---

### Task 3: 将玩具管理改造成统一组件样板页

**Files:**
- Modify: `src/features/products/ProductListPage.tsx`
- Modify: `src/features/products/ProductListPage.test.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**
- Consumes: Ant Design `Alert`、`Button`、`Input`、`Select`、`Space`、`Table`、`Tag`。
- Preserves: `listProducts(filters)`、`setProductStatus(id, status)`、`ProductFormDrawer` 和 `getStockStatus(product)`。

- [ ] **Step 1: 编写失败的统一控件测试**

在 owner 测试中加入：

```ts
expect(screen.getByRole('button', { name: '新增玩具' })).toHaveClass('ant-btn');
expect(screen.getByRole('searchbox', { name: '搜索玩具' })).toHaveClass('ant-input');
expect(screen.getByRole('combobox', { name: '商品状态' })).toBeInTheDocument();
```

新增错误状态测试：

```ts
it('shows_product_load_errors_with_the_shared_alert', async () => {
  mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
  mocks.listProducts.mockRejectedValue(new Error('商品加载失败'));

  render(<ProductListPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent('商品加载失败');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/products/ProductListPage.test.tsx`

Expected: FAIL，原生按钮没有 `ant-btn`，搜索框不是 Ant Design 搜索框。

- [ ] **Step 3: 用 Ant Design 控件替换原生控件**

采用以下组件映射：

```tsx
<Button type="primary" onClick={openCreateDrawer}>新增玩具</Button>
<Input.Search
  aria-label="搜索玩具"
  placeholder="搜索名称、货号或条码"
  value={filters.query ?? ''}
  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
/>
<Select
  aria-label="商品状态"
  value={filters.status ?? 'all'}
  options={[
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '在售' },
    { value: 'inactive', label: '停用' },
  ]}
  onChange={(status) => setFilters((current) => ({ ...current, status }))}
/>
```

工具栏使用 `<Space className="toolbar" wrap>`，搜索框最大宽度 360px，状态选择器宽度 140px。

- [ ] **Step 4: 统一状态、操作和错误提示**

- 商品状态使用 `<Tag color="green">在售</Tag>` 和 `<Tag>停用</Tag>`。
- 编辑、启用、停用使用 `Button type="link"`，停用按钮使用 `danger`。
- 错误提示使用 `<Alert type="error" message={error} role="alert" showIcon />`。
- 保留库存状态表头筛选、图片预览和当前列顺序。
- 删除本次替换后不再使用的 `.search-input`、`.filter-select`、`.status-pill` 和 `.text-button` 样式；仍被其他页面使用的 `.btn-primary` 暂时保留。

- [ ] **Step 5: 运行商品页面测试**

Run: `npm test -- --run src/features/products/ProductListPage.test.tsx`

Expected: 图片预览、图片失败占位、库存表头筛选、角色权限、统一控件和错误提示测试全部 PASS。

- [ ] **Step 6: 提交样板页**

```bash
git add src/features/products/ProductListPage.tsx src/features/products/ProductListPage.test.tsx src/app/styles.css
git commit -m "style: unify product list interface"
```

---

### Task 4: 完成回归和视觉验收

**Files:**
- Modify only if verification finds a Phase 1 regression in:
  - `src/app/App.tsx`
  - `src/app/AppShell.tsx`
  - `src/app/styles.css`
  - `src/features/products/ProductListPage.tsx`
  - Their corresponding test files

**Interfaces:**
- Consumes: Tasks 1–3 的最终实现。
- Produces: 通过测试和构建的 Phase 1 样板。

- [ ] **Step 1: 运行完整单元测试**

Run: `npm test -- --run`

Expected: 所有测试文件 PASS，测试数量不少于实施前的 93 项。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: TypeScript 编译和 Vite 构建成功；现有 bundle size warning 可以记录但不在本阶段处理。

- [ ] **Step 3: 运行本地 E2E 核心流程**

Run: `npm run test:e2e:local -- e2e/core-flow.spec.ts e2e/sidebar.spec.ts`

Expected: 商品新增、编辑、库存展示、导航和侧栏滚动流程 PASS。

- [ ] **Step 4: 完成桌面视觉检查**

在 1366×768 和 1440×900 两个视口检查 `/products`：

- 页面内容居中且没有整体横向滚动。
- 左侧菜单单独滚动，品牌和账户区保持可见。
- 搜索框、状态筛选和新增按钮高度一致。
- 图片、商品名、SKU、金额、库存和操作列对齐。
- 库存表头筛选弹层可用，图片大图预览可用。
- Tab 键可以清晰看到跳转链接、导航、搜索、筛选和操作按钮的焦点。

- [ ] **Step 5: 检查差异范围**

Run: `git diff --check && git status --short`

Expected: 没有空白错误；修改只覆盖本计划列出的文件。

- [ ] **Step 6: 提交验证期间必要的修复**

如果 Step 1–5 无需修复则跳过此提交；如果发现并修复了范围内回归：

```bash
git add src/app src/features/products
git commit -m "fix: complete ui redesign phase one verification"
```

## 自审结果

- 规格中的主题、外壳、玩具管理样板和验证均有对应任务。
- 未包含数据库、接口、其他业务页、移动导航或新依赖。
- 所有新增接口名称与任务间引用一致：`appTheme`、`#main-content`、`.skip-link`。
- 计划不包含占位实现；后续页面迁移等待样板验收后单独编写计划。
