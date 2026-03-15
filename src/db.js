let _sb = null;

const getSB = async () => {
  if (_sb) return _sb;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const { createClient } = await import('@supabase/supabase-js');
    _sb = createClient(url, key);
  } catch(e) {
    console.warn('Supabase not available:', e);
  }
  return _sb;
};

export const dbSaveSale = async (shopId, sale) => {
  const sb = await getSB();
  if (!sb) return;
  const { error } = await sb.from('sales').insert({
    id:            sale.id,
    shop_id:       shopId,
    customer:      sale.customer || '',
    amount:        sale.amount || 0,
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
    invoice_no:    sale.id,
  });
  if (error) console.error('Save sale error:', error);
  else console.log('Sale saved ✅');
};

export const dbLoadSales = async (shopId) => {
  const sb = await getSB();
  if (!sb) return null;
  const { data, error } = await sb
    .from('sales')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Load sales error:', error); return null; }
  return data.map(r => ({
    id:          r.id,
    customer:    r.customer || '',
    amount:      r.amount || 0,
    status:      r.status || '',
    pay:         r.pay || '',
    ful:         r.ful || '',
    date:        r.date || r.created_at?.split('T')[0] || '',
    item:        r.item || '',
    qty:         r.qty || '1',
    contact:     r.contact || '',
    phone:       r.phone || '',
    address:     r.address || '',
    rem:         r.rem || '',
    taxRate:     r.tax_rate || 20,
    taxInclusive:r.tax_inclusive !== false,
    invoiceNo:   r.invoice_no || r.id,
  }));
};