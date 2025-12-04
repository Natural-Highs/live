import {
  ArcElement,
  BarElement,
  CategoryScale,
  type ChartData,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import type React from 'react';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export interface ChartProps {
  type: ChartType;
  data: ChartData<ChartType>;
  options?: ChartOptions<ChartType>;
  className?: string;
}

const Chart: React.FC<ChartProps> = ({ type, data, options, className }) => {
  const defaultOptions: ChartOptions<ChartType> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      ...options?.plugins,
    },
    ...options,
  };

  switch (type) {
    case 'bar':
      return (
        <Bar
          data={data as ChartData<'bar'>}
          options={defaultOptions as ChartOptions<'bar'>}
          className={className}
        />
      );
    case 'line':
      return (
        <Line
          data={data as ChartData<'line'>}
          options={defaultOptions as ChartOptions<'line'>}
          className={className}
        />
      );
    case 'pie':
      return (
        <Pie
          data={data as ChartData<'pie'>}
          options={defaultOptions as ChartOptions<'pie'>}
          className={className}
        />
      );
    case 'doughnut':
      return (
        <Doughnut
          data={data as ChartData<'doughnut'>}
          options={defaultOptions as ChartOptions<'doughnut'>}
          className={className}
        />
      );
    default:
      return null;
  }
};

export default Chart;
