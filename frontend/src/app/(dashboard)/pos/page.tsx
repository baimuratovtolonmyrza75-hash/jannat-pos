'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Product, CartItem, PaymentMethod, Customer } from '@/lib/types';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import {
  Scan,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  CheckCircle2,
  Loader2,
  X,
  ShoppingCart,
  Camera,
  ClipboardSignature,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'CASH', label: 'Наличные', icon: Banknote },
  { value: 'CARD', label: 'Карта', icon: CreditCard },
  { value: 'QR', label: 'QR', icon: QrCode },
  { value: 'DEBT', label: 'В долг', icon: ClipboardSignature },
];

interface CompletedSale {
  id: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: CartItem[];
}

function ReceiptView({ sale, cashierEmail }: { sale: CompletedSale; cashierEmail: string }) {
  return (
    <div className="receipt p-4 font-mono text-black bg-white">
      <div className="text-center mb-4">
        <p className="text-lg font-bold">JANNAT</p>
        <p className="text-xs">Детская одежда</p>
        <p className="text-xs mt-1">{new Date(sale.createdAt).toLocaleString('ru-KG')}</p>
        <p className="text-xs">Чек #{sale.id}</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      {sale.items.map((item, i) => (
        <div key={i} className="flex justify-between text-xs my-1">
          <span className="flex-1 truncate">{item.product.name}</span>
          <span className="ml-2 whitespace-nowrap">
            {item.quantity} × {item.product.sellingPrice} = {item.quantity * item.product.sellingPrice}
          </span>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between font-bold">
        <span>ИТОГО:</span>
        <span>{sale.totalAmount.toLocaleString('ru-KG')} сом</span>
      </div>
      <p className="text-xs mt-1">
        Оплата:{' '}
        {sale.paymentMethod === 'CASH' ? 'Наличные' : sale.paymentMethod === 'CARD' ? 'Карта' : 'QR'}
      </p>
      <p className="text-xs">Кассир: {cashierEmail}</p>
      <div className="text-center text-xs mt-4">
        <p>Спасибо за покупку! 🌸</p>
        <p>Приходите к нам снова</p>
      </div>
    </div>
  );
}

export default function PosPage() {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanFlash, setScanFlash] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: customersData, mutate: mutateCustomers } = useSWR<Customer[]>('/customers', fetcher);
  const customers = customersData || [];
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (barcode.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get<Product[]>(`/products?search=${barcode.trim()}`);
        setSearchResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [barcode]);

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  const focusScanner = () => inputRef.current?.focus();

  const flashScan = () => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 500);
  };

  const addToCart = useCallback(async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;
    setScanError('');

    try {
      const { data: product } = await api.get<Product>(`/products/barcode/${barcodeValue.trim()}`);

      if (product.stock === 0) {
        setScanError(`"${product.name}" — нет в наличии`);
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          if (existing.quantity >= product.stock) {
            setScanError(`"${product.name}" — максимум ${product.stock} шт.`);
            return prev;
          }
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [...prev, { product, quantity: 1 }];
      });

      flashScan();
    } catch {
      setScanError(`Товар "${barcodeValue}" не найден`);
    }
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode) {
      // If there is exactly one search result and they hit Enter, we can just select it.
      // Or they typed an exact barcode/SKU.
      addToCart(barcode);
      setBarcode('');
      setSearchResults([]);
    }
  };

  const handleProductSelect = (product: Product) => {
    setScanError('');
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setScanError(`"${product.name}" — максимум ${product.stock} шт.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setBarcode('');
    setSearchResults([]);
    flashScan();
    focusScanner();
  };

  // Camera scan handler — adds product to cart
  const { ScannerModal, openScanner } = useCameraScanner({
    onScan: ({ text }) => addToCart(text),
    title: 'Сканировать товар для продажи',
    continuous: true,
    pauseAfterScan: 800,
  });

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity, 0,
  );
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    let customerId = selectedCustomerId;
    
    if (paymentMethod === 'DEBT') {
      if (!customerId && !newCustomerName.trim()) {
        setScanError('Выберите или создайте клиента для выдачи в долг');
        return;
      }
      
      if (!customerId && newCustomerName.trim()) {
        setIsProcessing(true);
        try {
          const res = await api.post<Customer>('/customers', {
            name: newCustomerName,
            phone: newCustomerPhone,
          });
          customerId = res.data.id;
          mutateCustomers();
        } catch {
          setScanError('Ошибка при создании клиента');
          setIsProcessing(false);
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      const { data: sale } = await api.post('/pos/sales', {
        paymentMethod,
        ...(customerId ? { customerId } : {}),
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });
      setCompletedSale({
        id: sale.id,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        items: cart,
      });
      setCart([]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setScanError(axiosErr.response?.data?.message || 'Ошибка при обработке продажи');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAfterSale = () => {
    setCompletedSale(null);
    setScanError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Success screen
  if (completedSale) {
    return (
      <div className="flex items-center justify-center min-h-screen animate-slide-in">
        <div className="card max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Продажа оформлена!</h2>
          <p className="text-3xl font-bold text-green-400 mb-1">
            {completedSale.totalAmount.toLocaleString('ru-KG')} сом
          </p>
          <p className="text-muted mb-6">Чек #{completedSale.id}</p>

          <div className="hidden">
            <div ref={receiptRef}>
              <ReceiptView sale={completedSale} cashierEmail={user?.email || ''} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => handlePrint()} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" />
              Печать чека
            </button>
            <button onClick={resetAfterSale} className="btn-primary flex-1">
              Новая продажа
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-80px)] xl:h-screen xl:overflow-hidden -m-4 xl:-m-8">
      {ScannerModal}

      {/* Left: Scanner + Products */}
      <div className="flex-1 flex flex-col p-4 xl:p-6 overflow-hidden" onClick={focusScanner}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 no-print">
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/30">
            <Scan className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Касса POS</h1>
            <p className="text-xs text-muted">Кассир: {user?.email}</p>
          </div>
          {/* Camera scan button */}
          <button
            onClick={(e) => { e.stopPropagation(); openScanner(); }}
            className="btn-secondary flex items-center gap-2"
            title="Использовать камеру"
          >
            <Camera className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline">Камера</span>
          </button>
        </div>

        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="mb-4 relative">
          <div className="relative">
            <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className={`pos-scanner-input pl-12 ${scanFlash ? 'animate-scan-flash' : ''}`}
              placeholder="Штрих-код, Артикул, Название..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && barcode.length > 1 && (
            <div className="absolute top-full mt-2 w-full bg-surface-2 border border-subtle rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProductSelect(p)}
                  className="w-full text-left px-4 py-3 hover:bg-accent/10 border-b border-subtle last:border-0 transition-colors flex justify-between items-center"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-text-primary truncate">{p.name}</div>
                    <div className="text-xs text-muted truncate">Арт: {p.SKU} • Штрих: {p.barcode} • Ост: {p.stock} шт</div>
                  </div>
                  <div className="font-bold text-accent whitespace-nowrap">{p.sellingPrice.toLocaleString('ru-KG')} с.</div>
                </button>
              ))}
            </div>
          )}

          {scanError && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 animate-slide-in">
              <X className="w-4 h-4 flex-shrink-0" />
              {scanError}
            </div>
          )}
        </form>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted py-8">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Корзина пуста</p>
              <p className="text-sm text-center">Отсканируйте штрих-код или нажмите «Камера»</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-2 rounded-xl p-3 border border-subtle hover:border-accent/20 transition-all animate-slide-in"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between sm:block">
                    <p className="font-medium text-text-primary text-sm truncate">{item.product.name}</p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    {item.product.SKU}
                    {item.product.size && ` • Р-р: ${item.product.size}`}
                    {item.product.color && ` • ${item.product.color}`}
                  </p>
                  <p className="text-sm font-semibold text-accent mt-0.5">
                    {item.product.sellingPrice.toLocaleString('ru-KG')} сом
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-subtle hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-text-primary">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, +1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-subtle hover:bg-green-500/20 hover:border-green-500/30 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-auto sm:w-24 text-right">
                    <p className="font-bold text-text-primary text-sm">
                      {(item.product.sellingPrice * item.quantity).toLocaleString('ru-KG')} с.
                    </p>
                    <p className="text-xs text-muted hidden sm:block">{item.quantity} шт.</p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="w-full xl:w-80 bg-surface border-t xl:border-t-0 xl:border-l border-subtle flex flex-col p-4 xl:p-6 shrink-0 z-10 sticky bottom-0">
        <h2 className="text-lg font-bold text-text-primary mb-2 xl:mb-4 hidden xl:block">Итог заказа</h2>

        <div className="flex-1 space-y-2 xl:space-y-3 hidden xl:block">
          <div className="flex justify-between text-sm text-muted">
            <span>Товаров:</span>
            <span>{totalItems} шт.</span>
          </div>
          <div className="flex justify-between text-sm text-muted">
            <span>Позиций:</span>
            <span>{cart.length}</span>
          </div>
        </div>

        <div className="border-t border-subtle pt-2 xl:pt-3 flex xl:block justify-between items-center mb-2 xl:mb-0">
          <div className="flex flex-col xl:flex-row justify-between text-lg xl:text-xl font-bold text-text-primary">
            <span className="text-sm xl:text-lg text-muted xl:text-text-primary">ИТОГО:</span>
            <span>{totalAmount.toLocaleString('ru-KG')} с.</span>
          </div>
        </div>

        <div className="pt-2">
          <div className="grid grid-cols-2 gap-1 xl:grid-cols-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all duration-150
                    ${paymentMethod === method.value
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface-2 border-subtle text-muted hover:border-accent/20 hover:text-text-primary'
                    }`}
                >
                  <Icon className="w-4 h-4 xl:w-5 xl:h-5" />
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        {paymentMethod === 'DEBT' && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 animate-slide-in">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <ClipboardSignature className="w-4 h-4 text-red-400" />
              Оформление в долг
            </h3>
            
            {!isCreatingCustomer ? (
              <div className="flex gap-2">
                <select 
                  className="input flex-1 text-sm py-1.5 h-auto min-h-0" 
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Выберите клиента...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
                <button onClick={() => setIsCreatingCustomer(true)} className="btn-secondary px-2" title="Новый клиент"><Plus className="w-4 h-4"/></button>
              </div>
            ) : (
              <div className="space-y-2">
                <input 
                  className="input text-sm py-1.5 h-auto min-h-0" 
                  placeholder="Имя клиента *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <input 
                  className="input text-sm py-1.5 h-auto min-h-0" 
                  placeholder="Телефон (необязательно)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => setIsCreatingCustomer(false)} className="text-xs text-muted hover:text-text-primary">Отмена</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex xl:flex-col gap-2 mt-3 xl:mt-4">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="btn-primary flex-1 h-12 xl:h-14 text-base xl:text-lg flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /></>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /><span className="hidden xl:inline">Принять оплату</span><span className="xl:hidden">Оплатить</span></>
            )}
          </button>

          <button
            onClick={() => { setCart([]); setScanError(''); focusScanner(); }}
            className="btn-secondary h-12 xl:h-auto px-4 text-sm"
            disabled={cart.length === 0}
          >
            <span className="hidden xl:inline">Очистить корзину</span>
            <Trash2 className="w-5 h-5 xl:hidden mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
