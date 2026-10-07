# 玩具店后台 2.3 实施计划

### Task 1: 报表与扫码数据库接口

- [ ] 写报表口径、权限、滞销和条码查询 pgTAP 失败测试。
- [ ] 新增 `202610010009_reports_and_barcode.sql`，实现统一报表和条码精确查询。
- [ ] 更新数据库类型并运行全部数据库测试。
- [ ] 提交 `feat: add reporting and barcode APIs`。

### Task 2: ECharts 报表与 Excel 导出

- [ ] 安装 ECharts 与 SheetJS，先写 API、页面和导出失败测试。
- [ ] 实现日报、月报、商品、库存、采购和售后分析；图表、表格和 Excel 共用结果。
- [ ] 接入报表导航和路由，验证测试与构建。
- [ ] 提交 `feat: add business reports and Excel export`。

### Task 3: 扫码快速开单与 80mm 小票

- [ ] 先写重复扫码、找不到商品、库存不足和小票测试。
- [ ] 实现快速开单并复用销售订单保存/确认接口。
- [ ] 实现订单小票、打印样式、销售详情打印与重新打印入口。
- [ ] 运行相关测试和浏览器验收。
- [ ] 提交 `feat: add barcode checkout and receipt printing`。

### Task 4: 旧页面 Ant Design 统一与最终验收

- [ ] 将登录、客户、销售列表/编辑/详情及用户管理中可替代的原生交互控件改为 Ant Design。
- [ ] 增加报表、扫码和打印浏览器验收，更新操作与验收文档。
- [ ] 按重建库、数据库、账号、浏览器顺序运行全量验证，再运行前端测试与生产构建。
- [ ] 提交 `test: complete phase 2 acceptance`。
