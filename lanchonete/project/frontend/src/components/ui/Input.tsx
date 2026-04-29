import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-surface-800 font-body">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-2.5 rounded-2xl border border-surface-200 bg-white text-surface-900 font-body text-sm",
          "placeholder:text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent",
          "transition-all duration-200",
          error && "border-red-400 focus:ring-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-body">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
export default Input;
