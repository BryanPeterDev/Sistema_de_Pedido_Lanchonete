"use client";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group bg-white rounded-3xl border border-surface-100 overflow-hidden hover:shadow-lg hover:shadow-surface-800/8 hover:-translate-y-0.5 transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 bg-surface-50 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍔</div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-surface-950/60 flex items-center justify-center">
            <span className="bg-white text-surface-900 text-xs font-semibold font-body px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <AlertCircle size={12} /> Indisponível
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className="bg-brand-500 text-white text-xs font-bold font-body px-2.5 py-1 rounded-full shadow-sm">
            {product.category.name}
          </span>
          {product.is_promotional && (
            <span className="bg-amber-400 text-amber-950 text-xs font-bold font-body px-2.5 py-1 rounded-full shadow-sm animate-pulse">
              🔥 PROMOÇÃO
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display text-surface-900 text-base font-semibold leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-surface-200 font-body mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          {product.is_promotional && product.promotional_price ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-xl text-brand-600">{formatCurrency(product.promotional_price)}</span>
              <span className="text-sm text-surface-200 line-through font-body">{formatCurrency(product.price)}</span>
            </div>
          ) : (
            <span className="font-display text-xl text-surface-900">{formatCurrency(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
