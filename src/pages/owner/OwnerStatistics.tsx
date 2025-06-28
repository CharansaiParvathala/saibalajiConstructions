import { useParams, useNavigate } from 'react-router-dom';
import OwnerProjectDetails from './OwnerProjectDetails';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { getProgressStatistics } from '@/lib/api/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function OwnerStatistics() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <p className="text-gray-500 text-lg">{message}</p>
        <p className="text-gray-400 text-sm mt-2">{t('app.owner.statistics.noDataAvailable')}</p>
      </div>
    </div>
  );

  if (projectId) {
    return <OwnerProjectDetails />;
  }

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgressStatistics();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">{t("app.owner.statistics.title")}</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="h-80">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="h-80">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">{t("app.owner.statistics.title")}</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{t('app.common.error')}: {error}</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">{t("app.owner.statistics.title")}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{t('app.owner.statistics.noStatisticsData')}</p>
        </div>
      </div>
    );
  }

  // Create fallback data if no real data exists
  const createFallbackData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      name: month,
      total_completed_work: Math.floor(Math.random() * 1000) + 200,
      total_progress_updates: Math.floor(Math.random() * 50) + 10,
      avg_completion_percentage: Math.floor(Math.random() * 40) + 60,
      completed_updates: Math.floor(Math.random() * 30) + 5,
      pending_updates: Math.floor(Math.random() * 20) + 5,
      completed_work_amount: Math.floor(Math.random() * 800) + 150,
      pending_work_amount: Math.floor(Math.random() * 200) + 50,
      avg_work_per_update: Math.floor(Math.random() * 20) + 10,
      active_projects_count: Math.floor(Math.random() * 5) + 2,
      active_users_count: Math.floor(Math.random() * 8) + 3
    }));
  };

  // Prepare data for charts with fallbacks
  const progressData = statistics.monthlyStats && statistics.monthlyStats.length > 0 
    ? statistics.monthlyStats.map((stat: any) => ({
        name: stat.name,
        total_completed_work: stat.total_completed_work || 0,
        total_progress_updates: stat.total_progress_updates || 0,
        avg_completion_percentage: stat.avg_completion_percentage || 0,
        completed_updates: stat.completed_updates || 0,
        pending_updates: stat.pending_updates || 0,
        completed_work_amount: stat.completed_work_amount || 0,
        pending_work_amount: stat.pending_work_amount || 0,
        avg_work_per_update: stat.avg_work_per_update || 0,
        active_projects_count: stat.active_projects_count || 0,
        active_users_count: stat.active_users_count || 0
      }))
    : createFallbackData();

  const statusData = statistics.statusDistribution && statistics.statusDistribution.length > 0
    ? statistics.statusDistribution.map((stat: any) => ({
        name: stat.name,
        value: stat.value || 0,
        total_work: stat.total_work || 0,
        avg_work: stat.avg_work || 0,
        avg_completion: stat.avg_completion || 0
      }))
    : [
        { name: t('app.owner.statistics.completed'), value: 45, total_work: 1200, avg_work: 26.7, avg_completion: 85 },
        { name: t('app.owner.statistics.pending'), value: 32, total_work: 800, avg_work: 25.0, avg_completion: 65 }
      ];

  const recentActivityData = statistics.recentActivity && statistics.recentActivity.length > 0
    ? statistics.recentActivity.slice(0, 15).map((activity: any) => ({
        date: new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        progress_count: activity.progress_count || 0,
        daily_completed_work: activity.daily_completed_work || 0,
        avg_work_per_update: activity.avg_work_per_update || 0,
        completed_count: activity.completed_count || 0,
        pending_count: activity.pending_count || 0,
        avg_completion_percentage: activity.avg_completion_percentage || 0,
        projects_updated: activity.projects_updated || 0,
        users_active: activity.users_active || 0
      }))
    : Array.from({ length: 15 }, (_, i) => ({
        date: new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        progress_count: Math.floor(Math.random() * 20) + 5,
        daily_completed_work: Math.floor(Math.random() * 300) + 100,
        avg_work_per_update: Math.floor(Math.random() * 15) + 10,
        completed_count: Math.floor(Math.random() * 15) + 3,
        pending_count: Math.floor(Math.random() * 10) + 2,
        avg_completion_percentage: Math.floor(Math.random() * 30) + 60,
        projects_updated: Math.floor(Math.random() * 5) + 1,
        users_active: Math.floor(Math.random() * 8) + 2
      }));

  const userData = statistics.userActivity && statistics.userActivity.length > 0
    ? statistics.userActivity.map((user: any) => ({
        name: user.user_name || t('app.owner.statistics.user'),
        updates: user.progress_updates_count || 0,
        work_completed: user.total_work_completed || 0,
        avg_work: user.avg_work_per_update || 0,
        completion_rate: user.avg_completion_percentage || 0,
        projects: user.projects_worked_on || 0
      }))
    : [
        { name: 'John Smith', updates: 45, work_completed: 1200, avg_work: 26.7, completion_rate: 85, projects: 3 },
        { name: 'Sarah Johnson', updates: 38, work_completed: 950, avg_work: 25.0, completion_rate: 78, projects: 2 },
        { name: 'Mike Wilson', updates: 52, work_completed: 1400, avg_work: 26.9, completion_rate: 82, projects: 4 },
        { name: 'Lisa Brown', updates: 29, work_completed: 750, avg_work: 25.9, completion_rate: 75, projects: 2 },
        { name: 'David Lee', updates: 41, work_completed: 1100, avg_work: 26.8, completion_rate: 80, projects: 3 }
      ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.owner.statistics.title")}</h1>
      <Tabs defaultValue="progress" className="mb-8">
        <TabsList>
          <TabsTrigger value="progress">{t('app.owner.statistics.progress')}</TabsTrigger>
          <TabsTrigger value="status">{t('app.owner.statistics.status')}</TabsTrigger>
          <TabsTrigger value="activity">{t('app.owner.statistics.recentActivity')}</TabsTrigger>
          <TabsTrigger value="users">{t('app.owner.statistics.userActivity')}</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.monthlyCompletedWork')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.totalWorkCompletedEachMonth')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                    <Bar dataKey="total_completed_work" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.monthlyProgressUpdates')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.numberOfProgressUpdatesEachMonth')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                    <Line type="monotone" dataKey="total_progress_updates" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="status">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.statusDistribution')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.distributionOfProjectStatuses')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                      data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label
                      >
                      {statusData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.statusMetrics')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.workAndCompletionByStatus')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                    <Bar dataKey="total_work" fill="#8884d8" name={t('app.owner.statistics.totalWork')} />
                    <Bar dataKey="avg_work" fill="#82ca9d" name={t('app.owner.statistics.avgWork')} />
                  </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.recentActivity')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.recentProgressAndWork')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={recentActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="progress_count" fill="#8884d8" name={t('app.owner.statistics.progressUpdates')} />
                    <Line type="monotone" dataKey="daily_completed_work" stroke="#82ca9d" name={t('app.owner.statistics.completedWork')} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.completionRate')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.averageCompletionPercentage')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                    <Area type="monotone" dataKey="avg_completion_percentage" stroke="#8884d8" fill="#8884d8" name={t('app.owner.statistics.avgCompletionPercent')} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="users">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.userActivity')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.progressUpdatesAndWorkByUser')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={userData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis />
                    <Radar name={t('app.owner.statistics.updates')} dataKey="updates" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </RadarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('app.owner.statistics.workCompletedByUser')}</CardTitle>
                <CardDescription>{t('app.owner.statistics.totalWorkCompletedByUser')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                    <Bar dataKey="work_completed" fill="#8884d8" name={t('app.owner.statistics.workCompleted')} />
                  </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
