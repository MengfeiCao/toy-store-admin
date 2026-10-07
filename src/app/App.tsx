import type { ReactElement } from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { AppRoutes } from './routes';
import { appTheme } from './theme';

export function App(): ReactElement {
  return (
    <ConfigProvider theme={appTheme}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
