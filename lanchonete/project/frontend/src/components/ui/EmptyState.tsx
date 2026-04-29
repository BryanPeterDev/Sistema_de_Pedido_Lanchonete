interface EmptyStateProps { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }
export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {icon && <div className="text-surface-200 text-5xl">{icon}</div>}
      <div>
        <p className="font-display text-xl text-surface-800">{title}</p>
        {description && <p className="text-sm text-surface-200 mt-1 font-body">{description}</p>}
      </div>
      {action}
    </div>
  );
}
