"use client";
import { useState } from "react";
import {
  TrendingUp, ShoppingBag, Target, Truck, Package, UtensilsCrossed,
  CheckCircle2, XCircle, DollarSign, Smartphone, CreditCard, AlertTriangle,
  BarChart2, RefreshCw, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { useDashboardSummary, useSalesByHour, useTopProducts, usePaymentBreakdown, useDeliveryStats } from "@/hooks/useAnalytics";
import { useCashRegisterCurrent, useCashRegisterHistory } from "@/hooks/useCashRegister";
import { Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const PAYMENT_COLORS: Record<string, string> = {
  pix: "#10b981",
  dinheiro: "#f59e0b",
  cartao: "#3b82f6",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};
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
      <div 
        className="bg-white rounded-2xl border border-surface-100 p-5 hover:shadow-md transition-all duration-300 cursor-help hover:border-brand-200"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider font-body">{label}</span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.brand}`}>
            {icon}
          </div>
        </div>
        <p className="font-display text-2xl text-surface-900">{value}</p>
        {sub && <p className="text-xs text-surface-200 mt-1 font-body">{sub}</p>}
      </div>
      
      {/* Custom Tooltip */}
      {tooltip && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 p-3 bg-surface-900 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-surface-800 font-body">
          <div className="relative z-10">{tooltip}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-surface-900" />
        </div>
      )}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-surface-100 flex items-center justify-center">
        <BarChart2 size={36} className="text-surface-300" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-xl text-surface-900">Nenhum caixa fechado</h2>
        <p className="text-sm text-surface-200 font-body mt-2 max-w-xs">
          Abra um caixa, registre os pedidos do dia e feche o caixa para ver os dados aqui.
        </p>
      </div>
      <Link
        href="/admin/caixa"
        className="px-6 py-3 bg-surface-950 text-white rounded-2xl font-semibold font-body text-sm hover:bg-surface-800 transition-colors"
      >
        <DollarSign size={16} className="inline mr-2" />
        Ir para Caixa
      </Link>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [selectedRegisterId, setSelectedRegisterId] = useState<number | undefined>();

  const { data: current } = useCashRegisterCurrent();
  const { data: history } = useCashRegisterHistory(30);
  const { data: summary, isLoading: loadingSummary, error: summaryError } = useDashboardSummary(selectedRegisterId);
  const { data: byHour } = useSalesByHour(selectedRegisterId);
  const { data: topProducts } = useTopProducts(selectedRegisterId, 10);
  const { data: payments } = usePaymentBreakdown(selectedRegisterId);
  const { data: delivery } = useDeliveryStats(selectedRegisterId);

  const isLoading = loadingSummary;
  const hasNoData = !!summaryError && !summary;

  const closedRegisters = history?.filter((r) => r.status === "fechado") ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Dashboard</h1>
          <p className="text-sm text-surface-200 font-body mt-1">
            Análise de vendas baseada no fechamento de caixa
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de caixa */}
          {closedRegisters.length > 0 && (
            <select
              value={selectedRegisterId ?? ""}
              onChange={(e) => setSelectedRegisterId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-4 py-2 rounded-xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            >
              <option value="">Último caixa fechado</option>
              {closedRegisters.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.closed_at ? new Date(r.closed_at).toLocaleDateString("pt-BR") : "?"}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/admin/caixa"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 font-body text-sm hover:bg-surface-50 transition-colors text-surface-800"
          >
            <DollarSign size={15} />
            Caixa
          </Link>
        </div>
      </div>

      {/* Banner caixa aberto */}
      {current && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <Clock size={18} className="text-emerald-600" />
          <p className="text-sm text-emerald-800 font-body">
            <span className="font-semibold">Caixa aberto</span> desde {formatDate(current.opened_at)}.
            Feche o caixa para atualizar os dados do dashboard.
          </p>
          <Link href="/admin/caixa" className="ml-auto text-xs font-semibold text-emerald-700 hover:underline">
            Fechar Caixa →
          </Link>
        </div>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner className="h-10 w-10" /></div>
      ) : hasNoData ? (
        <EmptyDashboard />
      ) : summary ? (
        <>
          {/* Info do período */}
          <div className="text-xs text-surface-200 font-body">
            Caixa #{summary.register_id} · {formatDate(summary.opened_at)}
            {summary.closed_at && ` até ${formatDate(summary.closed_at)}`}
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard 
              icon={<TrendingUp size={18} />} 
              label="Total Faturado" 
              value={formatCurrency(summary.total_revenue)} 
              color="brand" 
              tooltip="Faturamento total bruto (Vendas + Taxas). É o total que entrou no caixa."
            />
            <StatCard 
              icon={<ShoppingBag size={18} />} 
              label="Pedidos" 
              value={String(summary.total_orders)} 
              sub={`${summary.total_cancelled} cancelados`} 
              color="blue" 
              tooltip="Quantidade total de comandas atendidas no período."
            />
            <StatCard 
              icon={<Target size={18} />} 
              label="Ticket Médio" 
              value={formatCurrency(summary.avg_ticket)} 
              color="violet" 
              tooltip="Valor médio gasto por cliente em cada pedido."
            />
            <StatCard 
              icon={<Truck size={18} />} 
              label="Entregas" 
              value={String(summary.total_delivery)} 
              sub={delivery ? `Taxa: ${formatCurrency(delivery.total_delivery_fees)}` : undefined} 
              color="emerald" 
              tooltip="Total de pedidos enviados para entrega (Delivery)."
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard 
              icon={<UtensilsCrossed size={18} />} 
              label="Consumo Local" 
              value={String(summary.total_local)} 
              color="amber" 
              tooltip="Pedidos servidos diretamente nas mesas ou balcão."
            />
            <StatCard 
              icon={<Package size={18} />} 
              label="Retiradas" 
              value={String(summary.total_retirada)} 
              color="surface" 
              tooltip="Pedidos que os clientes vieram buscar no estabelecimento."
            />
            <StatCard 
              icon={<CheckCircle2 size={18} />} 
              label="Concluídos" 
              value={String(summary.total_orders)} 
              color="emerald" 
              tooltip="Total de vendas finalizadas e pagas com sucesso."
            />
            <StatCard 
              icon={<XCircle size={18} />} 
              label="Cancelados" 
              value={String(summary.total_cancelled)} 
              color="red" 
              tooltip="Pedidos que foram estornados ou cancelados."
            />
          </div>

          {/* Financeiro + Tempo médio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Breakdown financeiro */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 p-6 space-y-4">
              <h2 className="font-display text-lg text-surface-900">Financeiro</h2>
              <div className="space-y-3">
                {[
                  { label: "Total Bruto", value: summary.total_revenue, icon: <TrendingUp size={14} />, color: "text-brand-600", tooltip: "Faturamento total bruto (Produtos + Entregas)." },
                  { label: "Só Produtos", value: summary.total_products, icon: <ShoppingBag size={14} />, color: "text-surface-800", tooltip: "Valor arrecadado apenas com a venda de produtos." },
                  { label: "Taxa de Entrega", value: summary.total_delivery_fees, icon: <Truck size={14} />, color: "text-amber-600", tooltip: "Total arrecadado apenas com as taxas de delivery." },
                  { label: "Dinheiro Inicial", value: summary.opening_cash, icon: <DollarSign size={14} />, color: "text-emerald-600", tooltip: "Valor que estava no caixa no momento da abertura." },
                  { label: "Dinheiro em Caixa (Final)", value: summary.closing_cash || 0, icon: <CheckCircle2 size={14} />, color: "text-blue-600", tooltip: "Valor físico contado e informado no fechamento do caixa." },
                ].map((row) => (
                  <div key={row.label} className="relative group/row flex items-center justify-between py-3 border-b border-surface-100 last:border-0 cursor-help">
                    <div className="flex items-center gap-2 text-sm font-body text-surface-800">
                      {row.icon} {row.label}
                    </div>
                    <span className={`font-semibold font-body ${row.color}`}>{formatCurrency(row.value)}</span>
                    
                    {/* Tooltip da Linha */}
                    <div className="absolute right-0 bottom-full mb-1 w-48 p-2 bg-surface-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/row:opacity-100 group-hover/row:visible transition-all duration-200 z-50 pointer-events-none">
                      {row.tooltip}
                    </div>
                  </div>
                ))}
                {summary.closing_cash !== null && (
                  <div className="relative group/diff">
                    <div 
                      className="flex items-center justify-between py-3 border-t-2 border-surface-50 border-dashed cursor-help"
                    >
                      <div className="flex items-center gap-2 text-sm font-body text-surface-800 font-semibold">
                        <Target size={14} /> Diferença (Esperado vs Real)
                      </div>
                      <span className={`font-bold font-body ${Number(summary.closing_cash) - (Number(summary.opening_cash) + Number(summary.total_dinheiro)) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(Number(summary.closing_cash) - (Number(summary.opening_cash) + Number(summary.total_dinheiro)))}
                      </span>
                    </div>

                    <div className="absolute right-0 bottom-full mb-1 w-56 p-2 bg-surface-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/diff:opacity-100 group-hover/diff:visible transition-all duration-200 z-50 pointer-events-none">
                      Cálculo: (Dinheiro Final) - (Dinheiro Inicial + Vendas em Dinheiro).
                    </div>
                  </div>
                )}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm font-body">
                    <span className="flex items-center gap-2 text-emerald-700"><Smartphone size={14} /> PIX</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(summary.total_pix)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-body">
                    <span className="flex items-center gap-2 text-amber-700"><DollarSign size={14} /> Dinheiro</span>
                    <span className="font-semibold text-amber-700">{formatCurrency(summary.total_dinheiro)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-body">
                    <span className="flex items-center gap-2 text-blue-700"><CreditCard size={14} /> Cartão</span>
                    <span className="font-semibold text-blue-700">{formatCurrency(summary.total_cartao)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pizza pagamentos */}
            <div className="bg-white rounded-2xl border border-surface-100 p-6">
              <h2 className="font-display text-lg text-surface-900 mb-4">Pagamentos</h2>
              {payments && payments.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={payments.map((p) => ({
                        name: PAYMENT_LABELS[p.payment_method] ?? p.payment_method,
                        value: Number(p.total),
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {payments.map((p) => (
                        <Cell key={p.payment_method} fill={PAYMENT_COLORS[p.payment_method] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => <span className="text-xs font-body text-surface-800">{v}</span>} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-surface-200 text-sm py-10 font-body">Sem dados</p>
              )}
            </div>
          </div>

          {/* Gráfico por hora */}
          <div className="bg-white rounded-2xl border border-surface-100 p-6">
            <h2 className="font-display text-lg text-surface-900 mb-6">Pedidos por Hora</h2>
            {byHour ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byHour} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}h`}
                    tick={{ fontSize: 11, fontFamily: "var(--font-body)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-body)" }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    labelFormatter={(l) => `${l}:00 — ${l}:59`}
                  />
                  <Bar dataKey="total_orders" name="Pedidos" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-surface-200 text-sm py-10 font-body">Sem dados</p>
            )}
          </div>

          {/* Top produtos + Entrega */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 10 */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 p-6">
              <h2 className="font-display text-lg text-surface-900 mb-4">Top 10 Produtos</h2>
              {topProducts && topProducts.length > 0 ? (
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="text-left py-2 text-xs font-semibold text-surface-200 uppercase tracking-wide">#</th>
                      <th className="text-left py-2 text-xs font-semibold text-surface-200 uppercase tracking-wide">Produto</th>
                      <th className="text-right py-2 text-xs font-semibold text-surface-200 uppercase tracking-wide">Qtd</th>
                      <th className="text-right py-2 text-xs font-semibold text-surface-200 uppercase tracking-wide">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {topProducts.map((p, i) => (
                      <tr key={p.product_id}>
                        <td className="py-3 text-surface-300 text-xs font-mono">{i + 1}</td>
                        <td className="py-3">
                          <p className="font-semibold text-surface-900">{p.product_name}</p>
                          <p className="text-xs text-surface-200">{p.category_name}</p>
                        </td>
                        <td className="py-3 text-right font-semibold text-surface-900">{p.total_quantity}</td>
                        <td className="py-3 text-right font-semibold text-brand-600">{formatCurrency(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-surface-200 text-sm py-10">Sem dados</p>
              )}
            </div>

            {/* Entrega */}
            <div className="bg-white rounded-2xl border border-surface-100 p-6 space-y-4">
              <h2 className="font-display text-lg text-surface-900">Entregas</h2>
              {delivery ? (
                <div className="space-y-4">
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-xs text-surface-200 font-body font-semibold uppercase tracking-wide">Total Entregas</p>
                    <p className="font-display text-3xl text-surface-900 mt-1">{delivery.total_deliveries}</p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-xs text-surface-200 font-body font-semibold uppercase tracking-wide">Taxa Arrecadada</p>
                    <p className="font-display text-2xl text-brand-600 mt-1">{formatCurrency(delivery.total_delivery_fees)}</p>
                  </div>
                  {delivery.avg_delivery_time_minutes !== null && (
                    <div className="p-4 bg-surface-50 rounded-xl">
                      <p className="text-xs text-surface-200 font-body font-semibold uppercase tracking-wide">Tempo Médio</p>
                      <p className="font-display text-2xl text-surface-900 mt-1">{delivery.avg_delivery_time_minutes} min</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-surface-200 text-sm py-10 font-body">Sem dados</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
