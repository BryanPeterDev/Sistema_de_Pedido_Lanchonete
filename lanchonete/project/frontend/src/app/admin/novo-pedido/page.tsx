"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, ShoppingBag, MapPin, Phone, User, StickyNote, AlertTriangle, Zap } from "lucide-react";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useCreateOrder, useUpdateOrder, useOrder } from "@/hooks/useOrders";
import { formatCurrency, cn, isPromotionActive, getImageUrl } from "@/lib/utils";
import { Spinner, Button, Modal } from "@/components/ui";
import toast from "react-hot-toast";
import type { Product, OrderType, PaymentMethod, ProductOptionItem, ProductOptionGroup } from "@/types";

interface LocalCartItem {
  cartId: string;
  product: Product;
  quantity: number;
  notes?: string;
  showNotes?: boolean;
  selected_options?: { option_item_id: number; name: string; price_adjustment: number; quantity: number }[];
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

export default function AdminNovoPedidoPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><Spinner /></div>}>
      <AdminNovoPedidoPage />
    </Suspense>
  );
}

function AdminNovoPedidoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");
  const { data: orderToEdit } = useOrder(editId ? Number(editId) : 0);

  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("local");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [notes, setNotes] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data: categories } = useCategories();
  const { data: products, isLoading } = useProducts(selectedCategory);
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customer_name);
      setCustomerPhone(orderToEdit.customer_phone || "");
      setCustomerAddress(orderToEdit.customer_address || "");
      setOrderType(orderToEdit.order_type);
      setPaymentMethod(orderToEdit.payment_method);
      setNotes(orderToEdit.notes || "");
      
      const newCart = orderToEdit.items.map(item => {
        const optionsTotal = item.selected_options?.reduce((acc, opt) => acc + Number(opt.price_adjustment), 0) || 0;
        const basePrice = Number(item.unit_price) - optionsTotal;

        return {
          cartId: Math.random().toString(36).substring(7),
          product: {
            ...item.product,
            price: basePrice,
            is_promotional: false
          },
          quantity: item.quantity,
          notes: item.notes || undefined,
          showNotes: !!item.notes,
          selected_options: item.selected_options ? item.selected_options.map(o => ({
            option_item_id: o.option_item_id,
            name: o.name,
            price_adjustment: Number(o.price_adjustment),
            quantity: o.quantity || 1
          })) : []
        };
      });
      setCart(newCart as any);
    }
  }, [orderToEdit]);

  const allFiltered = products?.filter((p) =>
    p.is_available &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const regularProducts = allFiltered?.filter((p) => !p.name.toLowerCase().includes("taxa"));
  const feeProducts = products?.filter((p) => p.name.toLowerCase().includes("taxa")) || [];

  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [optionSelections, setOptionSelections] = useState<Record<number, Record<number, number>>>({});

  function addToCart(product: Product) {
    if (product.option_groups && product.option_groups.length > 0) {
      setSelectedProductForOptions(product);
      setOptionSelections({});
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && (!i.selected_options || i.selected_options.length === 0));
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { cartId: Math.random().toString(36).substring(7), product, quantity: 1 }];
    });
  }

  function confirmAddToCartWithOptions() {
    if (!selectedProductForOptions) return;
    
    // Validate required groups
    for (const group of selectedProductForOptions.option_groups) {
      const selections = optionSelections[group.id] || {};
      const totalSelected = Object.values(selections).reduce((a, b) => a + b, 0);
      const effectiveMax = getEffectiveMax(group);
      
      if (group.is_required && totalSelected < group.min_selections) {
        toast.error(`Selecione ao menos ${group.min_selections} em ${group.name}`);
        return;
      }
      if (totalSelected > effectiveMax && group.option_type === "multiple") {
        toast.error(`Máximo de ${effectiveMax} em ${group.name}`);
        return;
      }
    }
    
    const selectedOptionsDetails: { option_item_id: number; name: string; price_adjustment: number; quantity: number }[] = [];
    for (const group of selectedProductForOptions.option_groups) {
      const selections = optionSelections[group.id] || {};
      for (const [idStr, qty] of Object.entries(selections)) {
        if (qty <= 0) continue;
        const id = Number(idStr);
        const opt = group.options.find(o => o.id === id);
        if (opt) {
          selectedOptionsDetails.push({
            option_item_id: opt.id,
            name: opt.name,
            price_adjustment: Number(opt.price_adjustment),
            quantity: qty
          });
        }
      }
    }
    
    setCart(prev => [
      ...prev, 
      { 
        cartId: Math.random().toString(36).substring(7), 
        product: selectedProductForOptions, 
        quantity: 1, 
        selected_options: selectedOptionsDetails 
      }
    ]);
    
    setSelectedProductForOptions(null);
    setOptionSelections({});
  }

  function updateQty(cartId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function updateItemNotes(cartId: string, notes: string) {
    setCart((prev) =>
      prev.map((i) => (i.cartId === cartId ? { ...i, notes } : i))
    );
  }

  function toggleItemNotes(cartId: string) {
    setCart((prev) =>
      prev.map((i) => (i.cartId === cartId ? { ...i, showNotes: !i.showNotes } : i))
    );
  }

  function removeFromCart(cartId: string) {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  }

  const total = cart.reduce((sum, i) => {
    const activePrice = i.product.is_promotional && i.product.promotional_price 
      ? Number(i.product.promotional_price) 
      : Number(i.product.price || 0);
    const optionsPrice = i.selected_options?.reduce((optSum, opt) => optSum + (Number(opt.price_adjustment) * (opt.quantity || 1)), 0) || 0;
    return sum + (isNaN(activePrice) ? 0 : activePrice + optionsPrice) * i.quantity;
  }, 0);

  async function handleSubmit() {
    if (!customerName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (cart.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    if (orderType === "delivery" && !customerPhone.trim()) { toast.error("Informe o telefone para delivery"); return; }
    if (orderType === "delivery" && !customerAddress.trim()) { toast.error("Informe o endereço para delivery"); return; }

    if (editId && !editNote.trim()) { toast.error("Informe o motivo da alteração"); return; }

    const payload = {
      items: cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        notes: i.notes?.trim() || undefined,
        selected_options: i.selected_options?.map(opt => ({ 
          option_item_id: opt.option_item_id,
          quantity: opt.quantity || 1
        }))
      })),
      customer_name: customerName.trim(),
      order_type: orderType,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      customer_phone: orderType === "delivery" ? customerPhone.trim() : undefined,
      customer_address: orderType === "delivery" ? customerAddress.trim() : undefined,
      edit_note: editNote.trim() || "Alteração",
    };

    try {
      if (editId) {
        await updateOrder.mutateAsync({ id: Number(editId), payload });
        toast.success("Pedido atualizado com sucesso! 📝");
        router.push("/admin/pedidos");
      } else {
        await createOrder.mutateAsync(payload);
        toast.success("Pedido criado com sucesso! 🎉");
        // Reset
        setCart([]); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setNotes(""); setOrderType("local"); setPaymentMethod("dinheiro");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao salvar pedido");
    }
  }

  const getEffectiveMax = (group: ProductOptionGroup) => {
    let override: number | undefined;
    for (const gId in optionSelections) {
      const selections = optionSelections[gId];
      const sourceGroup = selectedProductForOptions?.option_groups.find(g => g.id === Number(gId));
      if (!sourceGroup) continue;
      for (const optId in selections) {
        if (selections[optId] > 0) {
          const opt = sourceGroup.options.find(o => o.id === Number(optId));
          if (opt && opt.target_group_id === group.id && opt.target_max_value !== null && opt.target_max_value !== undefined) {
             override = opt.target_max_value;
          }
        }
      }
    }
    return override !== undefined ? override : group.max_selections;
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* ── Left: Product Grid ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0 space-y-4">
          <h1 className="font-display text-2xl text-surface-900">
            {editId ? `Editar Pedido #${editId}` : "Novo Pedido (Admin)"}
          </h1>

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
                        {(product.image_path || product.image_url) ? (
                          <img src={getImageUrl(product.image_path || product.image_url) || undefined} alt="" className="w-full h-full object-cover" />
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
            <ShoppingBag size={20} className={editId ? "text-amber-500" : "text-brand-500"} />
            <h2 className="font-display text-lg text-surface-900">
              {editId ? "Edição do Pedido" : "Resumo do Pedido"}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {editId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-up">
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-800 font-body mb-2 uppercase tracking-wide">
                <AlertTriangle size={14} /> Motivo da Alteração *
              </label>
              <textarea 
                placeholder="Ex: Trocou cebola, tirou refrigerante..." 
                value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none text-amber-900" 
              />
            </div>
          )}
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
                          setCart([...cartWithoutFees, { cartId: Math.random().toString(36).substring(7), product: feeProd, quantity: 1 }]);
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
                {cart.map((item) => {
                  const activePrice = item.product.is_promotional && item.product.promotional_price ? Number(item.product.promotional_price) : Number(item.product.price);
                  const optionsPrice = item.selected_options?.reduce((optSum, opt) => optSum + opt.price_adjustment, 0) || 0;
                  const unitTotal = activePrice + optionsPrice;
                  
                  return (
                  <div key={item.cartId} className="bg-surface-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold text-surface-900 truncate">{item.product.name}</p>
                        {item.selected_options && item.selected_options.length > 0 && (
                          <div className="text-[11px] text-surface-500 font-body leading-tight mt-0.5">
                            {item.selected_options.map(opt => (
                              <div key={opt.option_item_id}>
                                {opt.quantity > 1 ? `${opt.quantity}x ` : "+ "}{opt.name} 
                                {Number(opt.price_adjustment) > 0 && ` (${formatCurrency(Number(opt.price_adjustment) * opt.quantity)})`}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-surface-900 font-body font-medium mt-1">
                          {formatCurrency(unitTotal * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => updateQty(item.cartId, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-800 hover:border-brand-400 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-body font-bold text-surface-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.cartId, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-800 hover:border-brand-400 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => toggleItemNotes(item.cartId)}
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
                          onClick={() => removeFromCart(item.cartId)}
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
                        onChange={(e) => updateItemNotes(item.cartId, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 font-body text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-amber-900 placeholder:text-amber-700/50"
                        autoFocus
                      />
                    )}
                  </div>
                )})}
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
            loading={createOrder.isPending || updateOrder.isPending}
            disabled={cart.length === 0 || !customerName.trim()}
            size="lg"
            className="w-full"
          >
            {editId ? "Salvar Alterações" : "Finalizar Pedido"}
          </Button>
        </div>
      </div>

      {/* Options Modal */}
      {selectedProductForOptions && (
        <Modal
          open={!!selectedProductForOptions}
          onClose={() => setSelectedProductForOptions(null)}
          title={`Opções: ${selectedProductForOptions.name}`}
        >
          <div className="space-y-6">
            {selectedProductForOptions.option_groups.map((group) => {
              const selections = optionSelections[group.id] || {};
              const totalInGroup = Object.values(selections).reduce((a, b) => a + b, 0);
              const effectiveMax = getEffectiveMax(group);
              const isOverridden = effectiveMax !== group.max_selections;
              
              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <h4 className="font-semibold text-surface-900 font-body">{group.name}</h4>
                    <span className={cn(
                      "text-[11px] font-body px-2 py-0.5 rounded-md transition-colors",
                      isOverridden ? "bg-amber-100 text-amber-700 font-bold" : "bg-surface-100 text-surface-500"
                    )}>
                      {group.option_type === "single" ? "Escolha 1" : `Máx: ${effectiveMax}`}
                      {group.is_required && " (Obrigatório)"}
                      {isOverridden && " ✨"}
                    </span>
                  </div>
                  
                  <div className="grid gap-2">
                    {group.options.map((opt) => {
                      const qty = selections[opt.id] || 0;
                      const isSelected = qty > 0;
                      
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex justify-between items-center p-3 rounded-xl border transition-all",
                            isSelected 
                              ? "border-brand-500 bg-brand-50 shadow-sm" 
                              : "border-surface-200 bg-white hover:border-brand-300"
                          )}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <span className={cn("font-body text-sm font-medium block truncate", isSelected ? "text-brand-700" : "text-surface-700")}>
                              {opt.name}
                            </span>
                            {Number(opt.price_adjustment) > 0 && (
                              <div className="flex items-center gap-2">
                                {isPromotionActive(opt) ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-amber-600 font-body">{formatCurrency(opt.promotional_price || 0)}</span>
                                    <span className="text-[9px] text-surface-300 line-through font-body">{formatCurrency(opt.price_adjustment)}</span>
                                    <Zap size={10} className="text-amber-500 fill-current" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-surface-400 font-body">+{formatCurrency(opt.price_adjustment)}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {group.option_type === "single" ? (
                              <button
                                onClick={() => {
                                  setOptionSelections(prev => {
                                    const curr = prev[group.id] || {};
                                    // If clicking already selected, unselect. Else select this one and clear others in group.
                                    if (curr[opt.id]) {
                                      return { ...prev, [group.id]: {} };
                                    }
                                    return { ...prev, [group.id]: { [opt.id]: 1 } };
                                  });
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors border-2",
                                  isSelected ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-surface-200"
                                )}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setOptionSelections(prev => {
                                          const curr = { ...(prev[group.id] || {}) };
                                          if (curr[opt.id] > 1) {
                                            curr[opt.id] -= 1;
                                          } else {
                                            delete curr[opt.id];
                                          }
                                          return { ...prev, [group.id]: curr };
                                        });
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-800 hover:border-brand-400 transition-colors"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="w-4 text-center text-sm font-body font-bold text-surface-900">{qty}</span>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    setOptionSelections(prev => {
                                      const curr = { ...(prev[group.id] || {}) };
                                      if (totalInGroup < effectiveMax) {
                                        curr[opt.id] = (curr[opt.id] || 0) + 1;
                                      } else {
                                        toast.error(`Máximo de ${effectiveMax} itens atingido`);
                                      }
                                      return { ...prev, [group.id]: curr };
                                    });
                                  }}
                                  className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center transition-colors border",
                                    isSelected 
                                      ? "bg-brand-500 border-brand-500 text-white" 
                                      : "bg-white border-surface-200 text-surface-800 hover:border-brand-400"
                                  )}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-4 border-t border-surface-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedProductForOptions(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmAddToCartWithOptions}>
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
