import { readFileSync } from 'node:fs';

const file = new URL('./toy-store-admin-prototype-v2.html', import.meta.url);
const html = readFileSync(file, 'utf8');

const required = [
  '玩具销售后台',
  '经营概览',
  '玩具管理',
  '入库单',
  '库存流水',
  '客户管理',
  '销售订单',
  '用户管理',
  '恐龙积木',
  '¥300.00',
  '¥180.00',
  '¥120.00',
  '入库 10 件，出库 3 件',
  'stock: 7',
  '保存草稿',
  '确认订单',
  '确认出库',
  '标记收款',
  '切换为店员视图',
  '撤销收款',
];

for (const text of required) {
  if (!html.includes(text)) throw new Error(`缺少关键内容：${text}`);
}

if (/\[REPLACE\]|\{\{[^}]+\}\}/.test(html)) throw new Error('存在模板占位符');
if (/scrollIntoView\s*\(/.test(html)) throw new Error('使用了禁止的 scrollIntoView');
if (/<img\b[^>]*\bsrc=["']https?:/i.test(html)) throw new Error('存在远程图片依赖');

const sectionTags = [...html.matchAll(/<section\b[^>]*>/g)].map((match) => match[0]);
if (!sectionTags.length || sectionTags.some((tag) => !/data-od-id=/.test(tag))) {
  throw new Error('顶层 section 缺少 data-od-id');
}

const ids = [...html.matchAll(/data-od-id=["']([^"']+)["']/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('data-od-id 必须唯一');

const htmlIds = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
if (new Set(htmlIds).size !== htmlIds.length) throw new Error('HTML id 必须唯一');

const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
const withoutRoot = style.replace(/:root\s*\{[\s\S]*?\}/, '');
if (/#[0-9a-fA-F]{3,8}\b/.test(withoutRoot)) throw new Error('根令牌之外存在原始十六进制颜色');

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('缺少交互脚本');
new Function(script);

const rulesSource = script.match(/\/\* business-rules:start \*\/([\s\S]*?)\/\* business-rules:end \*\//)?.[1];
if (!rulesSource) throw new Error('缺少可执行的业务规则');
const rules = new Function(`${rulesSource}; return { parsePositiveInteger, calculateOrderFigures, normalizeRole, applyStockIn, applyShipment, applyPayment, applyPaymentReversal };`)();
if (rules.parsePositiveInteger('3') !== 3 || rules.parsePositiveInteger('1.5') !== null || rules.parsePositiveInteger('0') !== null) throw new Error('正整数校验不符合规则');
const figures = rules.calculateOrderFigures(3, 100, 60);
if (figures.total !== 300 || figures.cost !== 180 || figures.profit !== 120) throw new Error('金额计算不符合固定案例');
if (rules.normalizeRole('owner') !== 'owner' || rules.normalizeRole('staff') !== 'staff' || rules.normalizeRole('invalid') !== 'staff' || rules.normalizeRole(null) !== 'staff') throw new Error('角色白名单没有安全降权');

let model = { stock: 0, sales: 0, cost: 0, profit: 0, orderCount: 0, postedStockOrderIds: [] };
const stocked = rules.applyStockIn(model, 'RK-DEMO-002', 10, '恐龙积木', '店主账号');
if (!stocked.ok || stocked.state.stock !== 10 || stocked.record.delta !== 10) throw new Error('确认入库未同时更新库存与正向流水');
const duplicatedStock = rules.applyStockIn(stocked.state, 'RK-DEMO-002', 10, '恐龙积木', '店主账号');
if (duplicatedStock.ok || duplicatedStock.reason !== 'already_posted' || duplicatedStock.state.stock !== 10) throw new Error('重复确认入库必须只生效一次');
model = stocked.state;
const order = { status: 'pending', payment: 'unpaid', qty: 3, unitPrice: 100, productNameSnapshot: '恐龙积木' };
const shipped = rules.applyShipment(model, order, 60, '店主账号');
if (!shipped.ok || shipped.state.stock !== 7 || shipped.state.sales !== 300 || shipped.state.cost !== 180 || shipped.state.profit !== 120 || shipped.order.costSnapshot !== 60 || shipped.record.delta !== -3) throw new Error('确认出库闭环不符合固定案例');
const beforeFailure = JSON.stringify(shipped.state);
const failed = rules.applyShipment(shipped.state, { ...order, qty: 8 }, 60, '店主账号');
if (failed.ok || JSON.stringify(failed.state) !== beforeFailure) throw new Error('库存不足时未整单回滚');
const paid = rules.applyPayment(shipped.order, '微信', '店员账号');
if (!paid.ok || paid.order.payment !== 'paid' || paid.order.paidBy !== '店员账号') throw new Error('标记收款未记录方式与操作人');
if (rules.applyPaymentReversal(paid.order, 'staff', '店员账号').ok) throw new Error('店员不应能撤销收款');
const reverted = rules.applyPaymentReversal(paid.order, 'owner', '店主账号');
if (!reverted.ok || reverted.order.payment !== 'unpaid' || !reverted.order.paymentRevertedAt) throw new Error('店主撤销收款未记录追溯信息');

for (const match of html.matchAll(/<(button|input|select|textarea)\b[^>]*>/gi)) {
  if (!/data-od-id=/.test(match[0])) throw new Error(`交互控件缺少 data-od-id：${match[0].slice(0, 90)}`);
}
if (!script.includes("setView('sales');\n      renderNewOrder(true);")) throw new Error('订单弹窗提交后未承接键盘焦点');
if (!style.includes('@media (max-width: 480px)') || !style.includes('.topbar { align-items: stretch; flex-wrap: wrap; }')) throw new Error('极窄屏顶栏未重排');

const markup = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const stack = [];
for (const match of markup.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
  const tag = match[1].toLowerCase();
  if (voidTags.has(tag) || match[0].startsWith('<!')) continue;
  if (match[0].startsWith('</')) {
    const open = stack.pop();
    if (open !== tag) throw new Error(`标签未闭合：期望 </${open}>，实际 </${tag}>`);
  } else if (!match[0].endsWith('/>')) {
    stack.push(tag);
  }
}
if (stack.length) throw new Error(`标签未闭合：${stack.join(', ')}`);

console.log(`原型检查通过：${required.length} 项关键内容，${sectionTags.length} 个页面区块。`);
