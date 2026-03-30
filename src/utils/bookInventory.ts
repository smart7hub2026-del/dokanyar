import type { Book, Product } from '../data/mockData';

export function isBookstoreBusiness(businessType?: string): boolean {
  return String(businessType || '').trim() === 'bookstore';
}

/** برای فروش/چاپ فاکتور — همان شکل Product با نام کالا = عنوان کتاب */
export function bookToProductForSale(b: Book): Product {
  return {
    id: b.id,
    product_code: b.sku,
    barcode: b.isbn,
    name: b.title,
    category_id: b.category_id,
    category_name: b.category_name,
    purchase_price: b.purchase_price,
    sale_price: b.sale_price,
    stock_shop: b.stock_shop,
    stock_warehouse: b.stock_warehouse,
    min_stock: b.min_stock,
    is_active: b.is_active,
    created_at: b.created_at,
    tenant_id: b.tenant_id,
    currency_code: b.currency_code,
    image_url: b.image_url,
  };
}
