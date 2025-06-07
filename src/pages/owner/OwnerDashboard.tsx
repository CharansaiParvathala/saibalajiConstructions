import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getAllProjects, getAllPaymentRequests } from '@/lib/storage';
import { Project, PaymentRequest } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);
  const [totalCompletedWork, setTotalCompletedWork] = useState(0);
  const [totalPlannedWork, setTotalPlannedWork] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  
  // Data for the expense chart
  const [expenseData, setExpenseData] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch all projects
    const allProjects = getAllProjects();
    setProjects(allProjects);
    
    // Calculate total work metrics
    const completed = allProjects.reduce((sum, project) => sum + project.completedWork, 0);
    const planned = allProjects.reduce((sum, project) => sum + project.totalWork, 0);
    setTotalCompletedWork(completed);
    setTotalPlannedWork(planned);
    
    // Fetch approved payment requests awaiting owner action
    const payments = getAllPaymentRequests()
      .filter(payment => payment.status === 'approved')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPendingPayments(payments);
    
    // Calculate today's expenses (paid payments)
    const today = new Date().toDateString();
    const todaysExpenses = getAllPaymentRequests()
      .filter(payment => payment.status === 'paid' && new Date(payment.date).toDateString() === today)
      .reduce((sum, payment) => sum + payment.totalAmount, 0);
    setTodayExpenses(todaysExpenses);
    
    // Prepare expense data for chart
    const purposes = ["food", "fuel", "labour", "vehicle", "water", "other"];
    const expensesByPurpose = purposes.map(purpose => {
      const amount = getAllPaymentRequests()
        .filter(payment => payment.status === 'paid')
        .flatMap(payment => payment.purposes)
        .filter(p => p.type === purpose)
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Only include non-zero values
      return { name: purpose, amount };
    }).filter(item => item.amount > 0); // Filter out zero values
    
    setExpenseData(expensesByPurpose);
  }, []);
  
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString()}`;
  };
  
  const getOverallProgress = () => {
    if (totalPlannedWork === 0) return 0;
    return Math.round((totalCompletedWork / totalPlannedWork) * 100);
  };
  
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
            <p className="text-3xl font-bold">{pendingPayments.length}</p>
          </CardContent>
          <CardFooter>
            {pendingPayments.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/owner/payment-queue')}>
                {t('owner.dashboard.viewQueue')}
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('owner.dashboard.todayExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(todayExpenses)}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Purpose</CardTitle>
            <CardDescription>
              Distribution of expenses across different categories
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
                <p className="text-muted-foreground">No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div>
          <h2 className="text-2xl font-bold mb-4">{t('owner.dashboard.pendingApprovals')}</h2>
          {pendingPayments.length > 0 ? (
            <div className="space-y-4">
              {pendingPayments.slice(0, 3).map((payment) => {
                const project = projects.find(p => p.id === payment.projectId);
                return (
                  <Card key={payment.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>{project?.name || t('owner.dashboard.unknownProject')}</span>
                        <span className="text-lg font-normal">{formatCurrency(payment.totalAmount)}</span>
                      </CardTitle>
                      <CardDescription>
                        {t('owner.dashboard.requestedOn')} {new Date(payment.date).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {payment.purposes.map((purpose, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize"
                          >
                            {purpose.type} (₹ {purpose.amount})
                          </span>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate('/owner/payment-queue')}
                      >
                        {t('owner.dashboard.review')}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
              
              {pendingPayments.length > 3 && (
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate('/owner/payment-queue')}
                >
                  {t('owner.dashboard.viewAll')} ({pendingPayments.length}) {t('owner.dashboard.pendingPayments')}
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('owner.dashboard.noPendingPayments')}</CardTitle>
                <CardDescription>
                  {t('owner.dashboard.noPendingPaymentsDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
