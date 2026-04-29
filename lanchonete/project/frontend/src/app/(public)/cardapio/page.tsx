"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/cardapio/ProductCard";
import { Spinner, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function CardapioPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");

  const { data: categories, isLoading: loadingCats } = useCategories();
  const { data: products, isLoading: loadingProds } = useProducts(selectedCategory);

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 animate-fade-up">
        <h1 className="font-display text-4xl text-surface-900">Nosso Cardápio</h1>
        <p className="text-surface-200 font-body">Escolha o que você está com vontade de comer</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200" />
        <input
          type="text"
          placeholder="Buscar no cardápio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-surface-200 bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
        />
      </div>

      {/* Category tabs */}
      {!loadingCats && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold font-body transition-all",
              !selectedCategory ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" : "bg-white border border-surface-200 text-surface-800 hover:border-brand-300"
            )}
          >
            Tudo
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold font-body transition-all",
                selectedCategory === cat.id ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" : "bg-white border border-surface-200 text-surface-800 hover:border-brand-300"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {loadingProds ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : filtered?.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nenhum produto encontrado"
          description={search ? `Nada encontrado para "${search}"` : "Selecione outra categoria"}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered?.map((product, i) => (
            <div
              key={product.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
