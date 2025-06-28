import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Project, ProgressUpdate } from '@/lib/types';
import { getProjectById, getProgressUpdates } from '@/lib/api/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { displayImage } from '@/lib/utils/image-utils';
import { Loader2 } from 'lucide-react';

export default function OwnerProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [progressImageUrls, setProgressImageUrls] = useState<{ [progressId: string]: string[] }>({});
  const [meterImageUrls, setMeterImageUrls] = useState<{ [progressId: string]: { start?: string; end?: string } }>({});

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!projectId) {
          throw new Error('Project ID is required');
        }
        const data = await getProjectById(Number(projectId));
        setProject(data);
        const progress = await getProgressUpdates(Number(projectId));
        setProgressUpdates(progress);
        console.log('Fetched progress updates:', progress.length, progress);
        const imageUrls: { [progressId: string]: string[] } = {};
        const meterUrls: { [progressId: string]: { start?: string; end?: string } } = {};
        for (const update of progress) {
          // Meter images
          if (update.start_meter_image_id) {
            meterUrls[update.id] = meterUrls[update.id] || {};
            meterUrls[update.id].start = await displayImage(update.start_meter_image_id, 'progress');
          }
          if (update.end_meter_image_id) {
            meterUrls[update.id] = meterUrls[update.id] || {};
            meterUrls[update.id].end = await displayImage(update.end_meter_image_id, 'progress');
          }
          // Progress images (exclude meter images)
          let filteredImageIds = (update.image_ids || []).filter(
            (id) => id !== update.start_meter_image_id && id !== update.end_meter_image_id
          );
          if (filteredImageIds.length > 0) {
            imageUrls[update.id] = await Promise.all(
              filteredImageIds.map((imgId) => displayImage(imgId, 'progress'))
            );
          } else {
            imageUrls[update.id] = [];
          }
        }
        setProgressImageUrls(imageUrls);
        setMeterImageUrls(meterUrls);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
        <span className="text-muted-foreground">Loading project details...</span>
      </div>
    );
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
              <p>{project.total_work ?? 0} units</p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => navigate(`/owner/payment-queue?projectId=${project.id}`)}
              >
                View Payment Queue
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
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Progress Updates</h2>
        <div className="mb-2 text-sm text-muted-foreground">
          {progressUpdates.length === 1 ? (
            <span>Only one progress update found for this project. (Check if more are expected in the database.)</span>
          ) : (
            <span>{progressUpdates.length} progress updates found for this project.</span>
          )}
        </div>
        {progressUpdates.length === 0 ? (
          <p className="text-muted-foreground">No progress updates found for this project.</p>
        ) : (
          <div className="space-y-4">
            {progressUpdates.map((update) => (
              <Card key={update.id}>
                <CardHeader>
                  <CardTitle>
                    {update.created_at ? new Date(update.created_at).toLocaleDateString() : 'No Date'}
                  </CardTitle>
                  <CardDescription>
                    Status: {update.status}, Completion: {update.completion_percentage}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Completed Work:</span> {update.completed_work}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span> {update.description}
                    </div>
                    {/* Vehicle Info and Meter Images */}
                    {update.vehicle && (
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Vehicle:</span> {update.vehicle.model} ({update.vehicle.type})
                        </div>
                        {/* Start Meter */}
                        {meterImageUrls[update.id]?.start && (
                          <div>
                            <span className="font-medium">Start Meter:</span>
                            <div className="mt-1 mb-2">
                              <img src={meterImageUrls[update.id].start} alt="Start Meter" className="w-32 h-32 object-cover rounded" />
                            </div>
                          </div>
                        )}
                        {/* End Meter */}
                        {meterImageUrls[update.id]?.end && (
                          <div>
                            <span className="font-medium">End Meter:</span>
                            <div className="mt-1 mb-2">
                              <img src={meterImageUrls[update.id].end} alt="End Meter" className="w-32 h-32 object-cover rounded" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Driver Info */}
                    {update.driver && (
                      <div>
                        <span className="font-medium">Driver:</span> {update.driver.name} (License: {update.driver.license_number}, Type: {update.driver.license_type})
                      </div>
                    )}
                    {update.driver_external && (
                      <div>
                        <span className="font-medium">External Driver:</span> {update.driver_external.name} (Type: {update.driver_external.license_type})
                      </div>
                    )}
                    {/* Progress Images (excluding meter images) */}
                    {progressImageUrls[update.id] && progressImageUrls[update.id].length > 0 && (
                      <div>
                        <span className="font-medium">Progress Images:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {progressImageUrls[update.id].map((url, idx) => (
                            <img key={idx} src={url} alt={`Progress ${idx + 1}`} className="w-32 h-32 object-cover rounded" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 