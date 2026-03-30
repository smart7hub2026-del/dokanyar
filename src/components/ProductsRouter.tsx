import { useStore } from '../store/useStore';
import ProductsPage from './ProductsPage';
import BookstoreInventoryPage from './BookstoreInventoryPage';

export default function ProductsRouter() {
  const businessType = useStore((s) => s.shopSettings.business_type);
  if (businessType === 'bookstore') {
    return <BookstoreInventoryPage />;
  }
  return <ProductsPage />;
}
