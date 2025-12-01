import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';

interface Props {
  chartData: ChartData<'pie', number[], unknown> | any;
  title?: string;
}

const PieChart: React.FC<Props> = ({ chartData, title = "Pie Chart" }) => {
  // Calculate total for percentage calculations
  const total = useMemo(() => {
    if (!chartData?.datasets?.[0]?.data) return 0;
    return (chartData.datasets[0].data as number[]).reduce((sum, value) => sum + value, 0);
  }, [chartData]);

  return (
    <div className="chart-container">
      <h2 className="text-center font-bold text-[1.5rem] font-inria mb-4">{title}</h2>
      <Pie
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom' as const,
              labels: {
                generateLabels: (chart) => {
                  const data = chart.data;
                  if (data.labels && data.datasets) {
                    const dataset = data.datasets[0];
                    return (data.labels as string[]).map((label, i) => {
                      const value = (dataset.data as number[])[i];
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return {
                        text: `${label}: ${value} (${percentage}%)`,
                        fillStyle: (dataset.backgroundColor as string[])[i],
                        strokeStyle: (dataset.borderColor as string) || 'black',
                        lineWidth: dataset.borderWidth as number || 2,
                        hidden: false,
                        index: i,
                      };
                    });
                  }
                  return [];
                },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = (context.parsed as number) || (context.raw as number) || 0;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
};

export default PieChart;
