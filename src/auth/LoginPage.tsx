import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
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

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) { setError('请输入邮箱和密码'); return; }
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
        <Form layout="vertical" onFinish={() => void handleSubmit()}>
          <Form.Item label="邮箱" required><Input aria-label="邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Form.Item>
          <Form.Item label="密码" required><Input.Password aria-label="密码" value={password} onChange={(event) => setPassword(event.target.value)} /></Form.Item>
          {(error || authError) && <Alert type="error" showIcon message={error ?? authError} />}
          <Button aria-label="登录" type="primary" htmlType="submit" loading={submitting} block>登录</Button>
        </Form>
      </section>
    </main>
  );
}
