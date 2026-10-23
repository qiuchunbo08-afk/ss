// ============================================================
// SheepSheep Burger ERP - 数据库层 (Data Layer)
// 本文件是从 index.html 中独立提取的数据库代码：
//  - 数据存储在浏览器 localStorage（JSON 格式，单文件数据库）
//  - 提供 getDB() / saveDB() 两个读写接口
//  - 内含全部种子数据（用户/订单/生产/库存/采购/发票/员工）
// 在 index.html 中通过 <script src="database.js"></script> 引入。
// ============================================================

const DB_KEY = 'sheepsheep_erp_db';

// 读取数据库；首次访问时自动初始化并写入种子数据
function getDB() {
  let db = localStorage.getItem(DB_KEY);
  if (!db) {
    db = {
      users: [
        { username: 'admin', password: 'admin123', role: 'Administrator', name: 'Admin' },
        { username: 'manager', password: 'manager123', role: 'Store Manager', name: 'Manager Li' },
        { username: 'kitchen', password: 'kitchen123', role: 'Kitchen Staff', name: 'Chef Wang' },
        { username: 'finance', password: 'finance123', role: 'Finance', name: 'Accountant Zhang' }
      ],
      orders: [
        { id: 'ORD-001', customer: 'Walk-in Customer', channel: 'Dine-in', items: { classic: 2, cheese: 1, double: 0 }, total: 28.5, status: 'completed', date: '2026-10-12' },
        { id: 'ORD-002', customer: 'Meituan Delivery', channel: 'Delivery Platform', items: { classic: 1, cheese: 2, double: 1 }, total: 42.0, status: 'processing', date: '2026-10-12' },
        { id: 'ORD-003', customer: 'Office Group', channel: 'Takeaway', items: { classic: 5, cheese: 3, double: 2 }, total: 95.5, status: 'pending', date: '2026-10-12' }
      ],
      production: [
        { id: 'PROD-001', burger: 'Classic Burger', qty: 2, status: 'completed', materialCheck: 'ok' },
        { id: 'PROD-002', burger: 'Cheese Burger', qty: 3, status: 'processing', materialCheck: 'ok' },
        { id: 'PROD-003', burger: 'Double Burger', qty: 2, status: 'pending', materialCheck: 'low' }
      ],
      inventory: [
        { name: 'Bun', unit: 'pcs', stock: 45, reorder: 50, price: 0.30 },
        { name: 'Patty', unit: 'pcs', stock: 120, reorder: 80, price: 1.20 },
        { name: 'Vegetable', unit: 'kg', stock: 8, reorder: 10, price: 2.50 },
        { name: 'Sauce', unit: 'kg', stock: 15, reorder: 8, price: 4.00 },
        { name: 'Cheese', unit: 'pcs', stock: 30, reorder: 40, price: 0.80 },
        { name: 'Drink Cup', unit: 'pcs', stock: 200, reorder: 100, price: 0.15 }
      ],
      purchaseOrders: [
        { id: 'PO-001', supplier: 'Bakery Direct', items: 'Bun x 200', total: 60.0, status: 'pending' },
        { id: 'PO-002', supplier: 'Fresh Foods Co.', items: 'Vegetable x 15kg', total: 37.5, status: 'approved' }
      ],
      invoices: [
        { id: 'INV-001', type: 'Payable', party: 'Bakery Direct', amount: 60.0, status: 'pending' },
        { id: 'INV-002', type: 'Receivable', party: 'Meituan Delivery', amount: 42.0, status: 'approved' },
        { id: 'INV-003', type: 'Payable', party: 'Meat Supply Ltd.', amount: 144.0, status: 'approved' }
      ],
      employees: [
        { id: 'E001', name: 'Manager Li', role: 'Store Manager', dept: 'Management', wage: 25, hours: 176, status: 'Active' },
        { id: 'E002', name: 'Chef Wang', role: 'Head Chef', dept: 'Kitchen', wage: 18, hours: 200, status: 'Active' },
        { id: 'E003', name: 'Cook Liu', role: 'Cook', dept: 'Kitchen', wage: 14, hours: 200, status: 'Active' },
        { id: 'E004', name: 'Cashier Zhao', role: 'Cashier', dept: 'Front of House', wage: 12, hours: 168, status: 'Active' },
        { id: 'E005', name: 'Delivery Sun', role: 'Delivery Rider', dept: 'Delivery', wage: 10, hours: 180, status: 'Active' },
        { id: 'E006', name: 'Accountant Zhang', role: 'Accountant', dept: 'Finance', wage: 20, hours: 160, status: 'Active' }
      ],
      // 产品主数据（CO 成本计算的数据源：材料成本 = BOM × 库存单价，非硬编码）
      products: [
        { name: 'Classic Burger', price: 8.5,  labor: 1.2, overhead: 0.8, bom: { Bun: 1, Patty: 1, Vegetable: 0.05, Sauce: 0.02 } },
        { name: 'Cheese Burger',  price: 10.5, labor: 1.2, overhead: 0.8, bom: { Bun: 1, Patty: 1, Vegetable: 0.05, Sauce: 0.02, Cheese: 1 } },
        { name: 'Double Burger',  price: 13.5, labor: 1.5, overhead: 1.0, bom: { Bun: 1, Patty: 2, Vegetable: 0.08, Sauce: 0.03, Cheese: 1 } }
      ],
      nextOrderId: 4,
      nextProdId: 4,
      nextPOId: 3
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db; // 首次初始化直接返回对象，避免 JSON.parse(对象) 报错
  }
  return JSON.parse(db);
}

// 保存数据库（写回 localStorage）
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
