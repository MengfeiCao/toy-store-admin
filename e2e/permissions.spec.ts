import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_STAFF_EMAIL || !process.env.E2E_STAFF_PASSWORD, '需要配置店员 E2E 凭据');

test('店员看不到商品成本、利润和用户管理，但可使用采购与库存', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_STAFF_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_STAFF_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('销售额')).toBeVisible();
  await expect(page.getByText('成本')).not.toBeVisible();
  await expect(page.getByText('毛利润')).not.toBeVisible();
  await expect(page.getByText('用户管理')).not.toBeVisible();
  await expect(page.getByRole('link', { name: '采购单' })).toBeVisible();
  await expect(page.getByRole('link', { name: '玩具管理' })).toBeVisible();
  await expect(page.getByRole('link', { name: '当前库存' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: '库存预警' })).not.toBeVisible();

  await page.goto('/products');
  await expect(page.getByRole('columnheader', { name: '成本价' })).not.toBeVisible();
  await expect(page.getByRole('columnheader', { name: '当前库存' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '预警阈值' })).toBeVisible();
  await page.goto('/purchases');
  await expect(page.getByRole('heading', { name: '采购订单' })).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: '经营报表' })).toBeVisible();
  await expect(page.getByText('毛利润')).not.toBeVisible();
});
