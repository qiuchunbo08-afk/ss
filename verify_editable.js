// 冒烟测试：验证 index.html 可编辑化改造
// 1) admin 登录后 Data Admin 可见、renderAdmin 渲染
// 2) 改肉饼(Patty)单价 1.20 -> 1.50 后 CO 成本/毛利自动重算
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const dbjs = fs.readFileSync('database.js', 'utf8');

// 提取内联脚本（最后一个 <script>...</script>）
const m = html.match(/<script>([\s\S]*?)<\/script>/g);
let inline = '';
m.forEach(s => { const c = s.slice(8, -9); if (c.trim()) inline += c + '\n'; });

// ---- DOM 桩 ----
const els = {};
function el(id) {
  if (!els[id]) {
    els[id] = {
      id, value: '', textContent: '', innerHTML: '', style: {},
      classList: { add() {}, remove() {} },
      appendChild() {}
    };
  }
  return els[id];
}
const navAdmin = { style: {} };
const navLinks = [];
const sections = [];
for (let i = 0; i < 12; i++) { navLinks.push({ classList: { add() {}, remove() {} } }); sections.push({ classList: { add() {}, remove() {} } }); }

const documentStub = {
  getElementById: el,
  querySelector(sel) {
    if (sel.includes('data-section="admin"')) return navAdmin;
    if (sel.includes('data-section=')) return navLinks[0];
    return el(sel);
  },
  querySelectorAll(sel) {
    if (sel === '.section') return sections;
    if (sel === '.nav-link') return navLinks;
    return [];
  }
};

// ---- localStorage 桩 ----
const store = {};
const localStorageStub = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

const sandbox = {
  document: documentStub,
  localStorage: localStorageStub,
  alert: msg => { console.log('[alert]', msg); },
  confirm: () => true,
  prompt: () => null,
  console, JSON, Math, parseFloat, parseInt, String, Date, isNaN, Number
};
sandbox.window = sandbox;

vm.createContext(sandbox);
new vm.Script(dbjs + '\n' + inline).runInContext(sandbox);

const pass = [];
const fail = [];

function check(name, cond) { (cond ? pass : fail).push(name); }

// 1) 登录
el('loginUser').value = 'admin';
el('loginPass').value = 'admin123';
sandbox.login();
check('login sets admin nav visible', navAdmin.style.display === 'block');
check('login renders cost body', el('costBody').innerHTML.includes('Classic Burger'));
check('admin products rendered', el('adminProductsBody').innerHTML.includes('prod-price-0'));
check('admin inventory rendered', el('adminInventoryBody').innerHTML.includes('inv-price-1'));

// 2) 改价前 CO：Classic mat=1.71 total=3.71 margin=56.4
const before = el('costBody').innerHTML;
check('Classic cost before change (3.71 total)', before.includes('$3.71'));
check('Classic margin before change (56.4%)', before.includes('56.4%'));

// 3) 模拟 renderAdmin 后把 Patty(idx=1) 单价改为 1.50 并保存
// 桩不解析 innerHTML，故先按当前 DB 回填所有输入框（真实浏览器中自动带 value）
const dbNow = JSON.parse(store['sheepsheep_erp_db']);
dbNow.inventory.forEach((i, idx) => {
  el('inv-name-' + idx).value = i.name;
  el('inv-unit-' + idx).value = i.unit;
  el('inv-stock-' + idx).value = i.stock;
  el('inv-reorder-' + idx).value = i.reorder;
  el('inv-price-' + idx).value = i.price;
});
el('inv-price-1').value = '1.50';
sandbox.saveInventoryAll();
const after = el('costBody').innerHTML;
// 期望：Classic mat = 0.30+1.50+0.125+0.08 = 2.005 -> $2.00; total=4.00; margin=(8.5-4.005)/8.5=52.9%
check('Classic total updated (4.00)', after.includes('$4.00'));
check('Classic margin recalculated (52.9%)', after.includes('52.9%'));
check('Classic material updated (2.00)', after.includes('$2.00'));

// 4) 持久化校验
const saved = JSON.parse(store['sheepsheep_erp_db']);
check('price persisted to localStorage', saved.inventory[1].price === 1.5);

// 5) 非管理员登录不显示 admin
el('loginUser').value = 'kitchen';
el('loginPass').value = 'kitchen123';
sandbox.login();
check('kitchen login hides admin nav', navAdmin.style.display === 'none');

console.log('PASS:', pass.length, '| FAIL:', fail.length);
if (fail.length) { console.log('FAILED:', fail); process.exit(1); }
console.log('OK - editable page smoke test passed');
