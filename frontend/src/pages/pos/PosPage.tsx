import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { posService } from '../../services/pos.service';
import type { PosProduct, Sale } from '../../services/pos.service';
import { CheckoutModal } from './CheckoutModal';

const ISV_RATE = 0.15;

const formatLempiras = (n: number) =>
  `L. ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A line in the cart. We hold the whole product so we can show name/price
// and re-check stock without another lookup.
interface CartLine {
  product: PosProduct;
  quantity: number;
}

export const PosPage = () => {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    try {
      const data = await posService.getProducts();
      setProducts(data);
    } catch (err) {
      toast.error('Error al cargar los productos.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    };
    init();
  }, []);

  // Client-side filter. Empty search shows nothing (avoids dumping all
  // ~1,888 products); the cashier types or scans to find an item.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [search, products]);

  const addToCart = (product: PosProduct) => {
    const stock = Number(product.quantity);
    if (stock <= 0) {
      toast.error(`"${product.name}" no tiene existencias.`);
      return;
    }
    // Validate against current stock BEFORE updating state, so the toast
    // fires exactly once (state updaters can run twice under StrictMode,
    // so they must stay pure — no side effects like toasts inside them).
    const existing = cart.find(l => l.product.id === product.id);
    if (existing && existing.quantity + 1 > stock) {
      toast.error(`Solo hay ${stock} unidades de "${product.name}".`);
      return;
    }

    setCart(prev => {
      const found = prev.find(l => l.product.id === product.id);
      if (found) {
        return prev.map(l =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    // Reset search and refocus for the next scan/search.
    setSearch('');
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const line = cart.find(l => l.product.id === productId);
    if (!line) return;
    const stock = Number(line.product.quantity);

    // Clamp + toast happen here (pure side-effect zone), not in the updater.
    let nextQty = quantity;
    if (quantity > stock) {
      toast.error(`Solo hay ${stock} unidades de "${line.product.name}".`);
      nextQty = stock;
    }

    setCart(prev =>
      prev.map(l =>
        l.product.id === productId ? { ...l, quantity: nextQty } : l
      )
    );
  };

  const removeLine = (productId: string) => {
    setCart(prev => prev.filter(l => l.product.id !== productId));
  };

  // After a successful sale: keep the receipt, clear the cart, and refetch
  // products so stock reflects what we just sold (avoids stale-stock on the
  // next sale).
  const handleSaleSuccess = (sale: Sale) => {
    setLastSale(sale);
    setCart([]);
    setShowCheckout(false);
    fetchProducts();
    toast.success('Venta completada.');
  };

  // On Enter: if exactly one product matches, add it (the "scan" path).
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length === 1) {
      addToCart(filtered[0]);
    }
  };

  // --- Live totals (mirror the backend math so the display matches the sale) ---
  const totals = useMemo(() => {
    let subtotal = 0;
    let gravable = 0;
    let exento = 0;
    let isv = 0;
    for (const line of cart) {
      const price = Number(line.product.unit_price ?? 0);
      const lineTotal = +(price * line.quantity).toFixed(2);
      subtotal += lineTotal;
      if (line.product.is_exempt) {
        exento += lineTotal;
      } else {
        gravable += lineTotal;
        isv += +(lineTotal * ISV_RATE).toFixed(2);
      }
    }
    return {
      subtotal: +subtotal.toFixed(2),
      gravable: +gravable.toFixed(2),
      exento: +exento.toFixed(2),
      isv: +isv.toFixed(2),
      total: +(subtotal + isv).toFixed(2),
    };
  }, [cart]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Punto de Venta</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: search + results (2 cols) */}
        <div className="col-span-2">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar o escanear producto..."
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />

          {loading ? (
            <p className="text-slate-500 text-sm">Cargando productos...</p>
          ) : search.trim() === '' ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-slate-500 font-medium">Busque o escanee un producto</p>
              <p className="text-slate-400 text-sm mt-1">
                Escriba el nombre o escanee el código de barras
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500 font-medium">Sin resultados para "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => {
                const stock = Number(p.quantity);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 px-4 py-3 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatLempiras(Number(p.unit_price ?? 0))} / {p.unit}
                        {p.is_exempt && ' · Exento'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {stock} disp.
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: cart (1 col) */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-4 sticky top-6">
            <h2 className="text-base font-semibold text-slate-700 mb-3">
              Carrito ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">
                El carrito está vacío
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {cart.map(line => (
                  <div key={line.product.id} className="border-b border-slate-100 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 flex-1">
                        {line.product.name}
                      </p>
                      <button
                        onClick={() => removeLine(line.product.id)}
                        className="text-slate-400 hover:text-red-500 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => updateQuantity(line.product.id, Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm font-medium text-slate-700">
                        {formatLempiras(Number(line.product.unit_price ?? 0) * line.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-1 text-sm border-t border-slate-200 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatLempiras(totals.subtotal)}</span>
                </div>
                {totals.exento > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Exento</span>
                    <span>{formatLempiras(totals.exento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>ISV (15%)</span>
                  <span>{formatLempiras(totals.isv)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-800 pt-1">
                  <span>Total</span>
                  <span>{formatLempiras(totals.total)}</span>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mt-3"
                >
                  Cobrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          total={totals.total}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleSaleSuccess}
        />
      )}
    </div>
  );
};