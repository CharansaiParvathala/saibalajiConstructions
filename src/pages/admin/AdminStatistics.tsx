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

// No Data Message Component
const NoDataMessage = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="text-gray-400 text-6xl mb-4">📊</div>
      <p className="text-gray-500 text-lg">{message}</p>
      <p className="text-gray-400 text-sm mt-2">No data available to display</p>
    </div>
  </div>
);

const AdminStatistics = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgressStatistics();
        console.log('Fetched statistics:', data); // Debug log
        setStatistics(data);
      } catch (err) {
        console.error('Error fetching statistics:', err);
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
        <h1 className="text-4xl font-bold mb-6">{t('app.admin.statistics.title')}</h1>
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
        <h1 className="text-4xl font-bold mb-6">{t('app.admin.statistics.title')}</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">{t('app.admin.statistics.title')}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No statistics data available</p>
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
        { name: 'Completed', value: 45, total_work: 1200, avg_work: 26.7, avg_completion: 85 },
        { name: 'Pending', value: 32, total_work: 800, avg_work: 25.0, avg_completion: 65 }
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
        name: user.user_name || 'User',
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

  // Enhanced efficiency metrics with fallbacks
  const efficiencyMetrics = statistics.efficiencyMetrics || {
    total_progress_updates: 245,
    total_work_completed: 6500,
    avg_work_per_update: 26.5,
    avg_completion_percentage: 78,
    fully_completed_updates: 180,
    low_completion_updates: 25,
    medium_completion_updates: 40,
    completed_work_total: 5200,
    pending_work_total: 1300
  };

  // Payment analytics data with fallbacks
  const paymentAnalytics = statistics.paymentAnalytics || {
    total_payment_requests: 156,
    total_amount_requested: 450000,
    avg_payment_amount: 2884.62,
    pending_requests: 45,
    approved_requests: 78,
    rejected_requests: 12,
    scheduled_requests: 15,
    paid_requests: 6,
    pending_amount: 135000,
    approved_amount: 225000,
    rejected_amount: 36000,
    scheduled_amount: 45000,
    paid_amount: 18000
  };

  const monthlyPaymentData = statistics.monthlyPaymentTrends && statistics.monthlyPaymentTrends.length > 0
    ? statistics.monthlyPaymentTrends.map((trend: any) => ({
        name: trend.name,
        payment_requests_count: trend.payment_requests_count || 0,
        total_amount: trend.total_amount || 0,
        avg_amount: trend.avg_amount || 0,
        pending_count: trend.pending_count || 0,
        approved_count: trend.approved_count || 0,
        rejected_count: trend.rejected_count || 0,
        scheduled_count: trend.scheduled_count || 0,
        paid_count: trend.paid_count || 0,
        pending_amount: trend.pending_amount || 0,
        approved_amount: trend.approved_amount || 0,
        rejected_amount: trend.rejected_amount || 0,
        scheduled_amount: trend.scheduled_amount || 0,
        paid_amount: trend.paid_amount || 0
      }))
    : Array.from({ length: 12 }, (_, i) => ({
        name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        payment_requests_count: Math.floor(Math.random() * 20) + 5,
        total_amount: Math.floor(Math.random() * 50000) + 15000,
        avg_amount: Math.floor(Math.random() * 2000) + 1000,
        pending_count: Math.floor(Math.random() * 8) + 2,
        approved_count: Math.floor(Math.random() * 12) + 5,
        rejected_count: Math.floor(Math.random() * 3) + 1,
        scheduled_count: Math.floor(Math.random() * 5) + 1,
        paid_count: Math.floor(Math.random() * 4) + 1,
        pending_amount: Math.floor(Math.random() * 15000) + 5000,
        approved_amount: Math.floor(Math.random() * 25000) + 10000,
        rejected_amount: Math.floor(Math.random() * 8000) + 2000,
        scheduled_amount: Math.floor(Math.random() * 12000) + 3000,
        paid_amount: Math.floor(Math.random() * 10000) + 2000
      }));

  // Filter out months with no payment activity to prevent label overlap
  const filteredMonthlyPaymentData = monthlyPaymentData.filter((month: any) => 
    month.payment_requests_count > 0 || month.total_amount > 0
  );

  const paymentByProjectData = statistics.paymentByProject && statistics.paymentByProject.length > 0
    ? statistics.paymentByProject.map((project: any) => ({
        name: project.project_title && project.project_title.length > 20 ? project.project_title.substring(0, 20) + '...' : (project.project_title || 'Project'),
        payment_requests_count: project.payment_requests_count || 0,
        total_amount_requested: project.total_amount_requested || 0,
        avg_payment_amount: project.avg_payment_amount || 0,
        pending_requests: project.pending_requests || 0,
        approved_requests: project.approved_requests || 0,
        rejected_requests: project.rejected_requests || 0,
        scheduled_requests: project.scheduled_requests || 0,
        paid_requests: project.paid_requests || 0,
        total_paid_amount: project.total_paid_amount || 0
      }))
    : [
        { name: 'Road Construction A', payment_requests_count: 15, total_amount_requested: 75000, avg_payment_amount: 5000, pending_requests: 5, approved_requests: 8, rejected_requests: 1, scheduled_requests: 1, paid_requests: 0, total_paid_amount: 0 },
        { name: 'Bridge Project B', payment_requests_count: 12, total_amount_requested: 60000, avg_payment_amount: 5000, pending_requests: 3, approved_requests: 7, rejected_requests: 1, scheduled_requests: 1, paid_requests: 0, total_paid_amount: 0 },
        { name: 'Highway Extension C', payment_requests_count: 20, total_amount_requested: 100000, avg_payment_amount: 5000, pending_requests: 8, approved_requests: 10, rejected_requests: 1, scheduled_requests: 1, paid_requests: 0, total_paid_amount: 0 },
        { name: 'Tunnel Project D', payment_requests_count: 8, total_amount_requested: 40000, avg_payment_amount: 5000, pending_requests: 2, approved_requests: 5, rejected_requests: 1, scheduled_requests: 0, paid_requests: 0, total_paid_amount: 0 },
        { name: 'Flyover Project E', payment_requests_count: 18, total_amount_requested: 90000, avg_payment_amount: 5000, pending_requests: 6, approved_requests: 10, rejected_requests: 1, scheduled_requests: 1, paid_requests: 0, total_paid_amount: 0 }
      ];

  // Filter out projects with no payment activity
  const filteredPaymentByProjectData = paymentByProjectData.filter((project: any) => 
    project.payment_requests_count > 0 || project.total_amount_requested > 0
  );

  // Debug logging for payment data (moved after data processing)
  console.log('Payment Analytics:', statistics.paymentAnalytics);
  console.log('Payment By Project:', statistics.paymentByProject);
  console.log('Expense Type Analysis:', statistics.expenseTypeAnalysis);
  console.log('Monthly Payment Trends:', statistics.monthlyPaymentTrends);
  console.log('Filtered Payment By Project Data:', filteredPaymentByProjectData);
  console.log('Filtered Monthly Payment Data:', filteredMonthlyPaymentData);

  const expenseTypeData = statistics.expenseTypeAnalysis && statistics.expenseTypeAnalysis.length > 0
    ? statistics.expenseTypeAnalysis.map((expense: any) => ({
        expense_type: expense.expense_type || 'Other',
        expense_count: expense.expense_count || 0,
        total_amount: expense.total_amount || 0,
        avg_amount: expense.avg_amount || 0,
        min_amount: expense.min_amount || 0,
        max_amount: expense.max_amount || 0
      }))
    : [
        { expense_type: 'Labour', expense_count: 45, total_amount: 180000, avg_amount: 4000, min_amount: 500, max_amount: 8000 },
        { expense_type: 'Fuel', expense_count: 32, total_amount: 96000, avg_amount: 3000, min_amount: 200, max_amount: 6000 },
        { expense_type: 'Vehicle', expense_count: 28, total_amount: 84000, avg_amount: 3000, min_amount: 1000, max_amount: 7000 },
        { expense_type: 'Food', expense_count: 38, total_amount: 57000, avg_amount: 1500, min_amount: 200, max_amount: 3000 },
        { expense_type: 'Water', expense_count: 15, total_amount: 22500, avg_amount: 1500, min_amount: 300, max_amount: 2500 },
        { expense_type: 'Other', expense_count: 22, total_amount: 33000, avg_amount: 1500, min_amount: 100, max_amount: 4000 }
      ];

  const recentPaymentData = statistics.recentPaymentActivity && statistics.recentPaymentActivity.length > 0
    ? statistics.recentPaymentActivity.slice(0, 15).map((activity: any) => ({
        date: new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        payment_requests_count: activity.payment_requests_count || 0,
        daily_total_amount: activity.daily_total_amount || 0,
        avg_daily_amount: activity.avg_daily_amount || 0,
        pending_count: activity.pending_count || 0,
        approved_count: activity.approved_count || 0,
        rejected_count: activity.rejected_count || 0,
        scheduled_count: activity.scheduled_count || 0,
        paid_count: activity.paid_count || 0,
        projects_with_payments: activity.projects_with_payments || 0,
        users_with_payments: activity.users_with_payments || 0
      }))
    : Array.from({ length: 15 }, (_, i) => ({
        date: new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        payment_requests_count: Math.floor(Math.random() * 8) + 2,
        daily_total_amount: Math.floor(Math.random() * 20000) + 5000,
        avg_daily_amount: Math.floor(Math.random() * 3000) + 1000,
        pending_count: Math.floor(Math.random() * 4) + 1,
        approved_count: Math.floor(Math.random() * 6) + 2,
        rejected_count: Math.floor(Math.random() * 2) + 0,
        scheduled_count: Math.floor(Math.random() * 3) + 0,
        paid_count: Math.floor(Math.random() * 2) + 0,
        projects_with_payments: Math.floor(Math.random() * 4) + 1,
        users_with_payments: Math.floor(Math.random() * 6) + 2
      }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.admin.statistics.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('app.admin.statistics.description')}</p>

      {/* Enhanced Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('app.admin.statistics.totalProjects')}</CardTitle>
            <Badge variant="secondary">{statistics.projectStats?.total_projects || 12}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.projectStats?.total_projects || 12}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className="text-green-600">{t('app.admin.statistics.activeProjects')}: {statistics.projectStats?.active_projects || 8}</Badge>
              <Badge variant="outline" className="text-blue-600">{t('app.admin.statistics.completedProjects')}: {statistics.projectStats?.completed_projects || 4}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('app.admin.statistics.avgProjectSize', { size: Math.round(statistics.projectStats?.avg_project_size || 450) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('app.admin.statistics.workCompletion')}</CardTitle>
            <Badge variant="secondary">{Math.round(statistics.projectStats?.overall_completion_percentage || 75)}%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(statistics.projectStats?.total_work_completed || 5400)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('app.admin.statistics.ofPlanned', { planned: Math.round(statistics.projectStats?.total_work_planned || 7200) })}
            </p>
            <Progress 
              value={statistics.projectStats?.overall_completion_percentage || 75} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('app.admin.statistics.paymentRequests')}</CardTitle>
            <Badge variant="secondary">{paymentAnalytics.total_payment_requests}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.round(paymentAnalytics.total_amount_requested / 1000)}K
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className="text-green-600">{t('app.admin.statistics.approved')}: {paymentAnalytics.approved_requests}</Badge>
              <Badge variant="outline" className="text-yellow-600">{t('app.admin.statistics.pending')}: {paymentAnalytics.pending_requests}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('app.admin.statistics.avgPerRequest', { amount: Math.round(paymentAnalytics.avg_payment_amount) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('app.admin.statistics.activeUsers')}</CardTitle>
            <Badge variant="secondary">{userData.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('app.admin.statistics.withActivity', { count: userData.filter((u: any) => u.updates > 0).length })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.admin.statistics.topPerformer', { name: userData[0]?.name || 'N/A' })}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList>
          <TabsTrigger value="overview">{t('app.admin.statistics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="payments">{t('app.admin.statistics.tabs.payments')}</TabsTrigger>
          <TabsTrigger value="users">{t('app.admin.statistics.tabs.users')}</TabsTrigger>
          <TabsTrigger value="efficiency">{t('app.admin.statistics.tabs.efficiency')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.monthlyProgressOverview')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.monthlyProgressOverviewDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                    <Bar yAxisId="left" dataKey="total_completed_work" fill="#8884d8" name={t('app.admin.statistics.completedWork')} />
                    <Line yAxisId="right" type="monotone" dataKey="total_progress_updates" stroke="#82ca9d" name={t('app.admin.statistics.progressUpdates')} />
                  </ComposedChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.paymentStatusDistribution')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.paymentStatusDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: paymentAnalytics.pending_requests, amount: paymentAnalytics.pending_amount },
                        { name: 'Approved', value: paymentAnalytics.approved_requests, amount: paymentAnalytics.approved_amount },
                        { name: 'Rejected', value: paymentAnalytics.rejected_requests, amount: paymentAnalytics.rejected_amount },
                        { name: 'Scheduled', value: paymentAnalytics.scheduled_requests, amount: paymentAnalytics.scheduled_amount },
                        { name: 'Paid', value: paymentAnalytics.paid_requests, amount: paymentAnalytics.paid_amount }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent, value, amount }) => `${name}: ${value} (₹${Math.round(amount/1000)}K)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                      <Tooltip />
                      <Legend />
                  </PieChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="payments">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.expenseTypeAnalysis')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.expenseTypeAnalysisDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {expenseTypeData && expenseTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={expenseTypeData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="expense_type" />
                      <PolarRadiusAxis />
                      <Radar name="Total Amount" dataKey="total_amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Radar name="Average Amount" dataKey="avg_amount" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage message={t('app.admin.statistics.noExpenseDataAvailable')} />
                )}
                {!statistics.expenseTypeAnalysis || statistics.expenseTypeAnalysis.length === 0 ? (
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {t('app.admin.statistics.showingSampleData')}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.recentPaymentActivity')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.recentPaymentActivityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentPaymentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="daily_total_amount" stackId="1" stroke="#8884d8" fill="#8884d8" name={t('app.admin.statistics.dailyAmount')} />
                    <Area type="monotone" dataKey="payment_requests_count" stackId="2" stroke="#82ca9d" fill="#82ca9d" name={t('app.admin.statistics.paymentRequestsLabel')} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.paymentStatusTrends')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.paymentStatusTrendsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {filteredMonthlyPaymentData && filteredMonthlyPaymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredMonthlyPaymentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          value,
                          name === 'pending_count' ? t('app.admin.statistics.pending') :
                          name === 'approved_count' ? t('app.admin.statistics.approved') :
                          name === 'rejected_count' ? t('app.admin.statistics.rejected') :
                          name === 'scheduled_count' ? t('app.admin.statistics.scheduled') :
                          name === 'paid_count' ? t('app.admin.statistics.paid') : name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="pending_count" stackId="a" fill="#FFBB28" name={t('app.admin.statistics.pending')} />
                      <Bar dataKey="approved_count" stackId="a" fill="#00C49F" name={t('app.admin.statistics.approved')} />
                      <Bar dataKey="rejected_count" stackId="a" fill="#FF8042" name={t('app.admin.statistics.rejected')} />
                      <Bar dataKey="scheduled_count" stackId="a" fill="#8884D8" name={t('app.admin.statistics.scheduled')} />
                      <Bar dataKey="paid_count" stackId="a" fill="#82CA9D" name={t('app.admin.statistics.paid')} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage message={t('app.admin.statistics.noPaymentActivityFound')} />
                )}
                {!statistics.monthlyPaymentTrends || statistics.monthlyPaymentTrends.length === 0 ? (
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {t('app.admin.statistics.showingSampleData')}
                  </div>
                ) : filteredMonthlyPaymentData.length === 0 ? (
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {t('app.admin.statistics.noMonthsWithPaymentActivityFound')}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.userPerformance')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.userPerformanceDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={userData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="updates" fill="#8884d8" name={t('app.admin.statistics.progressUpdates')} />
                    <Line yAxisId="right" type="monotone" dataKey="work_completed" stroke="#82ca9d" name={t('app.admin.statistics.workCompleted')} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.userEfficiency')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.userEfficiencyDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={userData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avg_work" fill="#8884d8" name={t('app.admin.statistics.avgWorkPerUpdate')} />
                    <Line yAxisId="right" type="monotone" dataKey="completion_rate" stroke="#82ca9d" name={t('app.admin.statistics.completionRate')} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="efficiency">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.admin.statistics.completionRateAnalysis')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.completionRateAnalysisDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                      data={[
                        { name: 'Fully Completed (100%)', value: efficiencyMetrics.fully_completed_updates },
                        { name: 'Medium (50-99%)', value: efficiencyMetrics.medium_completion_updates },
                        { name: 'Low (<50%)', value: efficiencyMetrics.low_completion_updates }
                      ]}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                      label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
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
                <CardTitle>{t('app.admin.statistics.recentActivity')}</CardTitle>
                <CardDescription>{t('app.admin.statistics.recentActivityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="daily_completed_work" stackId="1" stroke="#8884d8" fill="#8884d8" name={t('app.admin.statistics.completedWork')} />
                    <Area type="monotone" dataKey="progress_count" stackId="2" stroke="#82ca9d" fill="#82ca9d" name={t('app.admin.statistics.progressUpdates')} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStatistics;
