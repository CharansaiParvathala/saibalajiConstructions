import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Project } from '@/lib/types';
import { getProjectById } from '@/lib/api/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function OwnerProjectDetails() {
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
        const data = await getProjectById(projectId);
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
          <CardTitle>{project.name}</CardTitle>
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
              <p>{project.totalWork} units</p>
            </div>
            <div>
              <h3 className="font-semibold">Workers</h3>
              <p>{project.workers.length} workers assigned</p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => navigate(`/owner/payment-queue?projectId=${project.id}`)}
              >
                View Payment Queue
              </Button>
              <Button
                onClick={() => navigate(`/owner/backup-links?projectId=${project.id}`)}
              >
                View Backup Links
              </Button>
              <Button
                onClick={() => navigate(`/owner/statistics?projectId=${project.id}`)}
              >
                View Statistics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 