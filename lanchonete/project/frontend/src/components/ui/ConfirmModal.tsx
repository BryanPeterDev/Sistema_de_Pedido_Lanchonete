"use client";
import { AlertTriangle } from "lucide-react";
import { Modal, Button } from "@/components/ui";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${variant === "danger" ? "bg-red-50 text-red-500" :
              variant === "warning" ? "bg-amber-50 text-amber-500" :
                "bg-brand-50 text-brand-500"
            }`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-surface-600 font-body text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "primary" : variant === "warning" ? "secondary" : "primary"}
            className={variant === "danger" ? "bg-red-500 hover:bg-red-600 border-red-500 text-white" : ""}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
