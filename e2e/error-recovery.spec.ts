import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, '需要配置 E2E 凭据');

test('库存不足时不完成订单', async ({ page }) => {
  const runId = Date.now().toString(36).toUpperCase();
  const productName = `缺货验收-${runId}`;
  const sku = `EMPTY-${runId}`;

  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto('/products');
  await page.getByRole('button', { name: '新增玩具' }).click();
  await page.getByLabel('名称').fill(productName);
  await page.getByLabel('货号').fill(sku);
  await page.getByLabel('分类').fill('自动验收');
  await page.getByLabel('成本价').fill('10');
  await page.getByLabel('售价').fill('20');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText(productName)).toBeVisible();

  await page.goto('/sales/new');
  await page.getByLabel('选择玩具').selectOption({ label: `${productName} · 20.00 元` });
  await page.getByRole('button', { name: '添加玩具' }).click();
  await page.getByRole('button', { name: '确认订单' }).click();
  await expect(page.getByText('订单已确认')).toBeVisible();

  await page.goto('/sales');
  const newestOrder = page.locator('tbody tr').first();
  await expect(newestOrder).toContainText('待出库');
  await newestOrder.getByRole('link').click();
  await page.getByRole('button', { name: '确认出库' }).click();

  await expect(page.getByRole('alert')).toContainText('库存不足');
  await expect(page.getByRole('button', { name: '确认出库' })).toBeEnabled();
  await expect(page.getByText('待出库')).toBeVisible();
});
