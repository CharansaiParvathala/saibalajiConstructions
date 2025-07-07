import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Project } from '@/lib/types';
import { getProjectById } from '@/lib/api/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function LeaderProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!projectId) {
          throw new Error('Project ID is required');
        }
        const data = await getProjectById(parseInt(projectId, 10));
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project details');
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to fetch project details',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId, toast]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>Project Details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Description</h3>
              <p>{project.description}</p>
            </div>
            <div>
              <h3 className="font-semibold">Status</h3>
              <p>{project.status}</p>
            </div>
            <div>
              <h3 className="font-semibold">Total Work</h3>
              <p>{project.total_work} meters</p>
            </div>
            <div>
              <h3 className="font-semibold">Completed Work</h3>
              <p>{project.completed_work} meters</p>
            </div>
            <div>
              <h3 className="font-semibold">Progress</h3>
              <p>{Math.round((project.completed_work / project.total_work) * 100)}%</p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => navigate(`/leader/add-progress?projectId=${project.id}`)}
              >
                Add Progress
              </Button>
              <Button
                onClick={() => navigate(`/leader/view-progress/${project.id}`)}
              >
                View Progress
              </Button>
              <Button
                onClick={() => navigate(`/leader/request-payment?projectId=${project.id}`)}
              >
                Request Payment
              </Button>
              <Button
                onClick={() => navigate(`/leader/view-payment?projectId=${project.id}`)}
              >
                View Payments
              </Button>
              <Button
                onClick={() => navigate(`/leader/final-submission?projectId=${project.id}`)}
              >
                Final Submission
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 