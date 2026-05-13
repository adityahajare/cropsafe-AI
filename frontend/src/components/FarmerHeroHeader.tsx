import heroFarm from "@/assets/hero-farm.jpg";

type FarmerHeroHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  highlights?: Array<{ label: string; value: string }>;
};

const defaultHighlights = [
  { label: "Clear steps", value: "Farmer first" },
  { label: "Real data", value: "Live status" },
  { label: "Fast action", value: "Few taps" },
];

export default function FarmerHeroHeader({
  eyebrow,
  title,
  subtitle,
  action,
  highlights = defaultHighlights,
}: FarmerHeroHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-b-[32px] text-white shadow-[0_18px_45px_rgba(4,120,87,0.28)]">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroFarm})` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-emerald-950/80 to-emerald-900/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-950/45 to-transparent" />

      <div className="relative mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 pb-7 pt-6">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[30px] font-black leading-tight tracking-tight sm:text-[34px]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-emerald-50/95">{subtitle}</p>}
        </div>

        {action && (
          <div className="rounded-2xl border border-white/15 bg-white/10 p-2 text-white shadow-sm backdrop-blur-md">
            {action}
          </div>
        )}
      </div>

      {highlights.length > 0 && (
        <div className="relative mx-auto max-w-5xl px-4 pb-5">
          <div className={`grid gap-2 rounded-[24px] border border-white/10 bg-white/8 p-2 backdrop-blur-md ${highlights.length === 1 ? "grid-cols-1" : highlights.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {highlights.slice(0, 3).map((item) => (
            <div key={item.label} className="rounded-2xl bg-black/10 px-3 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/80">{item.label}</p>
              <p className="mt-1 text-xs font-bold text-white">{item.value}</p>
            </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
