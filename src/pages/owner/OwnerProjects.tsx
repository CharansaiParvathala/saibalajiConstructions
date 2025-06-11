import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjects, getProgressUpdates, getPaymentRequests, getUsers } from '@/lib/api/api-client';
import { Project, ProgressUpdate, PaymentRequest, User } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapView } from '@/components/shared/map-view';

const OwnerProjects = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectLeader, setProjectLeader] = useState<User | null>(null);
  const [projectProgress, setProjectProgress] = useState<ProgressUpdate[]>([]);
  const [projectPayments, setProjectPayments] = useState<PaymentRequest[]>([]);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();
    setProjects(allProjects);
    setFilteredProjects(allProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);
  
  // Filter projects based on search term
  useEffect(() => {
    const filtered = projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);
  
  const handleViewProject = async (project: Project) => {
    setSelectedProject(project);
    
    try {
    // Get project leader
      const users = await getUsers();
      const leader = users.find(u => u.id === project.leaderId);
      setProjectLeader(leader || null);
    
    // Get all progress updates for this project
      const updates = await getProgressUpdates();
      const projectUpdates = updates
        .filter(update => update.projectId === project.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setProjectProgress(projectUpdates);
    
    // Get all payment requests for this project
      const payments = await getPaymentRequests();
      const projectPayments = payments
        .filter(payment => payment.projectId === project.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setProjectPayments(projectPayments);
    
    setShowDialog(true);
    } catch (error) {
      console.error('Error loading project details:', error);
    }
  };
  
  const calculateCompletionPercentage = (project: Project) => {
    if (project.totalWork === 0) return 0;
    return Math.min(100, Math.round((project.completedWork / project.totalWork) * 100));
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const getTotalPayments = (project: Project) => {
    return projectPayments
      .filter(payment => payment.projectId === project.id && payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);
  };
  
  const getPaymentChartData = () => {
    if (!selectedProject) return [];
    
    // Group payments by purpose type
    const purposes = ["food", "fuel", "labour", "vehicle", "water", "other"];
    return purposes.map(purpose => {
      const amount = projectPayments
        .filter(payment => payment.status === 'paid')
        .flatMap(payment => payment.purposes)
        .filter(p => p.type === purpose)
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Only include non-zero values
      return amount > 0 ? { name: purpose, amount } : null;
    }).filter(Boolean); // Filter out null values
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Projects</h1>
      <p className="text-muted-foreground mb-8">
        View and monitor all projects and their status.
      </p>
      
      <div className="mb-6">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                Created on {formatDate(project.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Completion:</span>
                    <span>{calculateCompletionPercentage(project)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${calculateCompletionPercentage(project)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Completed:</p>
                    <p>{project.completedWork} / {project.totalWork} meters</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Paid:</p>
                    <p>₹ {getTotalPayments(project).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleViewProject(project)}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {filteredProjects.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No Projects Found</CardTitle>
              <CardDescription>
                No projects match your search criteria.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      
      {/* Project Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              Project created on {selectedProject && formatDate(selectedProject.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Project Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Total Work:</span> {selectedProject.totalWork} meters</p>
                      <p><span className="font-medium">Completed Work:</span> {selectedProject.completedWork} meters</p>
                      <p><span className="font-medium">Workers:</span> {selectedProject.workers}</p>
                      <p>
                        <span className="font-medium">Completion:</span> {calculateCompletionPercentage(selectedProject)}%
                      </p>
                      <p><span className="font-medium">Project Leader:</span> {projectLeader?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Payment Summary</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Total Expenses:</span> ₹ {getTotalPayments(selectedProject).toLocaleString()}
                      </p>
                      <p>
                        <span className="font-medium">Pending Payments:</span> {projectPayments.filter(p => p.status === 'pending' || p.status === 'approved').length}
                      </p>
                      <p>
                        <span className="font-medium">Completed Payments:</span> {projectPayments.filter(p => p.status === 'paid').length}
                      </p>
                    </div>
                    
                    {projectPayments.length > 0 && getPaymentChartData().length > 0 && (
                      <div className="mt-4 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getPaymentChartData()}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis width={50} />
                            <Tooltip 
                              formatter={(value: any) => [`₹ ${value}`, 'Amount']}
                              labelFormatter={(name) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`}
                            />
                            <Bar dataKey="amount" fill="#8884d8" name="Amount" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-6">
                {projectProgress.length > 0 ? (
                  <div className="space-y-6">
                    {projectProgress.map((progress) => (
                      <Card key={progress.id}>
                        <CardHeader>
                          <CardTitle>{formatDate(progress.date)}</CardTitle>
                          <CardDescription>
                            {progress.completedWork} meters completed in {progress.timeTaken} hours
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                            {progress.photos.slice(0, 4).map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={photo.dataUrl}
                                  alt={`Progress photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                                  {new Date(photo.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {progress.photos.length > 4 && (
                            <p className="text-xs text-muted-foreground mb-4">
                              + {progress.photos.length - 4} more photos
                            </p>
                          )}
                          
                          {progress.notes && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-1">Notes:</p>
                              <p className="text-sm text-muted-foreground">{progress.notes}</p>
                            </div>
                          )}
                          
                          {progress.photos.length > 0 && progress.photos[0].location && (
                            <div>
                              <p className="text-sm font-medium mb-1">Work Location:</p>
                              <div className="h-40">
                                <MapView location={progress.photos[0].location} />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No progress updates recorded for this project.</p>
                )}
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-6">
                {projectPayments.length > 0 ? (
                  <div className="space-y-4">
                    {projectPayments.map((payment) => (
                      <Card key={payment.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>₹ {payment.totalAmount}</CardTitle>
                            {getStatusBadge(payment.status)}
                          </div>
                          <CardDescription>
                            Requested on {formatDate(payment.date)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
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
                            
                            {payment.checkerNotes && (
                              <div>
                                <p className="text-sm font-medium">Checker Notes:</p>
                                <p className="text-sm text-muted-foreground">{payment.checkerNotes}</p>
                              </div>
                            )}
                            
                            {payment.scheduledDate && payment.status === 'scheduled' && (
                              <div>
                                <p className="text-sm font-medium">Payment Scheduled For:</p>
                                <p className="text-sm">{formatDate(payment.scheduledDate)}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No payment requests for this project.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerProjects;
