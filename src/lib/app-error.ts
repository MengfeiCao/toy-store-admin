export type AppErrorCode = 'auth' | 'forbidden' | 'duplicate' | 'network' | 'unknown';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode = 'unknown',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

const businessMessages: Record<string, string> = {
  SUPPLIER_INACTIVE: '供应商已停用，不能继续采购',
  OVER_RECEIPT: '到货数量超过采购单剩余数量',
  STOCK_COUNT_STALE: '盘点期间库存已发生变化，请刷新后重试',
  INSUFFICIENT_STOCK: '库存不足，无法完成操作',
  REQUEST_ID_CONFLICT: '请求标识已用于其他操作，请刷新后重试',
  MANUAL_STOCK_IN_DISABLED: '手工入库已停用，请使用采购到货',
  PURCHASE_NOT_EDITABLE: '当前采购单状态不允许编辑',
  PURCHASE_NOT_RECEIVABLE: '当前采购单状态不允许到货',
  PURCHASE_ALREADY_PAID: '采购单已经付款',
  DUPLICATE_BARCODE: '商品条码已存在',
  DUPLICATE_DOCUMENT_NO: '业务单号已存在，请重试',
  DUPLICATE_PRODUCT: '同一采购单不能重复添加商品',
  PURCHASE_NOT_CANCELLABLE: '当前采购单已到货、已付款或状态不允许取消',
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const objectMessage = typeof error === 'object' && error !== null && 'message' in error
    ? (error as { message?: unknown }).message
    : undefined;
  const message = error instanceof Error
    ? error.message
    : typeof objectMessage === 'string'
      ? objectMessage
      : String(error ?? '未知错误');
  const normalized = message.toLowerCase();
  const businessCode = Object.keys(businessMessages).find((code) => message.toUpperCase().includes(code));

  if (businessCode) return new AppError(businessMessages[businessCode], 'unknown', { cause: error });

  if (normalized.includes('invalid login') || normalized.includes('jwt') || normalized.includes('auth')) {
    return new AppError('登录状态已失效，请重新登录', 'auth', { cause: error });
  }
  if (normalized.includes('permission') || normalized.includes('forbidden') || normalized.includes('42501')) {
    return new AppError('你没有执行此操作的权限', 'forbidden', { cause: error });
  }
  if (normalized.includes('duplicate') || normalized.includes('unique')) {
    return new AppError('数据已存在，请检查重复内容', 'duplicate', { cause: error });
  }
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('timeout')) {
    return new AppError('网络暂时不可用，请稍后重试', 'network', { cause: error });
  }
  return new AppError(message || '操作失败，请稍后重试', 'unknown', { cause: error });
}
