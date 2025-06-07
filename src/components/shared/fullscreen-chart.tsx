
import React, { useState, ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/language-context';

interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface FullscreenChartProps {
  title: string;
  data?: ChartDataItem[];
  type?: 'pie' | 'bar';
  valueFormatter?: (value: number) => string;
  showZeroValues?: boolean;
  children?: ReactElement;
  onClose?: () => void;
  isOpen?: boolean;
}

export function FullscreenChart({
  title,
  data = [],
  type = 'pie',
  valueFormatter = (value) => `${value}%`,
  showZeroValues = false,
  children,
  onClose,
  isOpen,
}: FullscreenChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(isOpen || false);
  const { t } = useLanguage();

  const toggleFullscreen = () => {
    if (onClose) {
      onClose();
    } else {
      setIsFullscreen(!isFullscreen);
    }
  };

  // If children are provided, render them instead of the built-in charts
  if (children) {
    if (isFullscreen || isOpen) {
      return (
        <div className="chart-fullscreen fixed inset-0 bg-background z-50 flex flex-col p-6">
          <div className="flex justify-between items-center mb-4 w-full">
            <h2 className="text-2xl font-bold">{title}</h2>
            <Button
              variant="outline"
              size="icon"
              className="close-button"
              onClick={toggleFullscreen}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 w-full h-full">
            {children}
          </div>
        </div>
      );
    }

    return (
      <Card className="w-full cursor-pointer" onClick={() => setIsFullscreen(true)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="chart-normal h-80">
          {children}
        </CardContent>
      </Card>
    );
  }

  // Filter out any items with value 0 if showZeroValues is false
  const filteredData = showZeroValues 
    ? data 
    : data.filter(item => item.value > 0);

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#F06292', '#4DB6AC', '#FFB74D', '#A1887F'
  ];

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius="80%"
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, value, cx, x, y }) => {
            return value > 0 ? (
              <text
                x={x}
                y={y}
                fill="#000"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-medium dark:text-white"
              >
                {`${name}: ${valueFormatter(value)}`}
              </text>
            ) : null;
          }}
        >
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => valueFormatter(Number(value))}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => valueFormatter(value)} />
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        <Legend />
        <Bar dataKey="value" name="Value">
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  if (isFullscreen) {
    return (
      <div className="chart-fullscreen fixed inset-0 bg-background z-50 flex flex-col p-6">
        <div className="flex justify-between items-center mb-4 w-full">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Button
            variant="outline"
            size="icon"
            className="close-button"
            onClick={toggleFullscreen}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 w-full h-full">
          {type === 'pie' ? renderPieChart() : renderBarChart()}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full cursor-pointer" onClick={() => setIsFullscreen(true)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="chart-normal">
        {type === 'pie' ? renderPieChart() : renderBarChart()}
      </CardContent>
    </Card>
  );
}
