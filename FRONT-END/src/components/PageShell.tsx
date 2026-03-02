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
    <div className={cn("container mx-auto max-w-6xl px-4 pt-24 pb-8", containerClassName)}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>

      {children}
    </div>
  );
};

export default PageShell;