import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  getAllProjects, 
  getAllPaymentRequests, 
  getAllUsers, 
  getAllVehicles,
  getLeaderProgressStats
} from '@/lib/storage';
import { Project, PaymentRequest, User, Vehicle, LeaderProgressStats } from '@/lib/types';
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
import { Clock, Percent, MapPin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [leaderStats, setLeaderStats] = useState<LeaderProgressStats[]>([]);
  
  // Stats
  const [totalCompletedWork, setTotalCompletedWork] = useState(0);
  const [totalPlannedWork, setTotalPlannedWork] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  
  // Charts data
  const [userRolesData, setUserRolesData] = useState<any[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch all data
    const allProjects = getAllProjects();
    setProjects(allProjects);
    
    const allPayments = getAllPaymentRequests();
    setPayments(allPayments);
    
    const allUsers = getAllUsers();
    setUsers(allUsers);
    
    const allVehicles = getAllVehicles();
    setVehicles(allVehicles);
    
    // Get leader progress stats
    const stats = getLeaderProgressStats();
    setLeaderStats(stats);
    
    // Calculate stats
    const completed = allProjects.reduce((sum, project) => sum + project.completedWork, 0);
    const planned = allProjects.reduce((sum, project) => sum + project.totalWork, 0);
    setTotalCompletedWork(completed);
    setTotalPlannedWork(planned);
    
    const paidAmount = allPayments
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);
    setTotalPaid(paidAmount);
    
    const pendingCount = allPayments
      .filter(payment => payment.status === 'pending' || payment.status === 'approved')
      .length;
    setPendingPayments(pendingCount);
    
    // Prepare chart data
    const roleCount = allUsers.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    setUserRolesData(
      Object.entries(roleCount).map(([role, count]) => ({
        name: role,
        value: count
      }))
    );
    
    // Project status data
    const completedProjects = allProjects.filter(p => 
      p.completedWork >= p.totalWork
    ).length;
    
    const inProgressProjects = allProjects.filter(p => 
      p.completedWork > 0 && p.completedWork < p.totalWork
    ).length;
    
    const notStartedProjects = allProjects.filter(p => 
      p.completedWork === 0
    ).length;
    
    setProjectStatusData([
      { name: "Completed", value: completedProjects },
      { name: "In Progress", value: inProgressProjects },
      { name: "Not Started", value: notStartedProjects }
    ].filter(item => item.value > 0));
    
  }, []);
  
  const getOverallProgress = () => {
    if (totalPlannedWork === 0) return 0;
    return Math.round((totalCompletedWork / totalPlannedWork) * 100);
  };

  const formatTime = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };
  
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
            <p className="text-3xl font-bold">₹ {totalPaid.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">{pendingPayments} {t("app.admin.dashboard.pending")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Team Leaders Progress Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{t("app.admin.dashboard.teamLeadersProgress")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leaderStats.map(leader => (
            <Card key={leader.leaderId}>
              <CardHeader>
                <CardTitle>{leader.leaderName}</CardTitle>
                <CardDescription>
                  {leader.projectCount} {t("app.admin.dashboard.projects")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Percent size={16} className="mr-2 text-muted-foreground" />
                      <span>{t("app.admin.dashboard.progress")}:</span>
                    </div>
                    <span className="font-medium">{leader.completionPercentage}%</span>
                  </div>
                  <Progress value={leader.completionPercentage} />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">{t("app.admin.dashboard.distance")}</div>
                      <div className="font-medium">{leader.totalDistance} {t("app.admin.dashboard.meters")}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">{t("app.admin.dashboard.timeSpent")}</div>
                      <div className="font-medium">{formatTime(leader.totalTime)}</div>
                    </div>
                  </div>
                </div>
                
                {leader.recentUpdates.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">{t("app.admin.dashboard.latestUpdate")}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(leader.recentUpdates[0].date).toLocaleDateString()}:
                      {' '}{leader.recentUpdates[0].completedWork} {t("app.admin.dashboard.meters")} {t("app.admin.dashboard.in")} {leader.recentUpdates[0].timeTaken} {t("app.admin.dashboard.hours")}
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
