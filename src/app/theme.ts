import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563EB',
    colorBgLayout: '#F6F8FB',
    colorBgContainer: '#FFFFFF',
    colorText: '#182230',
    colorTextSecondary: '#667085',
    colorBorderSecondary: '#E4E7EC',
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  },
  components: {
    Button: { controlHeight: 36 },
    Input: { controlHeight: 36 },
    Select: { controlHeight: 36 },
    Table: { headerBg: '#F8FAFC', headerColor: '#475467' },
  },
};
