import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FullscreenChartWrapper } from '@/components/shared/fullscreen-chart-wrapper';

// Dummy data for demonstration
const progressData = [
  { name: 'Project A', completed: 4000, target: 5000 },
  { name: 'Project B', completed: 3000, target: 4500 },
  { name: 'Project C', completed: 2000, target: 3000 },
  { name: 'Project D', completed: 4500, target: 6000 },
];

const paymentData = [
  { name: 'Food', value: 400 },
  { name: 'Fuel', value: 300 },
  { name: 'Labor', value: 300 },
  { name: 'Vehicle', value: 200 },
  { name: 'Other', value: 100 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const OwnerStatistics = () => {
  const { t } = useLanguage();
  const [fullscreen, setFullscreen] = useState(false);
  const [chartType, setChartType] = useState('bar');

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const handleChartTypeChange = (type: string) => {
    setChartType(type);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('owner.statistics.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('owner.statistics.description')}
      </p>
      
      <Tabs defaultValue="progress" className="mb-8">
        <TabsList>
          <TabsTrigger value="progress">{t('owner.statistics.progress')}</TabsTrigger>
          <TabsTrigger value="payments">{t('owner.statistics.payments')}</TabsTrigger>
          <TabsTrigger value="resources">{t('owner.statistics.resources')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.progressOverview')}</CardTitle>
                <CardDescription>{t('owner.statistics.completedVsTarget')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.progressOverview')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" fill="#8884d8" />
                      <Bar dataKey="target" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.projectCompletionRate')}</CardTitle>
                <CardDescription>{t('owner.statistics.completionPercentage')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.projectCompletionRate')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="target" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.paymentDistribution')}</CardTitle>
                <CardDescription>{t('owner.statistics.paymentCategories')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.paymentDistribution')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.paymentTrends')}</CardTitle>
                <CardDescription>{t('owner.statistics.monthlyPayments')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.paymentTrends')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="target" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.resourceAllocation')}</CardTitle>
                <CardDescription>{t('owner.statistics.resourceDistribution')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.resourceAllocation')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" fill="#8884d8" />
                      <Bar dataKey="target" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('owner.statistics.resourceUtilization')}</CardTitle>
                <CardDescription>{t('owner.statistics.resourceEfficiency')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t('owner.statistics.resourceUtilization')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="target" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </FullscreenChartWrapper>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerStatistics;
