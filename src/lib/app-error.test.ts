import { describe, expect, it } from 'vitest';
import { toAppError } from './app-error';

describe('toAppError', () => {
  it('keeps_the_message_from_supabase_error_objects', () => {
    const error = toAppError({ code: '22003', message: '库存不足，无法完成整单出库' });

    expect(error.message).toBe('库存不足，无法完成整单出库');
  });

  it.each([
    ['SUPPLIER_INACTIVE', '供应商已停用，不能继续采购'],
    ['OVER_RECEIPT', '到货数量超过采购单剩余数量'],
    ['STOCK_COUNT_STALE', '盘点期间库存已发生变化，请刷新后重试'],
    ['INSUFFICIENT_STOCK', '库存不足，无法完成操作'],
    ['REQUEST_ID_CONFLICT', '请求标识已用于其他操作，请刷新后重试'],
    ['MANUAL_STOCK_IN_DISABLED', '手工入库已停用，请使用采购到货'],
  ])('maps_%s_to_a_clear_business_message', (code, expected) => {
    expect(toAppError({ message: code }).message).toBe(expected);
  });
});
