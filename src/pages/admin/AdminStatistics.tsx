import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FullscreenChartWrapper } from '@/components/shared/fullscreen-chart-wrapper';

// Dummy data for progress
const progressData = [
  { name: 'Jan', completed: 400, target: 600 },
  { name: 'Feb', completed: 500, target: 700 },
  { name: 'Mar', completed: 650, target: 750 },
  { name: 'Apr', completed: 700, target: 800 },
  { name: 'May', completed: 750, target: 850 },
  { name: 'Jun', completed: 800, target: 900 },
];

// Dummy data for payments
const paymentData = [
  { name: 'Requested', value: 400 },
  { name: 'Approved', value: 300 },
  { name: 'Rejected', value: 50 },
  { name: 'Pending', value: 250 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Dummy data for resource allocation
const resourceData = [
  { name: 'Labor', value: 300 },
  { name: 'Vehicles', value: 200 },
  { name: 'Materials', value: 150 },
  { name: 'Other', value: 50 },
];

const AdminStatistics = () => {
  const { t } = useLanguage();
  const [fullscreen, setFullscreen] = useState(false);
  const [chartType, setChartType] = useState('progress');

  const handleFullscreen = (type: string) => {
    setChartType(type);
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.statistics.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.admin.statistics.description")}
      </p>
      
      <Tabs defaultValue="progress" className="mb-8">
        <TabsList>
          <TabsTrigger value="progress">{t("app.admin.statistics.progress")}</TabsTrigger>
          <TabsTrigger value="payments">{t("app.admin.statistics.payments")}</TabsTrigger>
          <TabsTrigger value="resources">{t("app.admin.statistics.resources")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("app.admin.statistics.progressOverview")}</CardTitle>
                <CardDescription>{t("app.admin.statistics.completedVsTarget")}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t("app.admin.statistics.progressOverview")}>
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
                <CardTitle>{t("app.admin.statistics.monthlyProgress")}</CardTitle>
                <CardDescription>{t("app.admin.statistics.monthlyTrend")}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t("app.admin.statistics.monthlyProgress")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#8884d8" activeDot={{ r: 8 }} />
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
                <CardTitle>{t("app.admin.statistics.paymentStatus")}</CardTitle>
                <CardDescription>{t("app.admin.statistics.paymentDistribution")}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t("app.admin.statistics.paymentStatus")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
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
          </div>
        </TabsContent>
        
        <TabsContent value="resources">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("app.admin.statistics.resourceAllocation")}</CardTitle>
                <CardDescription>{t("app.admin.statistics.resourceDistribution")}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <FullscreenChartWrapper title={t("app.admin.statistics.resourceAllocation")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {resourceData.map((entry, index) => (
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStatistics;
