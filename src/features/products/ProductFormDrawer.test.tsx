import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductFormDrawer } from './ProductFormDrawer';

const mocks = vi.hoisted(() => ({
  uploadProductImage: vi.fn(),
  createProduct: vi.fn(),
  updateProductPublic: vi.fn(),
  updateProductPricing: vi.fn(),
}));

vi.mock('./products.api', () => mocks);

describe('ProductFormDrawer', () => {
  it('keeps_form_values_and_offers_retry_when_image_upload_fails', async () => {
    mocks.uploadProductImage.mockRejectedValue(new Error('上传失败'));
    render(<ProductFormDrawer open role="owner" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新恐龙积木' } });
    const file = new File(['image'], 'dino.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('商品图片'), { target: { files: [file] } });

    expect(await screen.findByText('重试上传')).toBeInTheDocument();
    expect(screen.getByLabelText('名称')).toHaveValue('新恐龙积木');
    await waitFor(() => expect(mocks.uploadProductImage).toHaveBeenCalledWith(file));
  });
});
