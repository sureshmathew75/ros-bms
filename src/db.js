import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

const sb = (url && key) ? createClient(url, key) : null;

export const dbSaveSale = async (shopId, sale) => {
  if (!sb) return;

  // Step 1: Check if this ID already exists (edit vs new)
  const { data: existing } = await sb
    .from('sales')
    .select('id')
    .eq('id', sale.id)
    .maybeSingle();

  const payload = {
    id:            sale.id,
    shop_id:       shopId,
    customer:      sale.customer || '',
    amount:        Number(sale.amount) || 0,
    status:        sale.status || '',
    pay:           sale.pay || '',
    ful:           sale.ful || '',
    date:          sale.date || new Date().toISOString().split('T')[0],
    item:          sale.item || '',
    qty:           sale.qty || '1',
    contact:       sale.contact || '',
    phone:         sale.phone || '',
    address:       sale.address || '',
    rem:           sale.rem || '',
    tax_rate:      sale.taxRate || 20,
    tax_inclusive: sale.taxInclusive !== false,
    invoice_no:    sale.invoiceNo || sale.id,
  };

  let error;

  if (existing) {
    // Row exists → UPDATE it
    console.log('🔄 Updating existing sale:', sale.id);
    ({ error } = await sb.from('sales').update(payload).eq('id', sale.id));
  } else {
    // New row → INSERT it (never overwrites anything)
    console.log('➕ Inserting new sale:', sale.id, 'amount:', sale.amount);
    ({ error } = await sb.from('sales').insert(payload));
  }

  if (error) console.error('❌ Save sale error:', error);
  else console.log('✅ Sale saved successfully, id:', sale.id, 'amount:', sale.amount);
};

export const dbLoadSales = async (shopId) => {
  if (!sb) return null;
  const { data, error } = await sb
    .from('sales')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Load sales error:', error); return null; }
  console.log(`📦 Loaded ${data.length} sales for ${shopId}`);
  return data.map(r => ({
    id:           r.id,
    customer:     r.customer || '',
    amount:       Number(r.amount) || 0,
    status:       r.status || '',
    pay:          r.pay || '',
    ful:          r.ful || '',
    date:         r.date || r.created_at?.split('T')[0] || '',
    item:         r.item || '',
    qty:          r.qty || '1',
    contact:      r.contact || '',
    phone:        r.phone || '',
    address:      r.address || '',
    rem:          r.rem || '',
    taxRate:      r.tax_rate || 20,
    taxInclusive: r.tax_inclusive !== false,
    invoiceNo:    r.invoice_no || r.id,
  }));
};

export const dbDeleteSale = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('sales').delete().eq('id', id);
  if (error) console.error('Delete sale error:', error);
  else console.log('Sale deleted ✅');
};

export const dbSaveCustomer = async (customer) => {
  if (!sb) return;

  const { data: existing } = await sb
    .from('customers')
    .select('id')
    .eq('id', customer.id)
    .maybeSingle();

  const payload = {
    id:        customer.id,
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

  let error;
  if (existing) {
    ({ error } = await sb.from('customers').update(payload).eq('id', customer.id));
  } else {
    ({ error } = await sb.from('customers').insert(payload));
  }

  if (error) console.error('Save customer error:', error);
  else console.log('Customer saved ✅');
};

export const dbLoadCustomers = async () => {
  if (!sb) return null;
  const { data, error } = await sb
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
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

export const dbDeleteCustomer = async (id) => {
  if (!sb) return;
  const { error } = await sb.from('customers').delete().eq('id', id);
  if (error) console.error('Delete customer error:', error);
  else console.log('Customer deleted ✅');
};