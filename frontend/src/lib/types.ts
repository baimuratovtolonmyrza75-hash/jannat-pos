export type Role = 'OWNER' | 'ADMIN' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'DEBT';
export type AuditStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  createdById: number;
  createdBy?: Pick<User, 'id' | 'email'>;
  createdAt: string;
}

export interface Debt {
  id: number;
  customerId: number;
  customer?: Customer;
  saleId?: number;
  sale?: Sale;
  totalAmount: number;
  paidAmount: number;
  isPaidOff: boolean;
  createdAt: string;
  updatedAt: string;
  payments?: DebtPayment[];
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  SKU: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  barcode: string;
  size?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: number;
  productId: number;
  product: Pick<Product, 'id' | 'name' | 'SKU'>;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  createdById: number;
  createdBy: Pick<User, 'id' | 'email' | 'role'>;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  product: Pick<Product, 'id' | 'name' | 'SKU' | 'barcode'>;
  quantity: number;
  priceAtSale: number;
  costPriceAtSale: number;
}

export interface Sale {
  id: number;
  cashierId: number;
  cashier: Pick<User, 'id' | 'email'>;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  totalProfit: number;
  createdAt: string;
  saleItems: SaleItem[];
}

export interface Audit {
  id: number;
  status: AuditStatus;
  createdById: number;
  createdBy: Pick<User, 'id' | 'email'>;
  createdAt: string;
  completedAt?: string;
  auditItems?: AuditItem[];
  _count?: { auditItems: number };
}

export interface AuditItem {
  id: number;
  auditId: number;
  productId: number;
  product: Pick<Product, 'id' | 'name' | 'SKU' | 'barcode'>;
  expectedQty: number;
  actualQty: number;
  difference: number;
}

export type ExpenseCategory = 'RENT' | 'SALARY' | 'LOGISTICS' | 'MARKETING' | 'UTILITIES' | 'TAXES' | 'OTHER';

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: ExpenseCategory;
  createdById: number;
  createdBy: Pick<User, 'id' | 'email'>;
  createdAt: string;
}

export type MovementType = 'RECEIVE' | 'SALE' | 'AUDIT_ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  referenceId?: number;
  createdById: number;
  createdBy: Pick<User, 'id' | 'email'>;
  createdAt: string;
}

export interface DashboardMetrics {
  period: { startDate?: string; endDate?: string };
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
  totalStockValue: number;
  topProducts: Array<{
    productId: number;
    product?: Pick<Product, 'id' | 'name' | 'SKU'>;
    _sum: { quantity: number | null; priceAtSale: number | null };
  }>;
  recentSales: Sale[];
}

// Cart item for POS
export interface CartItem {
  product: Product;
  quantity: number;
}
