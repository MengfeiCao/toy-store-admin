import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_STAFF_EMAIL || !process.env.E2E_STAFF_PASSWORD, '需要配置店员 E2E 凭据');

test('店员看不到成本、利润和用户管理', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_STAFF_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_STAFF_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await page.goto('/dashboard');
  await expect(page.getByText('销售额')).toBeVisible();
  await expect(page.getByText('成本')).not.toBeVisible();
  await expect(page.getByText('毛利润')).not.toBeVisible();
  await expect(page.getByText('用户管理')).not.toBeVisible();
});
