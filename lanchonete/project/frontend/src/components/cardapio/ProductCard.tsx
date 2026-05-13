"use client";
import { AlertCircle, Tag } from "lucide-react";
import { formatCurrency, getImageUrl, getActivePrice, getPromotion } from "@/lib/utils";
import type { Product, Promotion } from "@/types";

export default function ProductCard({ product, promotions = [] }: { product: Product, promotions?: Promotion[] }) {
  const imageUrl = getImageUrl(product.image_path || product.image_url);
  const promo = getPromotion(product.id, promotions, "product");
  const activePrice = getActivePrice(product.id, product.price, promotions, "product");

  return (
    <div className="group bg-white rounded-3xl border border-surface-100 overflow-hidden hover:shadow-lg hover:shadow-surface-800/8 hover:-translate-y-0.5 transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 bg-surface-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍔</div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className="bg-brand-500 text-white text-xs font-bold font-body px-2.5 py-1 rounded-full shadow-sm">
            {product.category.name}
          </span>
          {promo && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold font-body px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Tag size={10} /> Promoção
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
          {promo ? (
            <div className="flex items-end gap-2">
              <span className="font-display text-surface-300 text-sm line-through mb-0.5">{formatCurrency(product.price)}</span>
              <span className="font-display text-xl text-emerald-600">{formatCurrency(activePrice)}</span>
            </div>
          ) : (
            <span className="font-display text-xl text-surface-900">{formatCurrency(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
