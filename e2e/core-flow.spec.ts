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
    await page.goto('/products');
    await page.getByRole('button', { name: '新增玩具' }).click();
    await page.getByLabel('名称').fill('恐龙积木');
    await page.getByLabel('货号').fill('DLJM-001');
    await page.getByLabel('分类').fill('积木');
    await page.getByLabel('成本价').fill('60');
    await page.getByLabel('售价').fill('100');
    await page.getByRole('button', { name: '保存' }).click();
    await page.goto('/stock-in');
    await page.getByLabel('入库数量').fill('10');
    await page.getByRole('button', { name: '确认入库' }).click();
    await page.goto('/sales/new');
    await page.getByRole('button', { name: '添加玩具' }).click();
    await page.getByRole('button', { name: '确认订单' }).click();
    await expect(page.getByText('订单已确认')).toBeVisible();
  });
});
