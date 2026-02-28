import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-surface-border rounded-xl p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
