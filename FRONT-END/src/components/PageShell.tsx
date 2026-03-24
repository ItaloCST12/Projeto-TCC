import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  containerClassName?: string;
};

const PageShell = ({
  title,
  subtitle,
  actions,
  children,
  containerClassName,
}: PageShellProps) => {
  return (
    <div className={cn("container mx-auto max-w-6xl px-4 pt-24 pb-10", containerClassName)}>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border/75 bg-card/90 px-5 py-5 sm:px-6">
        <div>
          <h1 className="mb-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="max-w-2xl text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>

      {children}
    </div>
  );
};

export default PageShell;