import { describe, expect, it } from 'vitest';
import { toAppError } from './app-error';

describe('toAppError', () => {
  it('keeps_the_message_from_supabase_error_objects', () => {
    const error = toAppError({ code: '22003', message: '库存不足，无法完成整单出库' });

    expect(error.message).toBe('库存不足，无法完成整单出库');
  });
});
