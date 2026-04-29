"use client";
import { useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, MapPin, Phone, User, StickyNote } from "lucide-react";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import { formatCurrency, cn } from "@/lib/utils";
import { Spinner, Button, Input } from "@/components/ui";
import toast from "react-hot-toast";
import type { Product, OrderType, PaymentMethod } from "@/types";

interface LocalCartItem {
  product: Product;
  quantity: number;
  notes?: string;
  showNotes?: boolean;
}

const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: "local",    label: "No local",  icon: "🍽️" },
  { value: "retirada", label: "Retirada",  icon: "🏪" },
  { value: "delivery", label: "Delivery",  icon: "🛵" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "💵 Dinheiro" },
  { value: "pix",     label: "📱 Pix" },
  { value: "cartao",  label: "💳 Cartão" },
];

export default function AtendentePage() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("local");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [notes, setNotes] = useState("");

  const { data: categories } = useCategories();
  const { data: products, isLoading } = useProducts(selectedCategory);
  const createOrder = useCreateOrder();

  const allFiltered = products?.filter((p) =>
    p.is_available &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const regularProducts = allFiltered?.filter((p) => !p.name.toLowerCase().includes("taxa"));
  const feeProducts = products?.filter((p) => p.name.toLowerCase().includes("taxa")) || [];

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function updateItemNotes(productId: number, notes: string) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, notes } : i))
    );
  }

  function toggleItemNotes(productId: number) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, showNotes: !i.showNotes } : i))
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const total = cart.reduce((sum, i) => {
    const activePrice = i.product.is_promotional && i.product.promotional_price 
      ? Number(i.product.promotional_price) 
      : Number(i.product.price);
    return sum + activePrice * i.quantity;
  }, 0);

  async function handleSubmit() {
    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    if (orderType === "delivery" && !customerPhone.trim()) {
      toast.error("Informe o telefone para delivery");
      return;
    }
    if (orderType === "delivery" && !customerAddress.trim()) {
      toast.error("Informe o endereço para delivery");
      return;
    }

    try {
      await createOrder.mutateAsync({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          notes: i.notes?.trim() || undefined,
        })),
        customer_name: customerName.trim(),
        order_type: orderType,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        customer_phone: orderType === "delivery" ? customerPhone.trim() : undefined,
        customer_address: orderType === "delivery" ? customerAddress.trim() : undefined,
      });
      toast.success("Pedido criado com sucesso! 🎉");
      // Reset
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setNotes("");
      setOrderType("local");
      setPaymentMethod("dinheiro");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao criar pedido");
    }
  }

  return (
    <div className="flex h-screen">
      {/* ── Left: Product Grid ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0 space-y-4">
          <h1 className="font-display text-2xl text-surface-900">Novo Pedido</h1>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-surface-200 bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold font-body transition-all",
                !selectedCategory ? "bg-brand-500 text-white" : "bg-white border border-surface-200 text-surface-800 hover:border-brand-300"
              )}
            >
              Tudo
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold font-body transition-all",
                  selectedCategory === cat.id ? "bg-brand-500 text-white" : "bg-white border border-surface-200 text-surface-800 hover:border-brand-300"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-auto p-6 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {regularProducts?.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "text-left bg-white rounded-2xl border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative",
                      inCart ? "border-brand-400 ring-2 ring-brand-100" : "border-surface-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-surface-50 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          "🍔"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-semibold text-sm text-surface-900 truncate">{product.name}</p>
                        <p className="text-xs text-surface-200 font-body mt-0.5 truncate">{product.category.name}</p>
                        {product.is_promotional && product.promotional_price ? (
                          <div className="mt-1">
                            <span className="font-display text-brand-600 text-sm mr-1.5">{formatCurrency(product.promotional_price)}</span>
                            <span className="text-[10px] text-surface-300 line-through font-body">{formatCurrency(product.price)}</span>
                          </div>
                        ) : (
                          <p className="font-display text-surface-900 text-sm mt-1">{formatCurrency(product.price)}</p>
                        )}
                      </div>
                    </div>
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center font-body shadow-md">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Order Summary ────────────────────────────────── */}
      <div className="w-[380px] bg-white border-l border-surface-100 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-500" />
            <h2 className="font-display text-lg text-surface-900">Resumo do Pedido</h2>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Order type */}
          <div>
            <label className="text-xs font-semibold text-surface-800 font-body block mb-2 uppercase tracking-wide">Tipo do Pedido</label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setOrderType(t.value);
                    if (t.value !== "delivery") {
                      // Remove any delivery fee if order is not delivery
                      setCart(prev => prev.filter(i => !i.product.name.toLowerCase().includes("taxa")));
                    }
                  }}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-body font-semibold transition-all text-center",
                    orderType === t.value
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                      : "bg-surface-50 text-surface-800 hover:bg-surface-100"
                  )}
                >
                  <span className="text-base block">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Fee Section */}
          {orderType === "delivery" && feeProducts.length > 0 && (
            <div className="animate-fade-up">
              <label className="text-xs font-semibold text-surface-800 font-body block mb-2 uppercase tracking-wide">Taxa de Entrega</label>
              <div className="grid grid-cols-2 gap-2">
                {feeProducts.map((feeProd) => {
                  const inCart = cart.some(i => i.product.id === feeProd.id);
                  return (
                    <button
                      key={feeProd.id}
                      onClick={() => {
                        const cartWithoutFees = cart.filter(i => !i.product.name.toLowerCase().includes("taxa"));
                        if (inCart) {
                          setCart(cartWithoutFees);
                        } else {
                          setCart([...cartWithoutFees, { product: feeProd, quantity: 1 }]);
                        }
                      }}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-body font-semibold transition-all flex flex-col items-center justify-center gap-0.5",
                        inCart
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                          : "bg-surface-50 text-surface-800 hover:bg-surface-100"
                      )}
                    >
                      <span className="truncate w-full text-center">
                        {feeProd.name.toLowerCase().replace(/taxa de entrega/g, '').replace(/-/g, '').trim() || "Padrão"}
                      </span>
                      <span className={cn("text-[10px]", inCart ? "text-brand-100" : "text-surface-400")}>
                        {formatCurrency(feeProd.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer info */}
          <div className="space-y-3">
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200" />
              <input
                placeholder="Nome do cliente *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {orderType === "delivery" && (
              <>
                <div className="relative animate-fade-up">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200" />
                  <input
                    placeholder="Telefone *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="relative animate-fade-up">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200" />
                  <input
                    placeholder="Endereço de entrega *"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <StickyNote size={14} className="absolute left-3 top-3 text-surface-200" />
              <textarea
                placeholder="Observações (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
          </div>

          {/* Payment */}
          <div>
            <label className="text-xs font-semibold text-surface-800 font-body block mb-2 uppercase tracking-wide">Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-body font-semibold transition-all",
                    paymentMethod === m.value
                      ? "bg-surface-950 text-white"
                      : "bg-surface-50 text-surface-800 hover:bg-surface-100"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cart items */}
          <div>
            <label className="text-xs font-semibold text-surface-800 font-body block mb-2 uppercase tracking-wide">
              Itens ({cart.length})
            </label>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-surface-200 font-body text-sm">
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                Clique nos produtos para adicionar
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-surface-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold text-surface-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-surface-200 font-body">
                          {formatCurrency((item.product.is_promotional && item.product.promotional_price ? Number(item.product.promotional_price) : Number(item.product.price)) * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-800 hover:border-brand-400 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-body font-bold text-surface-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-800 hover:border-brand-400 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => toggleItemNotes(item.product.id)}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors ml-1",
                            item.showNotes || item.notes 
                              ? "bg-amber-100 text-amber-600" 
                              : "text-surface-400 hover:bg-surface-200 hover:text-surface-600"
                          )}
                          title="Adicionar Observação"
                        >
                          <StickyNote size={12} />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {/* Item Notes */}
                    {(item.showNotes || item.notes) && (
                      <input
                        placeholder="Obs. do produto (ex: sem cebola)"
                        value={item.notes || ""}
                        onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 font-body text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-amber-900 placeholder:text-amber-700/50"
                        autoFocus
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-100 space-y-3 bg-surface-50/50">
          <div className="flex items-center justify-between">
            <span className="font-body font-semibold text-surface-800">Total</span>
            <span className="font-display text-2xl text-surface-900">{formatCurrency(total)}</span>
          </div>
          <Button
            onClick={handleSubmit}
            loading={createOrder.isPending}
            disabled={cart.length === 0 || !customerName.trim()}
            size="lg"
            className="w-full"
          >
            Finalizar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
