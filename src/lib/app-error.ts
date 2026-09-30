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
