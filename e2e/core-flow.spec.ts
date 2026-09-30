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
    const metric = async (label: string) => Number((await page.locator('.metric-card').filter({ hasText: label }).locator('strong').innerText()).replace(/[¥,]/g, ''));
    const salesBefore = await metric('销售额');
    const costBefore = await metric('成本');
    const profitBefore = await metric('毛利润');
    const ordersBefore = await metric('订单数');

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
    await page.getByLabel(`数量-${productName}`).fill('3');
    await page.getByRole('button', { name: '确认订单' }).click();
    await expect(page).toHaveURL(/\/sales\/.+\/detail/);
    const orderDetailUrl = page.url();
    await expect(page.getByText(productName)).toBeVisible();
    await expect(page.getByText('金额：¥300.00')).toBeVisible();

    await page.getByRole('button', { name: '确认出库' }).click();
    await expect(page.getByText('已完成')).toBeVisible();
    await page.getByRole('button', { name: '标记已收款' }).click();
    await expect(page.getByText('已收款')).toBeVisible();

    await page.goto('/products');
    await page.getByLabel('搜索玩具').fill(sku);
    const productRow = page.locator('tbody tr').filter({ hasText: sku });
    await expect(productRow).toContainText('7 件');

    await productRow.getByRole('button', { name: '编辑' }).click();
    await page.getByLabel('售价').fill('120');
    await page.getByRole('button', { name: '保存' }).click();
    await page.goto(orderDetailUrl);
    await expect(page.getByText('金额：¥300.00')).toBeVisible();
    await expect(page.getByText('¥100.00')).toBeVisible();

    await page.goto('/records');
    const stockRows = page.locator('tbody tr').filter({ hasText: sku });
    await expect(stockRows).toHaveCount(2);
    await expect(stockRows.getByRole('cell', { name: '+10', exact: true })).toBeVisible();
    await expect(stockRows.getByRole('cell', { name: '-3', exact: true })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.locator('.metric-card').filter({ hasText: '销售额' }).locator('strong')).toHaveText(`¥${(salesBefore + 300).toFixed(2)}`);
    await expect(page.locator('.metric-card').filter({ hasText: '成本' }).locator('strong')).toHaveText(`¥${(costBefore + 180).toFixed(2)}`);
    await expect(page.locator('.metric-card').filter({ hasText: '毛利润' }).locator('strong')).toHaveText(`¥${(profitBefore + 120).toFixed(2)}`);
    await expect(page.locator('.metric-card').filter({ hasText: '订单数' }).locator('strong')).toHaveText(String(ordersBefore + 1));
  });

  test('保存草稿后确认复用同一张订单', async ({ page }) => {
    await page.goto('/sales/new');
    await page.getByRole('button', { name: '添加玩具' }).click();
    await page.getByRole('button', { name: '保存草稿' }).click();
    await expect(page).toHaveURL(/\/sales\/[0-9a-f-]{36}$/);
    const draftUrl = page.url();

    await page.getByRole('button', { name: '确认订单' }).click();

    await expect(page).toHaveURL(`${draftUrl}/detail`);
    await expect(page.getByText('待出库')).toBeVisible();
  });
});
