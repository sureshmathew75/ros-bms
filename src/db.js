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

  // Core columns — guaranteed to exist in every Supabase sales table
  const core = {
    id:            String(sale.id || ''),
    shop_id:       shopId,
    customer:      String(sale.customer || ''),
    amount:        Number(sale.amount) || 0,
    status:        String(sale.ful || sale.status || ''),
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
    return_req_date: String(sale.returnReqDate || ''),
    return_rcvd:   String(sale.returnRcvd || ''),
    refund_amt:    Number(sale.refundAmt) || 0,
    addressee:     String(sale.addressee || ''),
    discount:      Number(sale.discount) || 0,
    other_charges: Number(sale.otherCharges) || 0,
    other_charges_label: String(sale.otherChargesLabel || 'Other Charges'),
    re:            String(sale.re || ''),
    tag:           String(sale.tag || ''),
    phone_saved_on:  String(sale.phoneSavedOn || 'UK 888'),
    shop_invoice_no: String(sale.shopInvoiceNo || ''),
    paid_by:         String(sale.paidBy || ''),
    refund_date:     String(sale.refundDate || ''),
    exchange_date:   String(sale.exchangeDate || ''),
    adj_type:        String(sale.adjType || ''),
    adj_amt:         Number(sale.adjAmt) || 0,
    adj_date:        String(sale.adjDate || ''),
    adj_note:        String(sale.adjNote || ''),
    pur_inv_no:      String(sale.purInvNo || ''),
    pur_inv_date:    String(sale.purInvDate || ''),
    pur_amount:      Number(sale.purAmount) || 0,
    tracking_no:     String(sale.trackingNo || ''),
    delivery_date:   String(sale.deliveryDate || ''),
    delivery_time:   String(sale.deliveryTime || ''),
  };

  // Extended columns — added later; sent only if table supports them
  const extended = {
    ful:                 String(sale.ful || sale.status || ''),
    sent_date:           String(sale.sentDate || ''),
    return_req_date:     String(sale.returnReqDate || ''),
    return_rcvd:         String(sale.returnRcvd || ''),
    refund_amt:          Number(sale.refundAmt) || 0,
    addressee:           String(sale.addressee || ''),
    discount:            Number(sale.discount) || 0,
    other_charges:       Number(sale.otherCharges) || 0,
    other_charges_label: String(sale.otherChargesLabel || 'Other Charges'),
    re:                  String(sale.re || ''),
    tag:                 String(sale.tag || ''),
  };

  const payload = { ...core, ...extended };

  // Check if record already exists
  const { data: existing } = await sb.from('sales')
    .select('id').eq('id', core.id).eq('shop_id', shopId).maybeSingle();

  const upsert = async (data) => {
    if (existing) {
      return sb.from('sales').update(data).eq('id', core.id).eq('shop_id', shopId);
    } else {
      return sb.from('sales').insert(data);
    }
  };

  // Try full payload first, fall back to core-only if extended columns missing
  let { error } = await upsert(payload);
  if (error) {
    console.warn('⚠️ Full payload failed, retrying with core columns only:', error.message);
    ({ error } = await upsert(core));
  }

  if (error) {
    console.error('❌ Sale save error:', JSON.stringify(error));
    throw error;
  } else {
    console.log('✅ Sale saved:', sale.id);
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
    returnReqDate: r.return_req_date || '',
    returnRcvd:   r.return_rcvd || '',
    refundAmt:    Number(r.refund_amt) || 0,
    addressee:    r.addressee || '',
    discount:     Number(r.discount) || 0,
    otherCharges: Number(r.other_charges) || 0,
    otherChargesLabel: r.other_charges_label || 'Other Charges',
    re:           r.re || '',
    tag:          r.tag || '',
    phoneSavedOn:  r.phone_saved_on || 'UK 888',
    shopInvoiceNo: r.shop_invoice_no || '',
    refundDate:    r.refund_date || '',
    exchangeDate:  r.exchange_date || '',
    adjType:       r.adj_type || '',
    adjAmt:        Number(r.adj_amt) || 0,
    adjDate:       r.adj_date || '',
    adjNote:       r.adj_note || '',
    purInvNo:      r.pur_inv_no || '',
    purInvDate:    r.pur_inv_date || '',
    purAmount:     Number(r.pur_amount) || 0,
    paidBy:        r.paid_by || '',
    trackingNo:    r.tracking_no || '',
    deliveryDate:  r.delivery_date || '',
    deliveryTime:  r.delivery_time || '',
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
  if (!sb) return { error: 'No Supabase client' };

  // purchases.id is UUID — never send our own text ID
  // Store PI-0701 style reference in purchase_ref column
  const payload = {
    shop_id:       shopId,
    purchase_ref:  p.id || p.purchaseId || '',
    date:          p.date || today(),
    supplier:      p.supplier || p.sup || '',
    invoice_no:    p.invoiceNo || p.invoice_no || '',
    batch:         p.batch || '',
    item:          p.item || p.itemCustom || '',
    qty:           String(p.qty || ''),
    total:         Number(p.total) || 0,
    gst:           Number(p.gst) || 0,
    pay_by:        p.payBy || p.pay_by || '',
    pay_date:      p.payDate || p.pay_date || null,
    logistic_by:   p.logisticBy || p.logistic_by || '',
    logistic_ref:  p.logisticRef || p.logistic_ref || '',
    received_date: p.receivedDate || p.received_date || null,
    remarks:       p.remarks || '',
    status:        p.status || 'PENDING',
  };

  // If _uuid provided, this is an update of an existing row
  if (p._uuid) {
    const { error: updErr } = await sb.from('purchases').update(payload).eq('id', p._uuid).eq('shop_id', shopId);
    if (updErr) { console.error('❌ Purchase update error:', updErr); return { error: updErr.message }; }
    console.log('✅ Purchase updated:', p._uuid);
    return { error: null };
  }

  const { data, error } = await sb.from('purchases').insert(payload).select('id').single();
  if (error) {
    console.error('❌ Purchase insert error:', error);
    return { error: error.message };
  }
  console.log('✅ Purchase saved, uuid:', data?.id);
  return { error: null, uuid: data?.id };
};

export const dbLoadPurchases = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('purchases').select('*')
    .eq('shop_id', shopId)
    .order('date', { ascending: false });
  if (error) { console.error('Load purchases error:', error); return null; }
  return data.map(r => ({
    id:           r.purchase_ref || (r.id ? r.id.slice(0,8).toUpperCase() : ""),
    uuid:         r.id,
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
  if (!sb) return { error: 'No Supabase client' };

  const payload = {
    shop_id:      shopId,
    shipment_ref: l.id || l.shipmentId || '',
    order_ref:    l.order || l.order_ref || l.purchaseId || '',
    supplier:     l.supplier || '',
    delivery_addr:l.deliveryAddr || '',
    service:      l.service === '__custom__' ? l.serviceCustom : (l.service || ''),
    agent:        l.agent === '__custom__' ? l.agentCustom : (l.agent || ''),
    tracking:     l.track || l.tracking || l.trackingNo || '',
    cost:         Number(l.cost) || 0,
    weight:       l.weight || '',
    status:       l.status || 'PENDING',
    dispatched:   l.disp || l.dispatched || '',
    eta:          l.eta || '',
    notes:        l.notes || l.remarks || '',
  };

  // If _uuid provided, update existing row
  if (l._uuid) {
    const { error } = await sb.from('logistics').update(payload).eq('id', l._uuid).eq('shop_id', shopId);
    if (error) { console.error('❌ Update logistic error:', error); return { error: error.message }; }
    console.log('✅ Logistic updated:', l._uuid);
    return { error: null };
  }

  // Insert new — let Supabase generate UUID
  const { data, error } = await sb.from('logistics').insert(payload).select('id').single();
  if (error) { console.error('❌ Insert logistic error:', error); return { error: error.message }; }
  console.log('✅ Logistic saved, uuid:', data?.id);
  return { error: null, uuid: data?.id };
};

export const dbLoadLogistics = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('logistics').select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Load logistics error:', error); return null; }
  return data.map(r => ({
    id:           r.shipment_ref || r.id,
    uuid:         r.id,
    order:        r.order_ref || '',
    supplier:     r.supplier || '',
    deliveryAddr: r.delivery_addr || '',
    service:      r.service || '',
    agent:        r.agent || '',
    track:        r.tracking || '',
    trackingNo:   r.tracking || '',
    cost:         Number(r.cost) || 0,
    weight:       r.weight || '',
    status:       r.status || '',
    disp:         r.dispatched || '',
    eta:          r.eta || '',
    notes:        r.notes || '',
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
  if (!sb) return { error: 'No Supabase client' };

  const payload = {
    shop_id:  shopId,
    name:     s.name || '',
    contact:  s.contact || '',
    phone:    s.phone || '',
    email:    s.email || '',
    category: s.category || 'General',
    terms:    s.terms || '',
    place:    s.place || '',
    address:  s.address || '',
    remarks:  s.remarks || s.notes || '',
  };

  // If existing id provided, try update first
  if (s.id) {
    const { data: existing } = await sb.from('suppliers').select('id')
      .eq('id', s.id).eq('shop_id', shopId).maybeSingle();
    if (existing) {
      const { error } = await sb.from('suppliers').update(payload).eq('id', s.id).eq('shop_id', shopId);
      if (error) { console.error('Update supplier error:', error); return { error: error.message }; }
      console.log('✅ Supplier updated:', s.id);
      return { error: null };
    }
  }

  // Insert new — let Supabase generate UUID
  const { data, error } = await sb.from('suppliers').insert(payload).select('id').single();
  if (error) { console.error('Insert supplier error:', error); return { error: error.message }; }
  console.log('✅ Supplier inserted:', data?.id);
  return { error: null, id: data?.id };
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
    category: r.category || 'General',
    terms:    r.terms || '',
    place:    r.place || '',
    address:  r.address || '',
    remarks:  r.remarks || r.notes || '',
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

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   APP USERS
   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

export const dbLoadUsers = async () => {
  if (!sb) return null;
  const { data, error } = await sb.from('app_users').select('*');
  if (error) { console.error('Load users error:', error); return null; }
  return data.map(r => ({
    id:       r.id,
    name:     r.name || '',
    initials: r.initials || '',
    role:     r.role || 'staff',
    pin:      r.pin || '',
    shops:    r.shops ? r.shops.split(',').filter(Boolean) : null,
    avatar:   r.avatar || '',
  }));
};

export const dbSaveUser = async (u) => {
  if (!sb) return;
  const payload = {
    id:       u.id,
    name:     u.name || '',
    initials: u.initials || '',
    role:     u.role || 'staff',
    pin:      u.pin || '',
    shops:    Array.isArray(u.shops) && u.shops.length > 0 ? u.shops.join(',') : '',
    avatar:   u.avatar || '',
  };
  const { error } = await sb.from('app_users').upsert(payload, { onConflict: 'id' });
  if (error) console.error('Save user error:', error);
  else console.log('\u2705 User saved:', u.id);
};

export const dbDeleteUser = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('app_users').delete().eq('id', id);
  if (error) console.error('Delete user error:', error);
  else console.log('\u2705 User deleted:', id);
};
// ── Shop Items (quick-add capsules in New Sale form) ──────────────────────

export const dbLoadShopItems = async () => {
  if (!sb) return {};
  const { data, error } = await sb.from('shop_items').select('shop_id,name').order('created_at');
  if (error) { console.error('Load shop items error:', error); return {}; }
  const result = { 'ros-selections': [], 'ros-hairlines': [], 'ros-india': [] };
  (data || []).forEach(r => {
    if (result[r.shop_id]) result[r.shop_id].push(r.name);
  });
  return result;
};

export const dbAddShopItem = async (shopId, name) => {
  if (!sb) return;
  const { error } = await sb.from('shop_items').insert({ shop_id: shopId, name: name.trim() });
  if (error && !error.message.includes('duplicate')) console.error('Add shop item error:', error);
};

export const dbDeleteShopItem = async (shopId, name) => {
  if (!sb) return;
  const { error } = await sb.from('shop_items').delete().eq('shop_id', shopId).eq('name', name);
  if (error) console.error('Delete shop item error:', error);
};

/* ═══════════════════════════════════════════════════════════
   RETURNS
   ═══════════════════════════════════════════════════════════ */

/* Generate next RET-YYYY-XXXX id */
export const dbNextReturnId = async () => {
  const year = new Date().getFullYear();
  const { data, error } = await sb
    .from('returns')
    .select('id')
    .like('id', `RET-${year}-%`)
    .order('id', { ascending: false })
    .limit(1);
  if (error) { console.error('ReturnId seq error:', error); return `RET-${year}-0001`; }
  if (!data || data.length === 0) return `RET-${year}-0001`;
  const last = data[0].id; // RET-2026-0042
  const num = parseInt(last.split('-')[2] || '0', 10);
  return `RET-${year}-${String(num + 1).padStart(4, '0')}`;
};

export const dbSaveReturn = async (ret) => {
  if (!sb) return;
  const payload = {
    id:                     ret.id,
    shop_id:                ret.shopId,
    sale_id:                ret.saleId,
    customer:               ret.customer || '',
    phone:                  ret.phone || '',
    reason:                 ret.reason || '',
    resolution:             ret.resolution || 'refund',
    status:                 ret.status || 'RETURN_APPROVED',
    return_deadline:        ret.returnDeadline || '',
    tracking_no:            ret.trackingNo || '',
    courier:                ret.courier || '',
    proof_url:              ret.proofUrl || '',
    received_date:          ret.receivedDate || '',
    refund_date:            ret.refundDate || '',
    exchange_date:          ret.exchangeDate || '',
    staff_notes:            ret.staffNotes || '',
    return_address_version: ret.returnAddressVersion || 'v1',
    expired_at:             ret.expiredAt || '',
  };
  const { data: existing } = await sb.from('returns').select('id').eq('id', ret.id).maybeSingle();
  const { error } = existing
    ? await sb.from('returns').update(payload).eq('id', ret.id)
    : await sb.from('returns').insert(payload);
  if (error) console.error('Save return error:', error);
  else console.log('✅ Return saved:', ret.id);
};

export const dbLoadReturns = async (shopId) => {
  if (!sb) return [];
  const q = shopId
    ? sb.from('returns').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
    : sb.from('returns').select('*').order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) { console.error('Load returns error:', error); return []; }
  return (data || []).map(r => ({
    id:                   r.id,
    shopId:               r.shop_id,
    saleId:               r.sale_id,
    customer:             r.customer || '',
    phone:                r.phone || '',
    reason:               r.reason || '',
    resolution:           r.resolution || 'refund',
    status:               r.status || 'RETURN_APPROVED',
    createdAt:            r.created_at || '',
    returnDeadline:       r.return_deadline || '',
    trackingNo:           r.tracking_no || '',
    courier:              r.courier || '',
    proofUrl:             r.proof_url || '',
    receivedDate:         r.received_date || '',
    refundDate:           r.refund_date || '',
    exchangeDate:         r.exchange_date || '',
    staffNotes:           r.staff_notes || '',
    returnAddressVersion: r.return_address_version || 'v1',
    expiredAt:            r.expired_at || '',
  }));
};

export const dbDeleteReturn = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('returns').delete().eq('id', id);
  if (error) console.error('Delete return error:', error);
  else console.log('✅ Return deleted:', id);
};

/* ═══════════════════════════════════════════════════════════
   MESSAGE QUEUE
   ═══════════════════════════════════════════════════════════ */

export const dbAddMessage = async (msg) => {
  if (!sb) return;
  const payload = {
    shop_id:      msg.shopId,
    sale_id:      msg.saleId,
    customer:     msg.customer || '',
    phone:        msg.phone || '',
    message_type: msg.messageType,
    message_body: msg.messageBody,
    status:       'READY',
  };
  const { error } = await sb.from('message_queue').insert(payload);
  if (error) console.error('Add message error:', error);
  else console.log('✅ Message queued:', msg.messageType, msg.saleId);
};

export const dbLoadMessages = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb
    .from('message_queue')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Load messages error:', error); return []; }
  return (data || []).map(r => ({
    id:          r.id,
    shopId:      r.shop_id,
    saleId:      r.sale_id,
    customer:    r.customer || '',
    phone:       r.phone || '',
    messageType: r.message_type || '',
    messageBody: r.message_body || '',
    status:      r.status || 'READY',
    createdAt:   r.created_at || '',
    sentAt:      r.sent_at || '',
    cancelledBy: r.cancelled_by || '',
  }));
};

export const dbMarkMessageSent = async (id) => {
  if (!sb) return;
  const { error } = await sb
    .from('message_queue')
    .update({ status: 'SENT', sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Mark sent error:', error);
};

export const dbCancelMessage = async (id, cancelledBy = '') => {
  if (!sb) return;
  const { error } = await sb
    .from('message_queue')
    .update({ status: 'CANCELLED', cancelled_by: cancelledBy })
    .eq('id', id);
  if (error) console.error('Cancel message error:', error);
};

/* Check if a specific message type already exists for a sale (avoid duplicates) */
export const dbDeleteMessage = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('message_queue').delete().eq('id', id);
  if (error) console.error('Delete message error:', error);
  else console.log('✅ Message deleted:', id);
};

export const dbDeleteMessages = async (ids = []) => {
  if (!sb || ids.length === 0) return;
  const { error } = await sb.from('message_queue').delete().in('id', ids);
  if (error) console.error('Bulk delete messages error:', error);
  else console.log('✅ Messages deleted:', ids.length);
};

export const dbMessageExists = async (shopId, saleId, messageType) => {
  if (!sb) return false;
  const { data, error } = await sb
    .from('message_queue')
    .select('id')
    .eq('shop_id', shopId)
    .eq('sale_id', saleId)
    .eq('message_type', messageType)
    .neq('status', 'CANCELLED')
    .maybeSingle();
  if (error) return false;
  return !!data;
};

/* ═══════════════════════════════════════════════════════════
   DELIVERY CONFIRMATION  (patch delivery_date onto a sale)
   ═══════════════════════════════════════════════════════════ */

export const dbSaveDelivery = async (shopId, saleId, deliveryDate, deliveryTime = '') => {
  if (!sb) return;
  const { error } = await sb
    .from('sales')
    .update({
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
    })
    .eq('id', saleId)
    .eq('shop_id', shopId);
  if (error) console.error('Save delivery error:', error);
  else console.log('✅ Delivery confirmed:', saleId, deliveryDate);
};
