import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminDashboardData,
  getAdminUsers,
  getAdminProjects,
  getAdminVehicles,
  getAdminDrivers,
  getAdminPaymentRequests,
  getAdminPaymentSummary,
  getAdminStatistics
} from '@/lib/api/api-client';
import { Project, PaymentRequest, User, Vehicle, Driver } from '@/lib/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Clock, Percent, MapPin, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Utility function to safely convert database values to numbers
const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [totalCompletedWork, setTotalCompletedWork] = useState(0);
  const [totalPlannedWork, setTotalPlannedWork] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  
  // Charts data
  const [userRolesData, setUserRolesData] = useState<any[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all data from MySQL database
        const [dashboardData, paymentSummaryData] = await Promise.all([
          getAdminDashboardData(),
          getAdminPaymentSummary()
        ]);
        
        setUsers(dashboardData.users);
        setProjects(dashboardData.projects);
        setVehicles(dashboardData.vehicles);
        setDrivers(dashboardData.drivers);
        setPayments(dashboardData.paymentRequests);
        setStatistics(dashboardData.statistics);
        setPaymentSummary(paymentSummaryData);
    
        // Calculate stats from real data
        const completed = dashboardData.projects.reduce((sum, project) => sum + safeNumber(project.completed_work), 0);
        const planned = dashboardData.projects.reduce((sum, project) => sum + safeNumber(project.total_work), 0);
    setTotalCompletedWork(completed);
    setTotalPlannedWork(planned);
    
        // Use payment summary data for accurate calculations
        setTotalPaid(paymentSummaryData.summary.paidAmount);
        // Calculate payment status counts for admin
        const pendingPaymentCount = payments.filter(p => ['pending', 'approved', 'scheduled'].includes(p.status)).length;
        
        // Debug logging
        console.log('Admin Dashboard Data:', {
          projects: dashboardData.projects.length,
          completedWork: completed,
          plannedWork: planned,
          paymentRequests: dashboardData.paymentRequests.length,
          paymentSummary: paymentSummaryData.summary,
          paymentStatuses: paymentSummaryData.paymentRequests.map((p: any) => ({ 
            id: p.id, 
            status: p.status, 
            amount: p.total_amount 
          })),
          rawPaymentAmounts: paymentSummaryData.paymentRequests.map((p: any) => ({
            id: p.id,
            status: p.status,
            rawAmount: p.total_amount,
            parsedAmount: parseFloat(p.total_amount) || 0
          }))
        });
    
        // Prepare chart data from real data
        const roleCount = dashboardData.users.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    setUserRolesData(
      Object.entries(roleCount).map(([role, count]) => ({
            name: role.charAt(0).toUpperCase() + role.slice(1),
        value: count
      }))
    );
    
        // Project status data from real data
        const completedProjects = dashboardData.projects.filter(p => 
          safeNumber(p.completed_work) >= safeNumber(p.total_work) && safeNumber(p.total_work) > 0
    ).length;
    
        const inProgressProjects = dashboardData.projects.filter(p => 
          safeNumber(p.completed_work) > 0 && safeNumber(p.completed_work) < safeNumber(p.total_work)
    ).length;
    
        const notStartedProjects = dashboardData.projects.filter(p => 
          safeNumber(p.completed_work) === 0
    ).length;
    
    setProjectStatusData([
      { name: "Completed", value: completedProjects },
      { name: "In Progress", value: inProgressProjects },
      { name: "Not Started", value: notStartedProjects }
    ].filter(item => item.value > 0));
    
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
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

  const formatTime = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
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
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.dashboard.title")}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("app.admin.dashboard.users")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users.length}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{users.filter(u => u.role === 'leader').length} {t("app.admin.dashboard.leaders")}</Badge>
              <Badge>{users.filter(u => u.role === 'checker').length} {t("app.admin.dashboard.checkers")}</Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/admin/credentials')}>
              {t("app.admin.dashboard.manageUsers")}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("app.admin.dashboard.projects")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projects.length}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">{getOverallProgress()}% {t("app.admin.dashboard.overallProgress")}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("app.admin.dashboard.vehicles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vehicles.length}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/admin/vehicles')}>
              {t("app.admin.dashboard.manageVehicles")}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("app.admin.dashboard.payments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹ {paymentSummary?.summary?.totalAmount?.toLocaleString() || 0}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                {pendingPaymentCount} {t("app.admin.dashboard.pending")} • 
                ₹ {Math.round(totalPaid).toLocaleString()} paid
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Team Leaders Progress Section */}
      {statistics?.userActivity && (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{t("app.admin.dashboard.teamLeadersProgress")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statistics.userActivity
              .filter((leader: any) => leader.user_role === 'leader')
              .slice(0, 6)
              .map((leader: any) => (
                <Card key={leader.user_id}>
              <CardHeader>
                    <CardTitle>{leader.user_name}</CardTitle>
                <CardDescription>
                      {leader.projects_worked_on} {t("app.admin.dashboard.projects")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Percent size={16} className="mr-2 text-muted-foreground" />
                      <span>{t("app.admin.dashboard.progress")}:</span>
                    </div>
                        <span className="font-medium">{safeNumber(leader.avg_completion_percentage)}%</span>
                  </div>
                      <Progress value={safeNumber(leader.avg_completion_percentage)} />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">{t("app.admin.dashboard.distance")}</div>
                          <div className="font-medium">{safeNumber(leader.total_work_completed)} {t("app.admin.dashboard.meters")}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <div>
                          <div className="text-xs text-muted-foreground">{t("app.admin.dashboard.updates")}</div>
                          <div className="font-medium">{safeNumber(leader.progress_updates_count)}</div>
                    </div>
                  </div>
                </div>
                
                    {leader.last_activity && (
                  <div>
                        <div className="text-sm font-medium mb-1">{t("app.admin.dashboard.lastActivity")}</div>
                    <div className="text-xs text-muted-foreground">
                          {new Date(leader.last_activity).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  size="sm"
                  onClick={() => navigate('/admin/statistics')}
                >
                  {t("app.admin.dashboard.viewDetailedStats")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.dashboard.userDistribution")}</CardTitle>
            <CardDescription>
              {t("app.admin.dashboard.usersByRole")}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {userRolesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRolesData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userRolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{t("app.admin.dashboard.noUserData")}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.dashboard.projectStatus")}</CardTitle>
            <CardDescription>
              {t("app.admin.dashboard.currentStatus")}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {projectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === 'Completed' ? '#00C49F' : entry.name === 'In Progress' ? '#FFBB28' : '#FF8042'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{t("app.admin.dashboard.noProjectData")}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("app.admin.dashboard.quickActions")}</CardTitle>
            <CardDescription>
              {t("app.admin.dashboard.commonTasks")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{t("app.admin.dashboard.manageUsers")}</CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin/credentials')}
                  >
                    {t("app.admin.dashboard.viewUsers")}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{t("app.admin.dashboard.manageVehicles")}</CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin/vehicles')}
                  >
                    {t("app.admin.dashboard.viewVehicles")}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{t("app.admin.dashboard.manageDrivers")}</CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin/drivers')}
                  >
                    {t("app.admin.dashboard.viewDrivers")}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{t("app.admin.dashboard.viewStatistics")}</CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin/statistics')}
                  >
                    {t("app.admin.dashboard.viewStats")}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
