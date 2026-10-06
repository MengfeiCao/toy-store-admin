import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, '需要配置本地店主 E2E 凭据');

test('长菜单只滚动导航区域并保持品牌和账号固定', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(process.env.E2E_OWNER_EMAIL!);
  await page.getByLabel('密码').fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/dashboard/);

  const brand = page.getByText('乐奇玩具', { exact: true });
  const account = page.getByText('自动验收店主', { exact: true });
  const navigation = page.getByRole('navigation', { name: '主导航' });
  await expect(brand).toBeVisible();
  await expect(account).toBeVisible();

  const brandBefore = await brand.boundingBox();
  const accountBefore = await account.boundingBox();
  const scrollTop = await navigation.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });

  expect(scrollTop).toBeGreaterThan(0);
  expect((await brand.boundingBox())?.y).toBeCloseTo(brandBefore!.y);
  expect((await account.boundingBox())?.y).toBeCloseTo(accountBefore!.y);
});
