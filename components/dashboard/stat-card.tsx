import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string | React.ReactNode;
  gradient?: string;
  trend?: 'up' | 'down';
}

export function StatCard({ title, value, subtitle, icon, gradient = 'from-blue-600 to-blue-400', trend }: StatCardProps) {
  return (
    <Card className={`p-6 bg-gradient-to-br ${gradient} text-white relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-white/70 mt-2 flex items-center gap-1">
              <span>{trend === 'up' ? '📈' : '📉'}</span> {subtitle}
            </p>
          )}
        </div>
        {icon && <div className="text-4xl opacity-70">{icon}</div>}
      </div>
    </Card>
  );
}
