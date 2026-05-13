interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  badge?: string;
}

export function PageHeader({ title, description, children, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {badge && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {badge}
          </span>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
