"use client";
import { useState } from "react";
import { DollarSign, Clock, CheckCircle2, XCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { useCashRegisterCurrent, useCashRegisterHistory, useOpenCashRegister, useCloseCashRegister } from "@/hooks/useCashRegister";
import { Button, Modal, Spinner } from "@/components/ui";
import { ConfirmModal } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminCaixaPage() {
  const [openingNotes, setOpeningNotes] = useState("");
  const [openingCash, setOpeningCash] = useState<string>("0");
  const [closingNotes, setClosingNotes] = useState("");
  const [closingCash, setClosingCash] = useState<string>("0");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const { data: current, isLoading: loadingCurrent } = useCashRegisterCurrent();
  const { data: history, isLoading: loadingHistory } = useCashRegisterHistory(20);
  const openCaixa = useOpenCashRegister();
  const closeCaixa = useCloseCashRegister();

  async function handleOpen() {
    try {
      await openCaixa.mutateAsync({
        opening_cash: Number(openingCash.replace(",", ".")),
        notes: openingNotes || undefined
      });
      toast.success("Caixa aberto com sucesso!");
      setShowOpenModal(false);
      setOpeningNotes("");
      setOpeningCash("0");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao abrir caixa");
    }
  }

  async function handleClose() {
    try {
      await closeCaixa.mutateAsync({
        closing_cash: Number(closingCash.replace(",", ".")),
        notes: closingNotes || undefined
      });
      toast.success("Caixa fechado! Dados consolidados no dashboard.");
      setShowCloseModal(false);
      setClosingNotes("");
      setClosingCash("0");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao fechar caixa");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Caixa</h1>
          <p className="text-sm text-surface-200 font-body mt-1">Abrir, fechar e histórico de caixas</p>
        </div>
        {current ? (
          <Button
            variant="danger"
            onClick={() => setShowCloseModal(true)}
          >
            <XCircle size={18} /> Fechar Caixa
          </Button>
        ) : (
          <Button onClick={() => setShowOpenModal(true)}>
            <DollarSign size={18} /> Abrir Caixa
          </Button>
        )}
      </div>

      {/* Status do caixa atual */}
      {loadingCurrent ? (
        <div className="flex justify-center py-8"><Spinner className="h-7 w-7" /></div>
      ) : current ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 font-body">Caixa Aberto</p>
            <p className="text-sm text-emerald-700 font-body mt-0.5">
              Aberto em {formatDate(current.opened_at)}
            </p>
            <p className="text-sm font-semibold text-emerald-800 font-body mt-1">
              Valor Inicial: {formatCurrency(current.opening_cash)}
            </p>
            {current.notes && (
              <p className="text-xs text-emerald-600 mt-1 italic">"{current.notes}"</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-semibold text-amber-900 font-body">Nenhum caixa aberto</p>
            <p className="text-sm text-amber-700 font-body mt-0.5">
              Abra o caixa para começar a registrar vendas no dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <h2 className="font-display text-xl text-surface-900 mb-4">Histórico de Fechamentos</h2>
        {loadingHistory ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
        ) : !history?.length ? (
          <div className="bg-white rounded-2xl border border-surface-100 p-10 text-center">
            <p className="text-surface-200 font-body text-sm">Nenhum caixa fechado ainda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {["#", "Aberto", "Fechado", "Dinheiro Inicial", "Dinheiro Final", "Vendas (Din/PIX/Cart)", "Total", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-surface-200 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {history.map((reg) => (
                  <tr key={reg.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-surface-400">#{reg.id}</td>
                    <td className="px-5 py-4 text-surface-800">{formatDate(reg.opened_at)}</td>
                    <td className="px-5 py-4 text-surface-800">{reg.closed_at ? formatDate(reg.closed_at) : "—"}</td>
                    <td className="px-5 py-4 text-emerald-600 font-medium">{formatCurrency(reg.opening_cash)}</td>
                    <td className="px-5 py-4 text-blue-600 font-medium">{reg.closing_cash !== null ? formatCurrency(reg.closing_cash) : "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-amber-600 font-semibold">💵 {formatCurrency(reg.total_dinheiro)}</span>
                        <span className="text-emerald-600 font-medium">PIX {formatCurrency(reg.total_pix)}</span>
                        <span className="text-blue-600 font-medium">💳 {formatCurrency(reg.total_cartao)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-brand-600">{formatCurrency(reg.total_revenue)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-surface-900 font-semibold">{reg.total_orders} pedidos</span>
                        <span className="text-surface-400 text-[10px]">Ticket: {formatCurrency(reg.avg_ticket)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Abrir Caixa */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title="Abrir Caixa">
        <div className="space-y-4">
          <p className="text-sm text-surface-800 font-body">
            O caixa ficará aberto até você fechá-lo manualmente. Todos os pedidos criados nesse período serão incluídos no fechamento.
          </p>
          <div>
            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Valor Inicial em Dinheiro (R$)</label>
            <input
              type="text"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
            />

            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Observações (opcional)</label>
            <textarea
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Turno manhã — Bryan"
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <Button onClick={handleOpen} loading={openCaixa.isPending} className="w-full">
            <DollarSign size={18} /> Abrir Caixa
          </Button>
        </div>
      </Modal>

      {/* Modal Fechar Caixa */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Fechar Caixa">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-body">
              Ao fechar, o sistema consolida todos os pedidos desde a abertura. Os dados ficam disponíveis no Dashboard.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Valor Final em Dinheiro (R$)</label>
            <input
              type="text"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
            />

            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Observações (opcional)</label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Fechamento turno — tudo ok"
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <Button
            variant="danger"
            onClick={handleClose}
            loading={closeCaixa.isPending}
            className="w-full"
          >
            <XCircle size={18} /> Fechar Caixa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
