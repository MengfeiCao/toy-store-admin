import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, '需要配置本地店主 E2E 凭据');

test('经营报表展示统一数据并可导出 Excel', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: '经营报表' })).toBeVisible();
  await expect(page.getByText('净销售额').first()).toBeVisible();
  await expect(page.getByLabel('经营趋势图')).toBeVisible();
  await expect(page.getByRole('tab', { name: '商品排行' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '库存分析' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '采购分析' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '售后分析' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 Excel' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^经营报表_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.xlsx$/);
});
