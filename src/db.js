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
    shopify_order_id: sale.shopifyOrderId || null,
    contact:       String(sale.contact || ''),
    phone:         String(sale.phone || ''),
    address:       String(sale.address || ''),
    rem:           String(sale.rem || ''),
    tax_rate:      sale.taxRate !== undefined && sale.taxRate !== null ? Number(sale.taxRate) : 0,
    tax_inclusive: sale.taxInclusive !== false,
    invoice_no:    String(sale.invoiceNo || sale.id || ''),
    ful:           String(sale.ful || sale.status || ''),
    sent_date:     String(sale.sentDate || ''),
    dispatch_from:      sale.dispatchFrom || '',
    carrier:             sale.carrier || '',
    tracking_notified:   sale.trackingNotified ? true : false,
    expected_total: Number(sale.expectedTotal) || 0,
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
    pur_other_charges: Number(sale.purOtherCharges) || 0,
    pur_other_charges_note: String(sale.purOtherChargesNote || ''),
    tracking_no:     String(sale.trackingNo || ''),
    sortpos:         sale.sortpos !== undefined && sale.sortpos !== null ? Number(sale.sortpos) : null,
    ready_to_ship:   sale.readyToShip ? true : false,
    delivery_date:        String(sale.deliveryDate || ''),
    delivery_informed:    sale.deliveryInformed ? true : false,
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
    flagged:             sale.flagged ? true : false,
    checked:             sale.checked ? true : false,
    sortpos:             sale.sortpos !== undefined && sale.sortpos !== null ? Number(sale.sortpos) : null,
    payment_type:        sale.paymentType || 'FULL',
    manual_link_group:   sale.manualLinkGroup || null,
    ready_to_ship:       sale.readyToShip ? true : false,
  };

  const payload = { ...core, ...extended, verified: sale.verified || false };

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
  let usedFallback = false;
  if (error) {
    console.warn('⚠️ Full payload failed, retrying with core columns only:', error.message);
    usedFallback = true;
    ({ error } = await upsert(core));
  }

  if (error) {
    console.error('❌ Sale save error:', JSON.stringify(error));
    throw error;
  } else {
    console.log('✅ Sale saved:', sale.id);
    return !usedFallback;
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
    purOtherCharges: Number(r.pur_other_charges) || 0,
    purOtherChargesNote: r.pur_other_charges_note || '',
    paidBy:        r.paid_by || '',
    trackingNo:    r.tracking_no || '',
    dispatchFrom:      r.dispatch_from || '',
    carrier:           r.carrier || '',
    trackingNotified:  r.tracking_notified || false,
    expectedTotal: Number(r.expected_total) || 0,
    deliveryDate:      r.delivery_date || '',
    deliveryInformed:  r.delivery_informed || false,
    deliveryTime:  r.delivery_time || '',
    verified:      r.verified || false,
    flagged:       r.flagged || false,
    checked:       r.checked || false,
    sortpos:       r.sortpos !== undefined && r.sortpos !== null ? Number(r.sortpos) : null,
    paymentType:   r.payment_type || 'FULL',
    manualLinkGroup: r.manual_link_group || null,
    readyToShip: r.ready_to_ship || false,
    shopifyOrderId: r.shopify_order_id || null,
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
    advance_paid:  Number(p.advancePaid || p.advance_paid) || 0,
    balance_due:   Number(p.balanceDue  || p.balance_due)  || 0,
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
    advancePaid:  Number(r.advance_paid) || 0,
    balanceDue:   Number(r.balance_due) || 0,
    payBy:        r.pay_by || '',
    payDate:      r.pay_date || '',
    logisticBy:   r.logistic_by || '',
    logisticRef:  r.logistic_ref || '',
    receivedDate: r.received_date || '',
    remarks:      r.remarks || '',
    status:       r.status || 'PENDING',
    documents:    Array.isArray(r.documents) ? r.documents : [],
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
  if (!sb) return { error: 'No client' };

  const payload = {
    shop_id: shopId,
    date:    e.date || today(),
    cat:     e.cat || '',
    "desc":  e.desc || '',
    amount:  Number(e.amount) || 0,
    method:  e.method || '',
    notes:   e.notes || '',
    pay_to:      e.payTo || '',
    invoice_no:  e.invoiceNo || '',
    invoice_date: e.invoiceDate || null,
  };

  // Update existing row by UUID
  if (e._uuid) {
    const { error } = await sb.from('expenses').update(payload).eq('id', e._uuid).eq('shop_id', shopId);
    if (error) { console.error('Update expense error:', error); return { error: error.message }; }
    return { error: null };
  }

  // Insert new — let Supabase generate UUID
  const { data, error } = await sb.from('expenses').insert(payload).select('id').single();
  if (error) { console.error('Insert expense error:', error); return { error: error.message }; }
  console.log('✅ Expense saved:', data?.id);
  return { error: null, uuid: data?.id };
};

export const dbLoadExpenses = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('expenses').select('*')
    .eq('shop_id', shopId)
    .order('date', { ascending: false });
  if (error) { console.error('Load expenses error:', error); return null; }
  return data.map(r => ({
    id:     r.id,
    uuid:   r.id,
    date:   r.date || '',
    cat:    r.cat || '',
    desc:   r.desc || '',
    amount: Number(r.amount) || 0,
    method: r.method || '',
    notes:  r.notes || '',
    payTo:      r.pay_to || '',
    invoiceNo:   r.invoice_no || '',
    invoiceDate: r.invoice_date || '',
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
    id:           r.shipment_ref || (r.id ? r.id.slice(0,8).toUpperCase() : ''),
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
    documents:    Array.isArray(r.documents) ? r.documents : [],
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
  if (!sb) return false;
  const payload = {
    id:                     ret.id,
    shop_id:                ret.shopId,
    sale_id:                ret.saleId,
    customer:               ret.customer || '',
    phone:                  ret.phone || '',
    reason:                 ret.reason || '',
    resolution:             ret.resolution || 'refund',
    status:                 ret.status || 'RETURN_APPROVED',
    return_deadline:        ret.returnDeadline || ret.receivedDate || new Date().toISOString().slice(0,10),
    tracking_no:            ret.trackingNo || '',
    courier:                ret.courier || '',
    proof_url:              ret.proofUrl || '',
    received_date:          ret.receivedDate || null,
    instructions_sent_at:   ret.instructionsSentAt || null,
    reminder_sent_at:      ret.reminderSentAt || null,
    refund_date:            ret.refundDate || null,
    exchange_date:          ret.exchangeDate || null,
    staff_notes:            ret.staffNotes || '',
    return_address_version: ret.returnAddressVersion || 'v1',
    expired_at:             ret.expiredAt || null,
    item:                   ret.item || '',
    refund_amount:          Number(ret.refundAmount) || 0,
    refund_method:          ret.refundMethod || '',
    refund_to_name:         ret.refundToName || '',
    stock_status:           ret.stockStatus || 'in_office',
  };
  const { data: existing } = await sb.from('returns').select('id').eq('id', ret.id).maybeSingle();
  const { error } = existing
    ? await sb.from('returns').update(payload).eq('id', ret.id)
    : await sb.from('returns').insert(payload);
  if (error) { console.error('Save return error:', error); return false; }
  console.log('✅ Return saved:', ret.id);
  return true;
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
    instructionsSentAt:   r.instructions_sent_at || '',
    reminderSentAt:       r.reminder_sent_at || '',
    refundDate:           r.refund_date || '',
    exchangeDate:         r.exchange_date || '',
    staffNotes:           r.staff_notes || '',
    returnAddressVersion: r.return_address_version || 'v1',
    expiredAt:            r.expired_at || '',
    item:                 r.item || '',
    refundAmount:         Number(r.refund_amount) || 0,
    refundMethod:         r.refund_method || '',
    refundToName:         r.refund_to_name || '',
    stockStatus:          r.stock_status || 'in_office',
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

/* ═══════════════════════════════════════════════════════════
   DOCUMENT UPLOADS  (purchases + logistics)
   ═══════════════════════════════════════════════════════════ */

export const dbUploadDoc = async (bucket, recordUuid, file) => {
  if (!sb) return { error: 'No client' };
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${recordUuid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return { error: error.message }; }
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { error: null, url: data.publicUrl, name: file.name, path };
};

export const dbDeleteDoc = async (bucket, path) => {
  if (!sb) return;
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) console.error('Delete doc error:', error);
};

export const dbSavePurchaseDocs = async (uuid, docs) => {
  if (!sb) return;
  const { error } = await sb.from('purchases').update({ documents: docs }).eq('id', uuid);
  if (error) console.error('Save purchase docs error:', error);
};

export const dbSaveLogisticDocs = async (uuid, docs) => {
  if (!sb) return;
  const { error } = await sb.from('logistics').update({ documents: docs }).eq('id', uuid);
  if (error) console.error('Save logistic docs error:', error);
};

/* ═══════════════════════════════════════════════════════════
   AGENTS
   ═══════════════════════════════════════════════════════════ */
export const dbSaveAgent = async (shopId, a) => {
  if (!sb) return { error: 'No client' };
  const payload = {
    shop_id:  shopId,
    name:     a.name || '',
    type:     a.type || 'Courier',
    contact:  a.contact || '',
    phone:    a.phone || '',
    email:    a.email || '',
    website:  a.website || '',
    place:    a.place || '',
    remarks:  a.remarks || '',
  };
  if (a.id) {
    const { data: ex } = await sb.from('agents').select('id').eq('id', a.id).maybeSingle();
    if (ex) {
      const { error } = await sb.from('agents').update(payload).eq('id', a.id);
      if (error) { console.error('Update agent error:', error); return { error: error.message }; }
      return { error: null };
    }
  }
  const { data, error } = await sb.from('agents').insert(payload).select('id').single();
  if (error) { console.error('Insert agent error:', error); return { error: error.message }; }
  return { error: null, id: data?.id };
};

export const dbLoadAgents = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('agents').select('*').eq('shop_id', shopId).order('name');
  if (error) { console.error('Load agents error:', error); return []; }
  return (data || []).map(r => ({
    id:      r.id,
    name:    r.name || '',
    type:    r.type || 'Courier',
    contact: r.contact || '',
    phone:   r.phone || '',
    email:   r.email || '',
    website: r.website || '',
    place:   r.place || '',
    remarks: r.remarks || '',
  }));
};

export const dbDeleteAgent = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('agents').delete().eq('id', id);
  if (error) console.error('Delete agent error:', error);
};

/* ═══════════════════════════════════════════════════════════
   EXPENSE CATEGORIES
   ═══════════════════════════════════════════════════════════ */
export const dbLoadExpenseCategories = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('expense_categories').select('*')
    .eq('shop_id', shopId).order('name');
  if (error) { console.error('Load expense categories error:', error); return []; }
  return (data || []).map(r => r.name);
};

export const dbSaveExpenseCategory = async (shopId, name) => {
  if (!sb) return { error: 'No client' };
  // Check if already exists
  const { data: existing } = await sb.from('expense_categories').select('id')
    .eq('shop_id', shopId).eq('name', name).maybeSingle();
  if (existing) return { error: null }; // already exists
  const { error } = await sb.from('expense_categories').insert({ shop_id: shopId, name });
  if (error) { console.error('Save expense category error:', error); return { error: error.message }; }
  return { error: null };
};

export const dbDeleteExpenseCategory = async (shopId, name) => {
  if (!sb) return;
  await sb.from('expense_categories').delete().eq('shop_id', shopId).eq('name', name);
};

/* ═══════════════════════════════════════════════════════════
   HISTORICAL DATA
   ═══════════════════════════════════════════════════════════ */
export const dbLoadHistoricalData = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('historical_data').select('*')
    .eq('shop_id', shopId).order('year').order('month');
  if (error) { console.error('Load historical data error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id, shopId: r.shop_id, month: r.month, year: r.year,
    orders: Number(r.orders)||0, grossSales: Number(r.gross_sales)||0,
    refunds: Number(r.refunds)||0, netSales: Number(r.net_sales)||0,
    shopifySales: Number(r.shopify_sales)||0, whatsappSales: Number(r.whatsapp_sales)||0,
    purchases: Number(r.purchases)||0, expenses: Number(r.expenses)||0, notes: r.notes||'',
  }));
};

export const dbSaveHistoricalRecord = async (shopId, rec) => {
  if (!sb) return { error: 'No client' };
  const payload = {
    shop_id: shopId, month: rec.month, year: rec.year,
    orders: Number(rec.orders)||0,
    gross_sales: Number(rec.grossSales)||0,
    refunds: Number(rec.refunds)||0,
    net_sales: Number(rec.netSales)||0,
    shopify_sales: Number(rec.shopifySales)||0,
    whatsapp_sales: Number(rec.whatsappSales)||0,
    purchases: Number(rec.purchases)||0,
    expenses: Number(rec.expenses)||0,
    notes: rec.notes||'',
  };
  const { error } = await sb.from('historical_data')
    .upsert(payload, { onConflict: 'shop_id,month,year' });
  if (error) { console.error('Save historical error:', error); return { error: error.message }; }
  return { error: null };
};

export const dbDeleteHistoricalRecord = async (id) => {
  if (!sb) return;
  await sb.from('historical_data').delete().eq('id', id);
};

export const dbImportHistoricalCSV = async (rows) => {
  if (!sb) return { error: 'No client' };
  const payloads = rows.map(r => ({
    shop_id: r.shop_id, month: Number(r.month), year: Number(r.year),
    orders: Number(r.orders)||0, gross_sales: Number(r.gross_sales)||0,
    refunds: Number(r.refunds)||0, net_sales: Number(r.net_sales)||0,
    shopify_sales: Number(r.shopify_sales)||0, whatsapp_sales: Number(r.whatsapp_sales)||0,
    purchases: Number(r.purchases)||0, expenses: Number(r.expenses)||0, notes: r.notes||'',
  }));
  const { error } = await sb.from('historical_data')
    .upsert(payloads, { onConflict: 'shop_id,month,year' });
  if (error) { console.error('Import historical error:', error); return { error: error.message }; }
  return { error: null };
};

/* ── Rosie Tasks: admin-set reminders assigned to a specific staff member,
   one-off or recurring (daily/weekly/monthly) ─────────────────────────── */
export const dbLoadRosieTasks = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('rosie_tasks').select('*')
    .eq('shop_id', shopId).order('created_at', { ascending: false });
  if (error) { console.error('Load Rosie tasks error:', error); return []; }
  return (data||[]).map(r => ({
    id: r.id, shopId: r.shop_id, assignedTo: r.assigned_to, message: r.message||'',
    recurrence: r.recurrence||'once', dueDate: r.due_date||'',
    lastDoneAt: r.last_done_at||null, doneAt: r.done_at||null,
    createdBy: r.created_by||'', createdAt: r.created_at,
  }));
};

export const dbSaveRosieTask = async (task) => {
  if (!sb) return null;
  const payload = {
    shop_id: task.shopId, assigned_to: task.assignedTo, message: task.message||'',
    recurrence: task.recurrence||'once', due_date: task.dueDate||null,
    last_done_at: task.lastDoneAt||null, done_at: task.doneAt||null,
    created_by: task.createdBy||'',
  };
  if (task.id) {
    const { error } = await sb.from('rosie_tasks').update(payload).eq('id', task.id);
    if (error) { console.error('Save Rosie task error:', error); throw error; }
    return task.id;
  }
  const { data, error } = await sb.from('rosie_tasks').insert(payload).select().single();
  if (error) { console.error('Save Rosie task error:', error); throw error; }
  return data.id;
};

export const dbDeleteRosieTask = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('rosie_tasks').delete().eq('id', id);
  if (error) console.error('Delete Rosie task error:', error);
};

export const dbMarkRosieTaskDone = async (task) => {
  if (!sb) return;
  const payload = task.recurrence === 'once'
    ? { done_at: new Date().toISOString() }
    : { last_done_at: new Date().toISOString() };
  const { error } = await sb.from('rosie_tasks').update(payload).eq('id', task.id);
  if (error) console.error('Mark Rosie task done error:', error);
};

/* ── Rosie Settings: per-shop config for her dispatch-tracking nag
   (cutoff date to ignore old sales, how many days before she flags one) ── */
export const dbLoadRosieSettings = async (shopId) => {
  if (!sb) return { cutoffDate: '', nagDays: 14 };
  const { data, error } = await sb.from('rosie_settings').select('*').eq('shop_id', shopId).maybeSingle();
  if (error) { console.error('Load Rosie settings error:', error); return { cutoffDate: '', nagDays: 14 }; }
  if (!data) return { cutoffDate: '', nagDays: 14 };
  return { cutoffDate: data.cutoff_date || '', nagDays: data.nag_days ?? 14 };
};

export const dbSaveRosieSettings = async (shopId, settings) => {
  if (!sb) return;
  const payload = {
    shop_id: shopId,
    cutoff_date: settings.cutoffDate || null,
    nag_days: settings.nagDays ?? 14,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from('rosie_settings').upsert(payload, { onConflict: 'shop_id' });
  if (error) console.error('Save Rosie settings error:', error);
};

/* ── Dismissed Shopify orders: permanently hides an order from the
   "Import from Shopify" list, for cases already handled outside the
   automatic duplicate-matching (e.g. entered manually beforehand). ──── */
export const dbLoadDismissedShopifyOrders = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('dismissed_shopify_orders').select('shopify_order_id').eq('shop_id', shopId);
  if (error) { console.error('Load dismissed Shopify orders error:', error); return []; }
  return (data || []).map(r => r.shopify_order_id);
};

export const dbDismissShopifyOrders = async (shopId, shopifyOrderIds) => {
  if (!sb || !shopifyOrderIds.length) return;
  const payload = shopifyOrderIds.map(id => ({ shop_id: shopId, shopify_order_id: id }));
  const { error } = await sb.from('dismissed_shopify_orders').upsert(payload, { onConflict: 'shop_id,shopify_order_id' });
  if (error) console.error('Dismiss Shopify orders error:', error);
};

/* ── Audit finding dismissals: lets Suresh mark a specific audit finding
   as "checked, not an issue" so it stops reappearing on future runs. ── */
export const dbLoadAuditDismissals = async () => {
  if (!sb) return [];
  const { data, error } = await sb.from('audit_dismissals').select('finding_key');
  if (error) { console.error('Load audit dismissals error:', error); return []; }
  return (data || []).map(r => r.finding_key);
};

export const dbDismissAuditFinding = async (findingKey) => {
  if (!sb) return;
  const { error } = await sb.from('audit_dismissals').upsert({ finding_key: findingKey }, { onConflict: 'finding_key' });
  if (error) console.error('Dismiss audit finding error:', error);
};

/* ── Attendance system (ROS India). Two staff share one login, split by
   a lightweight per-person PIN — this is a convenience gate, not real
   authentication, matching the low-stakes nature of "who's clocking in". */
export const dbLoadAttendanceStaff = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('attendance_staff').select('*').eq('shop_id', shopId);
  if (error) { console.error('Load attendance staff error:', error); return []; }
  return (data || []).map(r => ({ staffName: r.staff_name, pin: r.pin }));
};

export const dbSaveAttendanceStaffPin = async (staffName, shopId, pin) => {
  if (!sb) return false;
  const { error } = await sb.from('attendance_staff').upsert({ staff_name: staffName, shop_id: shopId, pin }, { onConflict: 'staff_name' });
  if (error) { console.error('Save attendance PIN error:', error); return false; }
  return true;
};

export const dbLoadAttendanceRecords = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('attendance_records').select('*').eq('shop_id', shopId).order('date', { ascending: false });
  if (error) { console.error('Load attendance records error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id, shopId: r.shop_id, staffName: r.staff_name, date: r.date,
    clockIn: r.clock_in, clockOut: r.clock_out,
  }));
};

export const dbClockIn = async (shopId, staffName) => {
  if (!sb) return null;
  const today = new Date().toISOString().slice(0,10);
  const id = `ATT-${staffName}-${today}`;
  const nowIso = new Date().toISOString();
  const { error } = await sb.from('attendance_records').upsert(
    { id, shop_id: shopId, staff_name: staffName, date: today, clock_in: nowIso },
    { onConflict: 'id' }
  );
  if (error) { console.error('Clock in error:', error); return null; }
  return { id, shopId, staffName, date: today, clockIn: nowIso, clockOut: null };
};

export const dbClockOut = async (shopId, staffName, recordId) => {
  if (!sb) return false;
  const nowIso = new Date().toISOString();
  const { error } = await sb.from('attendance_records').update({ clock_out: nowIso }).eq('id', recordId);
  if (error) { console.error('Clock out error:', error); return false; }
  return true;
};

// Admin manual correction — sets/overwrites clock-in and clock-out for a
// specific date, creating the record if none exists yet (e.g. staff
// forgot to clock in at all that day). Times are local "HH:MM" strings.
export const dbSetAttendanceRecord = async (shopId, staffName, date, clockInTime, clockOutTime) => {
  if (!sb) return false;
  const id = `ATT-${staffName}-${date}`;
  const toIso = (time) => time ? new Date(`${date}T${time}:00+05:30`).toISOString() : null;
  const { error } = await sb.from('attendance_records').upsert(
    { id, shop_id: shopId, staff_name: staffName, date, clock_in: toIso(clockInTime), clock_out: toIso(clockOutTime) },
    { onConflict: 'id' }
  );
  if (error) { console.error('Set attendance record error:', error); return false; }
  return true;
};

// Admin-set holidays (beyond the standing Sunday holiday) — festivals,
// granted leave, etc., set in advance.
export const dbLoadAttendanceHolidays = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('attendance_holidays').select('*').eq('shop_id', shopId);
  if (error) { console.error('Load attendance holidays error:', error); return []; }
  return (data || []).map(r => ({ date: r.date, label: r.label || '' }));
};

export const dbAddAttendanceHoliday = async (shopId, date, label) => {
  if (!sb) return false;
  const { error } = await sb.from('attendance_holidays').upsert({ shop_id: shopId, date, label: label || '' }, { onConflict: 'shop_id,date' });
  if (error) { console.error('Add attendance holiday error:', error); return false; }
  return true;
};

export const dbRemoveAttendanceHoliday = async (shopId, date) => {
  if (!sb) return false;
  const { error } = await sb.from('attendance_holidays').delete().eq('shop_id', shopId).eq('date', date);
  if (error) { console.error('Remove attendance holiday error:', error); return false; }
  return true;
};

/* ── Inventory management (ROS India stocked items only). Every stock
   change — sale-out or restock-in — is logged as its own movement, so
   an item's history is a real ledger, not just a running number. ────── */
export const dbLoadInventoryItems = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('inventory_items').select('*').eq('shop_id', shopId).order('name');
  if (error) { console.error('Load inventory items error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id, name: r.name, currentStock: Number(r.current_stock) || 0,
    totalStocked: Number(r.total_stocked) || 0, createdAt: r.created_at,
  }));
};

export const dbAddInventoryItem = async (shopId, name, initialStock) => {
  if (!sb) return null;
  const id = `INV-${Date.now().toString().slice(-8)}`;
  const stock = Number(initialStock) || 0;
  const { error } = await sb.from('inventory_items').insert({
    id, shop_id: shopId, name, current_stock: 0, total_stocked: 0,
  });
  if (error) { console.error('Add inventory item error:', error); return null; }
  if (stock > 0) {
    // dbAddInventoryMovement is the single source of truth for stock
    // changes — inserting the item at 0 first and letting this call set
    // the real starting stock avoids double-counting it.
    await dbAddInventoryMovement(shopId, id, 'restock', stock, new Date().toISOString().slice(0,10), null, null, 'Initial stock');
  }
  return id;
};

export const dbDeleteInventoryItem = async (shopId, itemId) => {
  if (!sb) return false;
  const { error } = await sb.from('inventory_items').delete().eq('id', itemId).eq('shop_id', shopId);
  if (error) { console.error('Delete inventory item error:', error); return false; }
  await sb.from('inventory_movements').delete().eq('item_id', itemId);
  return true;
};

export const dbLoadInventoryMovements = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('inventory_movements').select('*').eq('shop_id', shopId).order('date', { ascending: false });
  if (error) { console.error('Load inventory movements error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id, itemId: r.item_id, type: r.type, qty: Number(r.qty) || 0,
    date: r.date, saleId: r.sale_id, customer: r.customer, note: r.note || '',
  }));
};

export const dbAddInventoryMovement = async (shopId, itemId, type, qty, date, saleId, customer, note) => {
  if (!sb) return false;
  const id = `MOV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
  const { error: moveErr } = await sb.from('inventory_movements').insert({
    id, item_id: itemId, shop_id: shopId, type, qty, date, sale_id: saleId, customer, note: note || '',
  });
  if (moveErr) { console.error('Add inventory movement error:', moveErr); return false; }

  const { data: item, error: fetchErr } = await sb.from('inventory_items').select('current_stock,total_stocked').eq('id', itemId).maybeSingle();
  if (fetchErr || !item) { console.error('Fetch inventory item for stock update error:', fetchErr); return false; }

  const delta = type === 'restock' ? qty : -qty;
  const newStock = Number(item.current_stock || 0) + delta;
  const newTotal = type === 'restock' ? Number(item.total_stocked || 0) + qty : Number(item.total_stocked || 0);
  const { error: updateErr } = await sb.from('inventory_items').update({ current_stock: newStock, total_stocked: newTotal }).eq('id', itemId);
  if (updateErr) { console.error('Update inventory stock error:', updateErr); return false; }
  return true;
};

/* ── Upfront refunds: money returned before dispatch (cancellation,
   stock issue, payment problem) — no item ever comes back. ─────────── */
export const dbLoadUpfrontRefunds = async (shopId) => {
  if (!sb) return [];
  const { data, error } = await sb.from('upfront_refunds').select('*').eq('shop_id', shopId).order('date', { ascending: false });
  if (error) { console.error('Load upfront refunds error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id, saleId: r.sale_id, customer: r.customer, phone: r.phone || '',
    amount: Number(r.amount) || 0, isFull: r.is_full !== false,
    reason: r.reason || 'Other', reasonNote: r.reason_note || '',
    refundMethod: r.refund_method || '', refundToName: r.refund_to_name || '',
    date: r.date, staffNotes: r.staff_notes || '',
  }));
};

export const dbAddUpfrontRefund = async (shopId, refund) => {
  if (!sb) return null;
  const id = `UFR-${Date.now().toString().slice(-8)}`;
  const { error } = await sb.from('upfront_refunds').insert({
    id, shop_id: shopId,
    sale_id: refund.saleId || null,
    customer: refund.customer || '',
    phone: refund.phone || '',
    amount: Number(refund.amount) || 0,
    is_full: !!refund.isFull,
    reason: refund.reason || 'Other',
    reason_note: refund.reasonNote || '',
    refund_method: refund.refundMethod || '',
    refund_to_name: refund.refundToName || '',
    date: refund.date || new Date().toISOString().slice(0,10),
    staff_notes: refund.staffNotes || '',
  });
  if (error) { console.error('Add upfront refund error:', error); return null; }
  return id;
};

export const dbDeleteUpfrontRefund = async (shopId, id) => {
  if (!sb) return false;
  const { error } = await sb.from('upfront_refunds').delete().eq('id', id).eq('shop_id', shopId);
  if (error) { console.error('Delete upfront refund error:', error); return false; }
  return true;
};

/* ═══════════════════════════════════════════════════════════
   DISPATCH LOG  (ROS India — daily despatch sheet)
   Independent of `sales`: one row per parcel, soft-linked back to the
   sale via sale_id so the same order can appear more than once if it
   ships in multiple parcels.
   ═══════════════════════════════════════════════════════════ */
export const dbSaveDispatchEntry = async (shopId, e) => {
  if (!sb) return { error: 'No Supabase client' };

  const payload = {
    shop_id:       shopId,
    sale_id:       e.saleId || '',
    dispatch_date: e.dispatchDate || today(),
    customer:      e.customer || '',
    phone:         e.phone || '',
    address:       e.address || '',
    tracking_no:   e.trackingNo || '',
    shipper:       e.shipper || '',
    notified:      !!e.notified,
    remarks:       e.remarks || '',
  };

  if (e._uuid) {
    const { error } = await sb.from('dispatch_log').update(payload).eq('id', e._uuid).eq('shop_id', shopId);
    if (error) { console.error('❌ Update dispatch entry error:', error); return { error: error.message }; }
    return { error: null, uuid: e._uuid };
  }

  const { data, error } = await sb.from('dispatch_log').insert(payload).select('id').single();
  if (error) { console.error('❌ Insert dispatch entry error:', error); return { error: error.message }; }
  console.log('✅ Dispatch entry saved, uuid:', data?.id);
  return { error: null, uuid: data?.id };
};

export const dbLoadDispatchLog = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb.from('dispatch_log').select('*')
    .eq('shop_id', shopId)
    .order('dispatch_date', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) { console.error('Load dispatch log error:', error); return null; }
  return data.map(r => ({
    uuid:         r.id,
    saleId:       r.sale_id || '',
    dispatchDate: r.dispatch_date || '',
    customer:     r.customer || '',
    phone:        r.phone || '',
    address:      r.address || '',
    trackingNo:   r.tracking_no || '',
    shipper:      r.shipper || '',
    notified:     !!r.notified,
    remarks:      r.remarks || '',
    createdAt:    r.created_at || '',
  }));
};

export const dbDeleteDispatchEntry = async (id, shopId) => {
  if (!sb) return;
  const { error } = await sb.from('dispatch_log').delete()
    .eq('id', id).eq('shop_id', shopId);
  if (error) console.error('Delete dispatch entry error:', error);
  else console.log('✅ Dispatch entry deleted:', id);
};
