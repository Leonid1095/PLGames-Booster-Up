import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className,
  ...props
}: InputProps) {
  const id = props.id || label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg bg-surface-card border text-text-primary text-sm",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-1 transition-colors duration-200",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-surface-border focus:border-brand focus:ring-brand",
          className,
        )}
        {...props}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
