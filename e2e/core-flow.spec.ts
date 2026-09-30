import { expect, test } from '@playwright/test';

const ready = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);
test.skip(!ready, '需要配置 E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD 与本地 Supabase');

test.describe('核心业务闭环', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
    await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('商品、入库、订单、出库和收款闭环', async ({ page }) => {
    const runId = Date.now().toString(36).toUpperCase();
    const productName = `验收玩具-${runId}`;
    const sku = `E2E-${runId}`;

    await page.goto('/products');
    await page.getByRole('button', { name: '新增玩具' }).click();
    await page.getByLabel('名称').fill(productName);
    await page.getByLabel('货号').fill(sku);
    await page.getByLabel('分类').fill('自动验收');
    await page.getByLabel('成本价').fill('60');
    await page.getByLabel('售价').fill('100');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto('/stock-in');
    await page.getByLabel('入库玩具').selectOption({ label: `${productName} · 当前库存 0` });
    await page.getByLabel('入库数量').fill('10');
    await page.getByRole('button', { name: '确认入库' }).click();
    await expect(page.getByText('入库已确认')).toBeVisible();

    await page.goto('/sales/new');
    await page.getByLabel('选择玩具').selectOption({ label: `${productName} · 100.00 元` });
    await page.getByRole('button', { name: '添加玩具' }).click();
    await page.getByLabel(`数量-${productName}`).fill('2');
    await page.getByRole('button', { name: '确认订单' }).click();
    await expect(page.getByText('订单已确认')).toBeVisible();

    await page.goto('/sales');
    const newestOrder = page.locator('tbody tr').first();
    await expect(newestOrder).toContainText('待出库');
    await newestOrder.getByRole('link').click();
    await expect(page).toHaveURL(/\/sales\/.+\/detail/);
    await expect(page.getByText(productName)).toBeVisible();
    await expect(page.getByText('金额：¥200.00')).toBeVisible();

    await page.getByRole('button', { name: '确认出库' }).click();
    await expect(page.getByText('已完成')).toBeVisible();
    await page.getByRole('button', { name: '标记已收款' }).click();
    await expect(page.getByText('已收款')).toBeVisible();

    await page.goto('/products');
    await page.getByLabel('搜索玩具').fill(sku);
    const productRow = page.locator('tbody tr').filter({ hasText: sku });
    await expect(productRow).toContainText('8 件');

    await page.goto('/records');
    const stockRows = page.locator('tbody tr').filter({ hasText: sku });
    await expect(stockRows).toHaveCount(2);
    await expect(stockRows.filter({ hasText: '+10' })).toBeVisible();
    await expect(stockRows.filter({ hasText: '-2' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByText('销售额')).toBeVisible();
    await expect(page.getByText('毛利润')).toBeVisible();
  });
});
