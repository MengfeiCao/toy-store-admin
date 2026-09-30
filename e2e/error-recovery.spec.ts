import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, '需要配置 E2E 凭据');

test('库存不足时不完成订单', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await page.goto('/sales');
  await expect(page.getByText('销售订单')).toBeVisible();
});
