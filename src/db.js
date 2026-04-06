import { createClient } from '@supabase/supabase-js';

const url = 'https://fssyvdxqtruacauwygjj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3l2ZHhxdHJ1YWNhdXd5Z2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDYwODQsImV4cCI6MjA4ODk4MjA4NH0.O8Mp89s2AXCZyvykzLmpiUeC34Hl4LV3NtLgzffJRY4';
const sb = createClient(url, key);

const today = () => new Date().toISOString().split('T')[0];

/* ═══════════════════════════════════════════════════════════
   SALES
   ═══════════════════════════════════════════════════════════ */
export const dbSaveSale = async (shopId, sale) => {
  if (!sb) return;
  // Only include columns that exist in the Supabase sales table.
  const payload = {
    id:            String(sale.id || ''),
    shop_id:       shopId,
    customer:      String(sale.customer || ''),
    amount:        Number(sale.amount) || 0,
    status:        String(sale.status || ''),
    pay:           String(sale.pay || ''),
    date:          String(sale.date || today()),
    item:          String(sale.item || ''),
    qty:           String(sale.qty || '1'),
    contact:       String(sale.contact || ''),
    phone:         String(sale.phone || ''),
    address:       String(sale.address || ''),
    rem:           String(sale.rem || ''),
    tax_rate:      sale.taxRate !== undefined && sale.taxRate !== null ? Number(sale.taxRate) : 0,
    tax_inclusive: sale.taxInclusive !== false,
    invoice_no:    String(sale.invoiceNo || sale.id || ''),
    ful:           String(sale.ful || sale.status || ''),
    sent_date:     String(sale.sentDate || ''),
    refund_amt:    Number(sale.refundAmt) || 0,
    addressee:     String(sale.addressee || ''),
    discount:      Number(sale.discount) || 0,
    other_charges: Number(sale.otherCharges) || 0,
    other_charges_label: String(sale.otherChargesLabel || 'Other Charges'),
    re:            String(sale.re || ''),
    tag:           String(sale.tag || ''),
  };

  // Try update first (for existing records), then insert (for new ones)
  const { data: existing } = await sb.from('sales')
    .select('id').eq('id', payload.id).eq('shop_id', shopId).maybeSingle();

  if (existing) {
    const { error } = await sb.from('sales').update(payload)
      .eq('id', payload.id).eq('shop_id', shopId);
    if (error) console.error('❌ Update sale error:', JSON.stringify(error));
    else console.log('✅ Sale updated:', sale.id);
  } else {
    const { error } = await sb.from('sales').insert(payload);
    if (error) console.error('❌ Insert sale error:', JSON.stringify(error));
    else console.log('✅ Sale inserted:', sale.id);
  }
};

/* Parse any date string to a comparable timestamp for sorting */
const parseDateMs = (raw) => {
  if (!raw) return 0;
  const s = String(raw).trim();
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s).getTime();
  // M/D/YYYY or MM/DD/YYYY (US import format)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2])).getTime();
  // DD-MM-YYYY
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  return 0;
};

export const dbLoadSales = async (shopId) => {
  if (!sb) return null;
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from('sales').select('*')
      .eq('shop_id', shopId)
      .range(from, from + PAGE - 1);
    if (error) { console.error('Load sales error:', error); return null; }
    if (!data || data.length === 0) break;
    all = [...all, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const mapped = all.map(r => ({
    id:           r.id,
    customer:     r.customer || '',
    amount:       Number(r.amount) || 0,
    status:       r.status || '',
    pay:          r.pay || '',
    date:         r.date || '',
    item:         r.item || '',
    qty:          r.qty || '1',
    contact:      r.contact || '',
    phone:        r.phone || '',
    address:      r.address || '',
    rem:          r.rem || '',
    taxRate:      r.tax_rate !== undefined && r.tax_rate !== null ? Number(r.tax_rate) : 0,
    taxInclusive: r.tax_inclusive !== false,
    invoiceNo:    r.invoice_no || r.id,
    ful:          r.ful || r.status || '',
    sentDate:     r.sent_date || '',
    refundAmt:    Number(r.refund_amt) || 0,
    addressee:    r.addressee || '',
    discount:     Number(r.discount) || 0,
    otherCharges: Number(r.other_charges) || 0,
    otherChargesLabel: r.other_charges_label || 'Other Charges',
    re:           r.re || '',
    tag:          r.tag || '',
  }));
  return mapped.sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date));
};

export const dbDeleteSale = async (id, shopId) => {
  if (!sb) return;
  const q = shopId
    ? sb.from('sales').delete().eq('id', id).eq('shop_id', shopId)
    : sb.from('sales').delete().eq('id', id);
  const { error } = await q;
  if (error) console.error('Delete sale error:', error);
  else console.log('✅ Sale deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   PURCHASES
   ═══════════════════════════════════════════════════════════ */
export const dbSavePurchase = async (shopId, p) => {
  if (!sb) return;
  const { data: existing } = await sb.from('purchases').select('id')
    .eq('id', p.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:            p.id,
    shop_id:       shopId,
    date:          p.date || today(),
    supplier:      p.supplier || p.sup || '',
    invoice_no:    p.invoiceNo || '',
    batch:         p.batch || '',
    item:          p.item || p.itemCustom || '',
    qty:           p.qty || '',
    total:         Number(p.total) || 0,
    gst:           Number(p.gst) || 0,
    pay_by:        p.payBy || '',
    pay_date:      p.payDate || null,
    logistic_by:   p.logisticBy || '',
    logistic_ref:  p.logisticRef || '',
    received_date: p.receivedDate || null,
    remarks:       p.remarks || '',
    status:        p.status || 'PENDING',
  };

  const { error } = existing
    ? await sb.from('purchases').update(payload).eq('id', p.id).eq('shop_id', shopId)
    : await sb.from('purchases').insert(payload);

  if (error) console.error('❌ Save purchase error:', error);
  else console.log('✅ Purchase saved:', p.id);
};

export const dbLoadPurchases = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('purchases').select('*')
    .eq('shop_id', shopId)
    .order('date', { ascending: false });
  if (error) { console.error('Load purchases error:', error); return null; }
  return data.map(r => ({
    id:           r.id,
    date:         r.date || '',
    sup:          r.supplier || '',
    supplier:     r.supplier || '',
    invoiceNo:    r.invoice_no || '',
    batch:        r.batch || '',
    item:         r.item || '',
    qty:          r.qty || '',
    total:        Number(r.total) || 0,
    gst:          Number(r.gst) || 0,
    payBy:        r.pay_by || '',
    payDate:      r.pay_date || '',
    logisticBy:   r.logistic_by || '',
    logisticRef:  r.logistic_ref || '',
    receivedDate: r.received_date || '',
    remarks:      r.remarks || '',
    status:       r.status || 'PENDING',
  }));
};

export const dbDeletePurchase = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('purchases').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete purchase error:', error);
  else console.log('✅ Purchase deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   EXPENSES
   ═══════════════════════════════════════════════════════════ */
export const dbSaveExpense = async (shopId, e) => {
  if (!sb) return;
  const { data: existing } = await sb.from('expenses').select('id')
    .eq('id', e.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:      e.id,
    shop_id: shopId,
    date:    e.date || today(),
    cat:     e.cat || '',
    "desc":  e.desc || '',
    amount:  Number(e.amount) || 0,
    method:  e.method || '',
    notes:   e.notes || '',
  };

  const { error } = existing
    ? await sb.from('expenses').update(payload).eq('id', e.id).eq('shop_id', shopId)
    : await sb.from('expenses').insert(payload);

  if (error) console.error('❌ Save expense error:', error);
  else console.log('✅ Expense saved:', e.id);
};

export const dbLoadExpenses = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('expenses').select('*')
    .eq('shop_id', shopId)
    .order('date', { ascending: false });
  if (error) { console.error('Load expenses error:', error); return null; }
  return data.map(r => ({
    id:     r.id,
    date:   r.date || '',
    cat:    r.cat || '',
    desc:   r.desc || '',
    amount: Number(r.amount) || 0,
    method: r.method || '',
    notes:  r.notes || '',
  }));
};

export const dbDeleteExpense = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('expenses').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete expense error:', error);
  else console.log('✅ Expense deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   LOGISTICS
   ═══════════════════════════════════════════════════════════ */
export const dbSaveLogistic = async (shopId, l) => {
  if (!sb) return;
  const { data: existing } = await sb.from('logistics').select('id')
    .eq('id', l.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:         l.id,
    shop_id:    shopId,
    order_ref:  l.order || l.order_ref || '',
    agent:      l.agent || '',
    tracking:   l.track || l.tracking || '',
    status:     l.status || 'PENDING',
    dispatched: l.disp || l.dispatched || '',
    eta:        l.eta || '',
    notes:      l.notes || '',
  };

  const { error } = existing
    ? await sb.from('logistics').update(payload).eq('id', l.id).eq('shop_id', shopId)
    : await sb.from('logistics').insert(payload);

  if (error) console.error('❌ Save logistic error:', error);
  else console.log('✅ Logistic saved:', l.id);
};

export const dbLoadLogistics = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('logistics').select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Load logistics error:', error); return null; }
  return data.map(r => ({
    id:     r.id,
    order:  r.order_ref || '',
    agent:  r.agent || '',
    track:  r.tracking || '',
    status: r.status || '',
    disp:   r.dispatched || '',
    eta:    r.eta || '',
    notes:  r.notes || '',
  }));
};

export const dbDeleteLogistic = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('logistics').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete logistic error:', error);
  else console.log('✅ Logistic deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   CUSTOMERS  (shop-isolated)
   ═══════════════════════════════════════════════════════════ */
export const dbSaveCustomer = async (shopId, customer) => {
  if (!sb) return;
  const { data: existing } = await sb.from('customers').select('id')
    .eq('id', customer.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:        customer.id,
    shop_id:   shopId,
    name:      customer.name || '',
    phone:     customer.phone || '',
    whatsapp:  customer.whatsapp || '',
    address:   customer.address || '',
    tag:       customer.tag || '',
    notes:     customer.notes || '',
    purchases: customer.purchases || 0,
    spend:     customer.spend || 0,
    last:      customer.last || '',
  };

  const { error } = existing
    ? await sb.from('customers').update(payload).eq('id', customer.id).eq('shop_id', shopId)
    : await sb.from('customers').insert(payload);

  if (error) console.error('Save customer error:', error);
  else console.log('✅ Customer saved:', customer.id);
};

export const dbLoadCustomers = async (shopId) => {
  if (!sb) return null;
  const q = shopId
    ? sb.from('customers').select('*').eq('shop_id', shopId).order('name', { ascending: true })
    : sb.from('customers').select('*').order('name', { ascending: true });
  const { data, error } = await q;
  if (error) { console.error('Load customers error:', error); return null; }
  return data.map(r => ({
    id:        r.id,
    name:      r.name || '',
    phone:     r.phone || '',
    whatsapp:  r.whatsapp || '',
    address:   r.address || '',
    tag:       r.tag || '',
    notes:     r.notes || '',
    purchases: r.purchases || 0,
    spend:     r.spend || 0,
    last:      r.last || '',
  }));
};

export const dbDeleteCustomer = async (id, shopId) => {
  if (!sb) return;
  const q = shopId
    ? sb.from('customers').delete().eq('id', id).eq('shop_id', shopId)
    : sb.from('customers').delete().eq('id', id);
  const { error } = await q;
  if (error) console.error('Delete customer error:', error);
  else console.log('✅ Customer deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   SUPPLIERS  (shop-isolated)
   ═══════════════════════════════════════════════════════════ */
export const dbSaveSupplier = async (shopId, s) => {
  if (!sb) return;
  const { data: existing } = await sb.from('suppliers').select('id')
    .eq('id', s.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:       s.id,
    shop_id:  shopId,
    name:     s.name || '',
    contact:  s.contact || '',
    phone:    s.phone || '',
    email:    s.email || '',
    category: s.category || '',
    terms:    s.terms || '',
    notes:    s.notes || '',
  };

  const { error } = existing
    ? await sb.from('suppliers').update(payload).eq('id', s.id).eq('shop_id', shopId)
    : await sb.from('suppliers').insert(payload);

  if (error) console.error('Save supplier error:', error);
  else console.log('✅ Supplier saved:', s.id);
};

export const dbLoadSuppliers = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('suppliers').select('*')
    .eq('shop_id', shopId).order('name', { ascending: true });
  if (error) { console.error('Load suppliers error:', error); return null; }
  return data.map(r => ({
    id:       r.id,
    name:     r.name || '',
    contact:  r.contact || '',
    phone:    r.phone || '',
    email:    r.email || '',
    category: r.category || '',
    terms:    r.terms || '',
    notes:    r.notes || '',
  }));
};

export const dbDeleteSupplier = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('suppliers').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete supplier error:', error);
  else console.log('✅ Supplier deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   PRODUCTS  (shop-isolated)
   ═══════════════════════════════════════════════════════════ */
export const dbSaveProduct = async (shopId, p) => {
  if (!sb) return;
  const { data: existing } = await sb.from('products').select('id')
    .eq('id', p.id).eq('shop_id', shopId).maybeSingle();

  const payload = {
    id:      p.id,
    shop_id: shopId,
    name:    p.name || '',
    sku:     p.sku || '',
    cat:     p.cat || '',
    cost:    Number(p.cost) || 0,
    sell:    Number(p.sell) || 0,
    stock:   Number(p.stock) || 0,
    min:     Number(p.min) || 0,
    notes:   p.notes || '',
  };

  const { error } = existing
    ? await sb.from('products').update(payload).eq('id', p.id).eq('shop_id', shopId)
    : await sb.from('products').insert(payload);

  if (error) console.error('Save product error:', error);
  else console.log('✅ Product saved:', p.id);
};

export const dbLoadProducts = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('products').select('*')
    .eq('shop_id', shopId).order('name', { ascending: true });
  if (error) { console.error('Load products error:', error); return null; }
  return data.map(r => ({
    id:    r.id,
    name:  r.name || '',
    sku:   r.sku || '',
    cat:   r.cat || '',
    cost:  Number(r.cost) || 0,
    sell:  Number(r.sell) || 0,
    stock: Number(r.stock) || 0,
    min:   Number(r.min) || 0,
    notes: r.notes || '',
  }));
};

export const dbDeleteProduct = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('products').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete product error:', error);
  else console.log('✅ Product deleted:', id);
};