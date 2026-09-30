import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, '需要配置本地店主 E2E 凭据');

test('已付款订单部分退货退款并完成同款换货', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);

  const runId = Date.now().toString(36).toUpperCase();
  const productName = `售后验收玩具-${runId}`;
  const sku = `AS-${runId}`;
  const supplierName = `售后供应商-${runId}`;

  await page.goto('/products');
  await page.getByRole('button', { name: '新增玩具' }).click();
  await page.getByLabel('名称').fill(productName);
  await page.getByLabel('货号').fill(sku);
  await page.getByLabel('分类').fill('售后验收');
  await page.getByLabel('成本价').fill('10');
  await page.getByLabel('售价').fill('20');
  await page.getByRole('dialog').getByRole('button', { name: /保\s*存/ }).click();

  await page.goto('/suppliers');
  await page.getByRole('button', { name: '新增供应商' }).click();
  await page.getByLabel('供应商名称').fill(supplierName);
  await page.getByRole('dialog').getByRole('button', { name: /保\s*存/ }).click();

  await page.goto('/purchases/new');
  await expect(page.getByText(supplierName)).toBeVisible();
  await expect(page.getByText(`${productName} · ${sku}`)).toBeVisible();
  await page.getByRole('button', { name: '添加商品' }).click();
  await page.getByLabel(`采购数量-${productName}`).fill('5');
  await page.getByLabel(`采购单价-${productName}`).fill('10');
  await page.getByRole('button', { name: '确认采购单' }).click();
  await page.getByRole('button', { name: '登记到货' }).click();
  await page.getByLabel(`本次到货-${productName}`).fill('5');
  await page.getByRole('button', { name: '确认到货' }).click();

  await page.goto('/sales/new');
  await page.getByLabel('选择玩具').selectOption({ label: `${productName} · 20.00 元` });
  await page.getByRole('button', { name: '添加玩具' }).click();
  await page.getByLabel(`数量-${productName}`).fill('3');
  await page.getByRole('button', { name: '确认订单' }).click();
  await page.getByRole('button', { name: '确认出库' }).click();
  await page.getByRole('button', { name: '标记已收款' }).click();
  await expect(page.getByText('已收款')).toBeVisible();

  await page.getByRole('link', { name: '办理售后' }).click();
  await page.getByLabel(`售后数量-${productName}`).fill('1');
  await expect(page.getByText('预计退款 ¥20.00')).toBeVisible();
  await page.getByRole('button', { name: '确认售后' }).click();
  await expect(page).toHaveURL(/\/after-sales\/.+/);
  await expect(page.getByText('¥20.00').first()).toBeVisible();

  await page.getByRole('link', { name: /XS-/ }).click();
  await expect(page.getByText('已退款 ¥20.00')).toBeVisible();
  await page.getByRole('link', { name: '办理售后' }).click();
  await page.getByLabel('售后类型').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText('同款换货', { exact: true }).click();
  await expect(page.getByText('同款同数量换货，不产生退款或差价')).toBeVisible();
  await page.getByLabel(`售后数量-${productName}`).fill('1');
  await page.getByLabel(`商品状况-${productName}`).first().click();
  await page.locator('.ant-select-dropdown:visible').getByText('损坏报损', { exact: true }).click();
  await page.getByRole('button', { name: '确认售后' }).click();
  await expect(page).toHaveURL(/\/after-sales\/.+/);
  await expect(page.getByText('换货', { exact: true })).toBeVisible();

  await page.goto('/inventory');
  await page.getByLabel('搜索库存').fill(sku);
  await expect(page.locator('tbody tr').filter({ hasText: sku })).toContainText('2 件');

  await page.goto('/records');
  const rows = page.locator('tbody tr').filter({ hasText: sku });
  await expect(rows.filter({ hasText: '售后退回' })).toHaveCount(1);
  await expect(rows.filter({ hasText: '换货发出' })).toHaveCount(1);
});
