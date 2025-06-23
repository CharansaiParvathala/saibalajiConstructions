import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardData, getAdminPaymentSummary } from '@/lib/api/api-client';
import { Project, PaymentRequest, User, Vehicle, Driver } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Utility function to safely convert database values to numbers
const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCompletedWork, setTotalCompletedWork] = useState(0);
  const [totalPlannedWork, setTotalPlannedWork] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [expenseData, setExpenseData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [dashboardData, paymentSummaryData] = await Promise.all([
          getAdminDashboardData(),
          getAdminPaymentSummary()
        ]);
        setProjects(dashboardData.projects);
        setPayments(dashboardData.paymentRequests);
        setStatistics(dashboardData.statistics);
        setPaymentSummary(paymentSummaryData);
        // Calculate stats from real data
        const completed = dashboardData.projects.reduce((sum, project) => sum + safeNumber(project.completed_work), 0);
        const planned = dashboardData.projects.reduce((sum, project) => sum + safeNumber(project.total_work), 0);
        setTotalCompletedWork(completed);
        setTotalPlannedWork(planned);
        setTotalPaid(paymentSummaryData.summary.paidAmount);
        setPendingPayments(paymentSummaryData.summary.pendingCount);
        // Prepare expense data for chart (by expense type)
        if (dashboardData.statistics && dashboardData.statistics.expenseTypeAnalysis) {
          setExpenseData(
            dashboardData.statistics.expenseTypeAnalysis.map((item: any) => ({
              name: item.expense_type,
              amount: safeNumber(item.total_amount)
            })).filter((item: any) => item.amount > 0)
          );
        } else {
          setExpenseData([]);
        }
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        setProjects([]);
        setPayments([]);
        setStatistics(null);
        setPaymentSummary(null);
        setTotalCompletedWork(0);
        setTotalPlannedWork(0);
        setTotalPaid(0);
        setPendingPayments(0);
        setExpenseData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getOverallProgress = () => {
    const completed = safeNumber(totalCompletedWork);
    const planned = safeNumber(totalPlannedWork);
    if (planned === 0) return 0;
    const progress = (completed / planned) * 100;
    return Math.round(progress) || 0;
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `₹ ${safeAmount.toLocaleString()}`;
  };

  // Calculate payment status counts for owner
  const pendingPaymentCount = payments.filter(p => ['pending', 'approved', 'scheduled'].includes(p.status)).length;
  const completedPaymentCount = payments.filter(p => p.status === 'paid').length;

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <span>Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('owner.dashboard.title')}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.totalProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.overallProgress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{getOverallProgress()}%</p>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${getOverallProgress()}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.pendingPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingPaymentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.completedPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedPaymentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.totalPaid')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('owner.dashboard.expensesByPurpose')}</CardTitle>
            <CardDescription>
              {t('owner.dashboard.expensesByPurposeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`₹ ${value}`, 'Amount']}
                    labelFormatter={(name) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`}
                  />
                  <Bar dataKey="amount" fill="#8884d8" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{t('owner.dashboard.noExpenseData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('owner.dashboard.monthlyPayments')}</CardTitle>
            <CardDescription>
              {t('owner.dashboard.monthlyPaymentsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {statistics?.monthlyPaymentTrends && statistics.monthlyPaymentTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statistics.monthlyPaymentTrends.map((item: any) => ({
                    name: item.month_name || item.month,
                    amount: safeNumber(item.total_amount)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`₹ ${value}`, 'Amount']}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Bar dataKey="amount" fill="#82ca9d" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{t('owner.dashboard.noMonthlyPaymentData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
