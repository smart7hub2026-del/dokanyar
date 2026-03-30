import { describe, expect, it } from 'vitest';
import { useStore } from './useStore';

describe('useStore sales flow', () => {
  it('deducts stock when adding invoice', () => {
    const s = useStore.getState();
    const product = s.addProduct({
      product_code: 'T-VITEST',
      barcode: 'T-VITEST',
      name: 'Vitest product',
      category_id: 1,
      category_name: 'عمومی',
      purchase_price: 10,
      sale_price: 20,
      stock_shop: 10,
      stock_warehouse: 0,
      min_stock: 1,
      is_active: true,
      tenant_id: 1,
    });
    const customer = s.addCustomer({
      name: 'Vitest customer',
      phone: '0700000000',
      address: '',
      balance: 0,
      total_purchases: 0,
      status: 'active',
      reminder_enabled: false,
      reminder_days_before: 3,
      tenant_id: 1,
    });
    expect(product.stock_shop).toBe(10);
    expect(customer).toBeTruthy();

    const beforeStock = useStore.getState().products.find((p) => p.id === product.id)?.stock_shop ?? 0;
    const beforeInvoices = useStore.getState().invoices.length;

    useStore.getState().addInvoice({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      tenant_id: customer.tenant_id || 1,
      items: [
        {
          id: 1,
          product_id: product.id,
          product_name: product.name,
          quantity: 2,
          unit_price: product.sale_price,
          total_price: product.sale_price * 2,
        },
      ],
      seller_id: 1,
      seller_name: 'vitest',
      subtotal: product.sale_price * 2,
      discount: 0,
      total: product.sale_price * 2,
      paid_amount: product.sale_price * 2,
      due_amount: 0,
      payment_method: 'cash',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      notes: '',
      status: 'completed',
      approval_status: 'approved',
    });

    const afterStock = useStore.getState().products.find((p) => p.id === product.id)?.stock_shop ?? 0;
    const afterInvoices = useStore.getState().invoices.length;

    expect(afterInvoices).toBe(beforeInvoices + 1);
    expect(afterStock).toBe(beforeStock - 2);
  });
});
