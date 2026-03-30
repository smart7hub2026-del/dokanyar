import type { Invoice, InvoiceItem, Product } from '../data/mockData';

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeAttr(s: string) {
  return s.replace(/"/g, '&quot;').replace(/</g, '');
}

export function resolveInvoiceItemImage(item: InvoiceItem, products: Product[]): string | undefined {
  if (item.image_url) return item.image_url;
  return products.find((p) => p.id === item.product_id)?.image_url;
}

/** بخش HTML «عکس کالاها» برای انتهای فاکتور (A4/A5/Letter) */
export function buildProductImagesPrintSection(
  inv: Invoice,
  products: Product[],
  titleFontSize: string
): string {
  const rows = inv.items
    .map((item) => {
      const src = resolveInvoiceItemImage(item, products);
      if (!src) return null;
      return { name: item.product_name, qty: item.quantity, src };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (rows.length === 0) return '';
  return `
<hr>
<div class="product-photos" style="margin-top:10px;page-break-inside:avoid;">
  <div style="font-weight:700;font-size:${titleFontSize};margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:4px;">عکس کالاها</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;">
    ${rows
      .map(
        (x) => `<div style="width:115px;text-align:center;border:1px solid #ccc;padding:6px;border-radius:8px;break-inside:avoid;">
        <img src="${safeAttr(x.src)}" style="width:100px;height:100px;object-fit:contain;display:block;margin:0 auto 4px;" alt="">
        <div style="font-size:9px;line-height:1.25;">${escapeHtml(x.name)} × ${x.qty}</div>
      </div>`
      )
      .join('')}
  </div>
</div>`;
}
