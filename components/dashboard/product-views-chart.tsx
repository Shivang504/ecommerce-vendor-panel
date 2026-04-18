'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProductViewsChartProps {
  data: Array<{
    category: string;
    percentage: number;
  }>;
}

const COLORS = ['#7c3aed', '#ec4899', '#f97316', '#eab308', '#06b6d4'];

export function ProductViewsChart({ data }: ProductViewsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, percentage }) => `${category} ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="percentage"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
