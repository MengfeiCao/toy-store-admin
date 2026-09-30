import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toAppError } from '../lib/app-error';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-mark">乐奇玩具</p>
        <h1>玩具销售后台</h1>
        <p className="login-subtitle">登录后管理玩具、库存和销售订单</p>
        <form onSubmit={handleSubmit}>
          <label>
            邮箱
            <input aria-label="邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            密码
            <input aria-label="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {(error || authError) && <p className="form-error" role="alert">{error ?? authError}</p>}
          <button type="submit" disabled={submitting}>{submitting ? '登录中…' : '登录'}</button>
        </form>
      </section>
    </main>
  );
}
