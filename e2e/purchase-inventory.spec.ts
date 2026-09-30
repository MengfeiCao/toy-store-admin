import { expect, test } from '@playwright/test';

const ready = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);
test.skip(!ready, '需要配置本地店主 E2E 凭据');

test('采购分批到货、付款、库存调整与预警闭环', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);

  const runId = Date.now().toString(36).toUpperCase();
  const productName = `采购验收玩具-${runId}`;
  const sku = `PO-${runId}`;
  const supplierName = `采购验收供应商-${runId}`;

  await page.goto('/products');
  await page.getByRole('button', { name: '新增玩具' }).click();
  await page.getByLabel('名称').fill(productName);
  await page.getByLabel('货号').fill(sku);
  await page.getByLabel('分类').fill('采购验收');
  await page.getByLabel('成本价').fill('20');
  await page.getByLabel('售价').fill('40');
  await page.getByLabel('低库存提醒值').fill('3');
  await page.getByRole('dialog').getByRole('button', { name: /保\s*存/ }).click();

  await page.goto('/suppliers');
  await page.getByRole('button', { name: '新增供应商' }).click();
  await page.getByLabel('供应商名称').fill(supplierName);
  await page.getByRole('dialog').getByRole('button', { name: /保\s*存/ }).click();

  await page.goto('/purchases/new');
  await expect(page.getByText(supplierName)).toBeVisible();
  await expect(page.getByText(`${productName} · ${sku}`)).toBeVisible();
  await page.getByRole('button', { name: '添加商品' }).click();
  await page.getByLabel(`采购数量-${productName}`).fill('10');
  await page.getByLabel(`采购单价-${productName}`).fill('20');
  await page.getByRole('button', { name: '确认采购单' }).click();
  await expect(page).toHaveURL(/\/purchases\/.+\/detail/);

  await page.getByRole('button', { name: '登记到货' }).click();
  await page.getByLabel(`本次到货-${productName}`).fill('4');
  await page.getByRole('button', { name: '确认到货' }).click();
  await expect(page.getByText('部分到货')).toBeVisible();

  await page.getByRole('button', { name: '登记到货' }).click();
  await page.getByLabel(`本次到货-${productName}`).fill('6');
  await page.getByRole('button', { name: '确认到货' }).click();
  await expect(page.getByText('已完成')).toBeVisible();

  await page.getByRole('button', { name: '标记已付款' }).click();
  await page.getByRole('tooltip').getByRole('button', { name: /确\s*认/ }).click();
  await expect(page.getByRole('cell', { name: '已付款', exact: true })).toBeVisible();

  await page.goto('/inventory');
  await page.getByLabel('搜索库存').fill(sku);
  await expect(page.locator('tbody tr').filter({ hasText: sku })).toContainText('10 件');

  await page.goto('/stock-adjustments');
  await page.getByLabel('调整原因').fill('E2E 破损报废');
  await page.getByLabel(`调整数量-${productName}`).fill('8');
  await page.getByRole('button', { name: '提交调整' }).click();

  await page.goto('/stock-alerts');
  await page.getByLabel('搜索库存').fill(sku);
  const alertRow = page.locator('tbody tr').filter({ hasText: sku });
  await expect(alertRow).toContainText('2 件');
  await expect(alertRow).toContainText('库存不足');

  await page.goto('/records');
  const ledgerRows = page.locator('tbody tr').filter({ hasText: sku });
  await expect(ledgerRows).toHaveCount(3);
  await expect(ledgerRows.filter({ hasText: '采购到货' })).toHaveCount(2);
  await expect(ledgerRows.filter({ hasText: '短缺调整' })).toHaveCount(1);
});
