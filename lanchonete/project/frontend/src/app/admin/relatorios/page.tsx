"use client";
import { useState, useMemo } from "react";
import { 
  BarChart2, TrendingUp, ShoppingBag, Truck, DollarSign, 
  Calendar, ChevronDown, Filter, FileText, Download,
  Target, UtensilsCrossed, Package, CheckCircle2, XCircle,
  Smartphone, CreditCard, Layers
} from "lucide-react";
import { useManagementSummary } from "@/hooks/useAnalytics";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui";

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "brand",
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tooltip?: string;
}) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
    violet: "bg-violet-50 text-violet-600",
    surface: "bg-surface-100 text-surface-600",
  };
  return (
    <div className="relative group">
      <div className="bg-white rounded-2xl border border-surface-100 p-5 hover:shadow-md transition-all duration-300 cursor-help hover:border-brand-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider font-body">{label}</span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.brand}`}>
            {icon}
          </div>
        </div>
        <p className="font-display text-2xl text-surface-900">{value}</p>
        {sub && <p className="text-xs text-surface-200 mt-1 font-body">{sub}</p>}
      </div>
      {tooltip && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 p-3 bg-surface-900 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-surface-800 font-body">
          <div className="relative z-10">{tooltip}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-surface-900" />
        </div>
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year" | "total">("month");
  
  // Helper para calcular datas - Memoizado para evitar múltiplas requisições por milissegundo
  const { from, to } = useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    if (period === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // segunda-feira
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === "year") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else {
      return { from: undefined, to: undefined };
    }
    
    return { from: start.toISOString(), to: now.toISOString() };
  }, [period]);

  const { data: summary, isLoading } = useManagementSummary(from, to);

  const periods = [
    { id: "week", label: "Esta Semana" },
    { id: "month", label: "Este Mês" },
    { id: "year", label: "Este Ano" },
    { id: "total", label: "Geral (Tudo)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Relatórios Gerenciais</h1>
          <p className="text-sm text-surface-200 font-body mt-1">
            Visão consolidada de faturamento e performance por período
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-surface-100">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold font-body transition-all ${
                period === p.id 
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25" 
                  : "text-surface-400 hover:text-surface-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner className="h-10 w-10" /></div>
      ) : summary ? (
        <>
          {/* Info do período */}
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
            <Calendar className="text-brand-600" size={18} />
            <p className="text-sm text-brand-900 font-body">
              Mostrando dados de <span className="font-bold">{from ? formatDate(from) : "o início"}</span> até <span className="font-bold">{to ? formatDate(to) : "hoje"}</span>. 
              Total de <span className="font-bold">{summary.count_registers} fechamentos</span> consolidados.
            </p>
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<TrendingUp size={18} />} 
              label="Faturamento Bruto" 
              value={formatCurrency(summary.total_revenue)} 
              color="brand" 
              tooltip="Total arrecadado (Vendas + Taxas) em todos os caixas fechados no período."
            />
            <StatCard 
              icon={<ShoppingBag size={18} />} 
              label="Total de Pedidos" 
              value={String(summary.total_orders)} 
              sub={`${summary.total_cancelled} cancelamentos`} 
              color="blue" 
              tooltip="Soma de todos os pedidos realizados."
            />
            <StatCard 
              icon={<Target size={18} />} 
              label="Ticket Médio Geral" 
              value={formatCurrency(summary.avg_ticket)} 
              color="violet" 
              tooltip="Média de gasto por cliente considerando todo o período selecionado."
            />
            <StatCard 
              icon={<Truck size={18} />} 
              label="Taxas de Entrega" 
              value={formatCurrency(summary.total_delivery_fees)} 
              color="emerald" 
              tooltip="Total acumulado apenas das taxas de delivery."
            />
          </div>

          {/* Segunda linha de cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard 
              icon={<Layers size={18} />} 
              label="Fechamentos" 
              value={String(summary.count_registers)} 
              color="surface" 
              tooltip="Número de vezes que o caixa foi aberto e fechado neste período."
            />
            <StatCard 
              icon={<DollarSign size={18} />} 
              label="Total Dinheiro" 
              value={formatCurrency(summary.total_dinheiro)} 
              color="amber" 
              tooltip="Total acumulado recebido em espécie (dinheiro)."
            />
            <StatCard 
              icon={<Smartphone size={18} />} 
              label="Total PIX" 
              value={formatCurrency(summary.total_pix)} 
              color="emerald" 
              tooltip="Total acumulado recebido via PIX."
            />
            <StatCard 
              icon={<CreditCard size={18} />} 
              label="Total Cartão" 
              value={formatCurrency(summary.total_cartao)} 
              color="blue" 
              tooltip="Total acumulado recebido via Cartão de Crédito/Débito."
            />
            <StatCard 
              icon={<UtensilsCrossed size={18} />} 
              label="Local/Retirada" 
              value={String(summary.total_local + summary.total_retirada)} 
              color="violet" 
              tooltip="Soma de pedidos que não foram delivery."
            />
          </div>

          {/* Detalhamento Financeiro */}
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
            <div className="p-6 border-b border-surface-50 flex items-center justify-between">
              <h2 className="font-display text-lg text-surface-900">Detalhamento por Forma de Pagamento</h2>
              <FileText className="text-surface-200" size={20} />
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-surface-200 uppercase tracking-wider font-body mb-2">Cartão de Crédito/Débito</p>
                <p className="text-3xl font-display text-blue-600">{formatCurrency(summary.total_cartao)}</p>
                <p className="text-xs text-surface-400 font-body">Representa {((summary.total_cartao / (summary.total_revenue || 1)) * 100).toFixed(1)}% do faturamento</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-surface-200 uppercase tracking-wider font-body mb-2">PIX / Transferência</p>
                <p className="text-3xl font-display text-emerald-600">{formatCurrency(summary.total_pix)}</p>
                <p className="text-xs text-surface-400 font-body">Representa {((summary.total_pix / (summary.total_revenue || 1)) * 100).toFixed(1)}% do faturamento</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-surface-200 uppercase tracking-wider font-body mb-2">Dinheiro (Espécie)</p>
                <p className="text-3xl font-display text-amber-600">{formatCurrency(summary.total_dinheiro)}</p>
                <p className="text-xs text-surface-400 font-body">Representa {((summary.total_dinheiro / (summary.total_revenue || 1)) * 100).toFixed(1)}% do faturamento</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 p-24 text-center">
          <p className="text-surface-200 font-body text-sm">Nenhum dado encontrado para este período.</p>
        </div>
      )}
    </div>
  );
}
