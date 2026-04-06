import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  titleIcon?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  containerClassName?: string;
};

const PageShell = ({
  title,
  titleIcon,
  subtitle,
  actions,
  children,
  containerClassName,
}: PageShellProps) => {
  return (
    <div className={cn("container mx-auto max-w-6xl px-4 pt-24 pb-28 sm:pb-32 lg:pb-10", containerClassName)}>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border/75 bg-card/90 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h1 className="mb-1 inline-flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            {titleIcon && <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/60 text-primary sm:h-9 sm:w-9">{titleIcon}</span>}
            <span className="break-words">{title}</span>
          </h1>
          {subtitle && <p className="max-w-2xl text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>

      {children}
    </div>
  );
};

export default PageShell;