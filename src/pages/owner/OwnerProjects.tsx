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
import { useNavigate } from 'react-router-dom';

const OwnerProjects = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectLeader, setProjectLeader] = useState<User | null>(null);
  const [projectProgress, setProjectProgress] = useState<ProgressUpdate[]>([]);
  const [projectPayments, setProjectPayments] = useState<PaymentRequest[]>([]);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();
        // Map backend fields to frontend fields
        const mapped = allProjects.map(project => ({
          ...project,
          name: project.title ?? project.name,
          createdAt: project.created_at ?? project.createdAt,
          totalWork: project.total_work ?? project.totalWork,
          completedWork: project.completed_work ?? project.completedWork,
        }));
        setProjects(mapped);
        setFilteredProjects(mapped);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);
  
  // Filter projects based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProjects(projects);
      return;
    }
    const filtered = projects.filter(project => 
      typeof project.name === 'string' && project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);
  
  const handleViewProject = (project: Project) => {
    navigate(`/owner/project-details/${project.id}`);
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
  
  const getCompletedWork = (project: Project) => {
    return projectProgress
      .filter(p => p.project_id === project.id)
      .reduce((sum, p) => sum + Number(p.completed_work || 0), 0);
  };
  
  const getTotalPayments = (project: Project) => {
    return projectPayments
      .filter(payment => payment.projectId == project.id && payment.status === 'paid')
      .reduce((sum, payment) => {
        if (Array.isArray(payment.expenses) && payment.expenses.length > 0) {
          return sum + payment.expenses.reduce((eSum, e) => eSum + Number(e.amount || 0), 0);
        } else {
          return sum + Number(payment.totalAmount || 0);
        }
      }, 0);
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
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-muted-foreground">{t('app.common.loadingProjects', 'Loading projects...')}</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.owner.projects.title', 'Projects')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.owner.projects.description', 'View and monitor all projects and their status.')}
      </p>
      
      <div className="mb-6">
        <Input
          placeholder={t('app.owner.projects.searchPlaceholder', 'Search projects...')}
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
                {t('app.common.createdOn', 'Created on')} {formatDate(project.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('app.owner.projects.completion', 'Completion:')}</span>
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
                    <p className="text-muted-foreground">{t('app.owner.projects.totalWork', 'Total Work:')}</p>
                    <p>{project.totalWork} {t('app.owner.projects.meters', 'meters')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('app.owner.projects.status', 'Status:')}</p>
                    <p>{project.status}</p>
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
                {t('app.common.viewDetails', 'View Details')}
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {filteredProjects.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>{t('app.owner.projects.noProjectsFound', 'No Projects Found')}</CardTitle>
              <CardDescription>
                {t('app.owner.projects.noProjectsMatch', 'No projects match your search criteria.')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OwnerProjects;
