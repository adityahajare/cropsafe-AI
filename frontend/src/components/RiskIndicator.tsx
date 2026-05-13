import { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RiskIndicatorProps {
  icon: LucideIcon;
  title: string;
  level: string;
  badge: string;
  value: number;
  description: string;
}

export function RiskIndicator({ icon: Icon, title, level, badge, value, description }: RiskIndicatorProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-warning" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Current Level</span>
          <span className={badge}>{level}</span>
        </div>
        <Progress value={value} className="h-3" />
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
