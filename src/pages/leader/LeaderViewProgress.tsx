import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Project, ProgressUpdate } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File } from 'lucide-react';
import { getProjects, getProgressUpdates, getFinalSubmissions } from '@/lib/api/api-client';
import { useParams } from 'react-router-dom';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';

const LeaderViewProgress = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<ProgressUpdate | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        if (user) {
          const userProjects = await getProjects({ notCompleted: true });
          setProjects(userProjects.filter(project => project.leader_id === Number(user.id)));
          // Only set initial project if available
          let initialProjectId = projectId || (userProjects[0] && userProjects[0].id.toString());
          if (initialProjectId && userProjects.some(p => p.id.toString() === initialProjectId)) {
          setSelectedProject(initialProjectId);
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error(t("common.error"));
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, t, projectId]);
  
  const loadImagesForProgress = async (updates: ProgressUpdate[]) => {
    const newImageUrls: { [key: string]: string } = {};
    
    for (const update of updates) {
      if (update.image_ids && update.image_ids.length > 0) {
        for (const imageId of update.image_ids) {
          const key = `${update.id}-${imageId}`;
          try {
            const imageUrl = await displayImage(imageId, 'progress');
            newImageUrls[key] = imageUrl;
          } catch (error) {
            console.error(`Error loading image ${imageId}:`, error);
          }
        }
      }
    }
    
    setImageUrls(newImageUrls);
  };
  
  // Only load progress updates when a project is selected
  useEffect(() => {
    const fetchProgressUpdates = async () => {
      if (!selectedProject) return;
      try {
        setLoading(true);
        const updates = await getProgressUpdates(Number(selectedProject));
        setProgressUpdates(updates);
        await loadImagesForProgress(updates);
      } catch (error) {
        console.error('Error loading project updates:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    };
    fetchProgressUpdates();
  }, [selectedProject]);
  
  const handleProjectChange = async (projectId: string) => {
    try {
      setLoading(true);
      const updates = await getProgressUpdates(Number(projectId));
      setProgressUpdates(updates);
      setSelectedProject(projectId);
      
      // Load images for the new project's progress updates
      await loadImagesForProgress(updates);
    } catch (error) {
      console.error('Error loading project updates:', error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewProgress = (progress: ProgressUpdate) => {
    setSelectedProgress(progress);
    setShowDialog(true);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const calculateCompletionPercentage = (projectId: string) => {
    const project = projects.find(p => p.id === Number(projectId));
    if (!project || project.total_work === 0) return 0;
    return Math.min(100, Math.round((project.completed_work / project.total_work) * 100));
  };
  
  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        revokeBlobUrl(url);
      });
    };
  }, [imageUrls]);
  
  // Memoize project options for select
  const projectOptions = useMemo(() => projects.map((project) => ({
    value: project.id.toString(),
    label: project.title
  })), [projects]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.viewProgress.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.viewProgress.description')}
      </p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="project">{t('app.viewProgress.project')}</Label>
          {loadingProjects ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            projects.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">{t('app.viewProgress.noProjectsAvailable')}</div>
            ) : (
              <select
                className="w-full p-2 border rounded"
            value={selectedProject} 
                onChange={e => setSelectedProject(e.target.value)}
                disabled={loadingProjects}
          >
                <option value="" disabled>{t('app.viewProgress.selectProject')}</option>
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
              ))}
              </select>
            )
          )}
        </div>
        
        {selectedProject && (
          <Card className="mb-8" key="project-overview">
            <CardHeader>
              <CardTitle>
                {projects.find(p => p.id === Number(selectedProject))?.title}
              </CardTitle>
              <CardDescription>
                {t('app.viewProgress.overview')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('app.viewProgress.overallCompletion')}:</span>
                    <span>{calculateCompletionPercentage(selectedProject)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className="bg-primary h-4 rounded-full" 
                      style={{ width: `${calculateCompletionPercentage(selectedProject)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('app.viewProgress.totalWork')}:</p>
                    <p className="text-lg font-medium">
                      {projects.find(p => p.id === Number(selectedProject))?.total_work} {t('app.viewProgress.meters')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('app.viewProgress.completedWork')}:</p>
                    <p className="text-lg font-medium">
                      {projects.find(p => p.id === Number(selectedProject))?.completed_work} {t('app.viewProgress.meters')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card key="progress-updates">
          <CardHeader>
            <CardTitle>{t('app.viewProgress.updates.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {progressUpdates.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">{t('app.viewProgress.updates.empty.title')}</h3>
                <p className="text-muted-foreground">
                  {t('app.viewProgress.updates.empty.description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {progressUpdates.map((update) => (
                  <Card key={`progress-${update.id}`} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>{formatDate(update.created_at)}</CardTitle>
                      <CardDescription>
                        {t('app.viewProgress.completedWork')}: {update.completed_work}m
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Vehicle and Driver Details */}
                      {update.vehicle && (
                        <div className="mb-2">
                          <div className="font-semibold text-lg">{update.vehicle.model} <span className="text-sm text-muted-foreground">({update.vehicle.type})</span></div>
                          {update.driver_external ? (
                            <div className="text-base">{update.driver_external.name} <span className="italic text-xs">(External Driver)</span></div>
                          ) : update.driver ? (
                            <div className="text-base">{update.driver.name}</div>
                          ) : null}
                        </div>
                      )}
                      {/* Meter Images */}
                      {(update.start_meter_image_id || update.end_meter_image_id) && (
                        <div className="mb-2">
                          {update.start_meter_image_id && (
                            <div className="mb-1">
                              <div className="text-base font-semibold">Start Meter</div>
                              <img
                                src={imageUrls[`${update.id}-${update.start_meter_image_id}`]}
                                alt="Start Meter"
                                className="w-32 h-20 object-cover rounded border"
                                onError={e => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          )}
                          {update.end_meter_image_id && (
                            <div>
                              <div className="text-base font-semibold">End Meter</div>
                              <img
                                src={imageUrls[`${update.id}-${update.end_meter_image_id}`]}
                                alt="End Meter"
                                className="w-32 h-20 object-cover rounded border"
                                onError={e => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Progress Images with subheading, excluding meter images */}
                      {update.image_ids && update.image_ids.filter(id => id !== update.start_meter_image_id && id !== update.end_meter_image_id).length > 0 && (
                        <div className="mt-4">
                          <div className="font-semibold text-lg mb-2">{t('app.viewProgress.progressImages')}</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {update.image_ids.filter(id => id !== update.start_meter_image_id && id !== update.end_meter_image_id).map((imageId, index) => {
                              const imageKey = `${update.id}-${imageId}`;
                              const imageUrl = imageUrls[imageKey];
                              return imageUrl ? (
                                <div key={`photo-${update.id}-${imageId}`} className="relative">
                                  <img
                                    src={imageUrl}
                                    alt={`${t('app.viewProgress.progressPhoto')} ${index + 1}`}
                                    className="w-full h-56 object-cover rounded-lg"
                                    onError={(e) => {
                                      console.error(`Failed to load image ${imageId}`);
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div key={`photo-${update.id}-${imageId}`} className="relative">
                                  <div className="w-full h-56 bg-muted rounded-lg flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Remark/Note with subheading */}
                      {update.description && (
                        <div className="mt-4">
                          <div className="font-semibold text-lg mb-2">{t('app.viewProgress.remark')}</div>
                          <p className="text-base text-muted-foreground">{update.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Progress Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('app.viewProgress.details.title')}</DialogTitle>
            <DialogDescription>
              {t('app.viewProgress.details.updateFrom')} {selectedProgress && formatDate(selectedProgress.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProgress && (
            <div className="space-y-6">
              {/* DEBUG: Show the full selectedProgress object */}
              <pre className="bg-muted/40 p-2 rounded text-xs overflow-x-auto mb-4">
                {JSON.stringify(selectedProgress, null, 2)}
              </pre>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('app.viewProgress.details.workInfo')}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">{t('app.viewProgress.details.date')}:</span> {formatDate(selectedProgress.created_at)}</p>
                    <p><span className="font-medium">{t('app.progress.details.date')}:</span> {formatDate(selectedProgress.created_at)}</p>
                    <p><span className="font-medium">{t('app.progress.details.workCompleted')}:</span> {selectedProgress.completed_work} {t('app.progress.meters')}</p>
                    <p><span className="font-medium">{t('app.progress.details.completion')}:</span> {selectedProgress.completion_percentage}%</p>
                    {/* Vehicle info */}
                    {selectedProgress.vehicle && (
                      <p><span className="font-medium">Vehicle:</span> {selectedProgress.vehicle.model} ({selectedProgress.vehicle.type})</p>
                    )}
                    {/* Driver info: show external if present, else regular */}
                    {selectedProgress.driver_external ? (
                      <p><span className="font-medium">Driver:</span> {selectedProgress.driver_external.name}, License Type: {selectedProgress.driver_external.license_type} <span className="italic">(External)</span></p>
                    ) : selectedProgress.driver && (
                      <p><span className="font-medium">Driver:</span> {selectedProgress.driver.name}, License Type: {selectedProgress.driver.license_type}</p>
                    )}
                  </div>
                </div>
                {/* Meter Images */}
                {(selectedProgress.start_meter_image_id || selectedProgress.end_meter_image_id) && (
                  <div>
                    <h3 className="font-semibold mb-2">Meter Images</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProgress.start_meter_image_id && (
                        <div>
                          <div className="font-bold mb-1">Start Meter</div>
                          <img
                            src={imageUrls[`${selectedProgress.id}-${selectedProgress.start_meter_image_id}`]}
                            alt="Start Meter"
                            className="w-full object-cover rounded-md"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                      {selectedProgress.end_meter_image_id && (
                        <div>
                          <div className="font-bold mb-1">End Meter</div>
                          <img
                            src={imageUrls[`${selectedProgress.id}-${selectedProgress.end_meter_image_id}`]}
                            alt="End Meter"
                            className="w-full object-cover rounded-md"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedProgress.description && (
                <div>
                  <h3 className="font-semibold mb-2">{t('app.progress.details.notes')}</h3>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <p className="text-sm">{selectedProgress.description}</p>
                  </div>
                </div>
              )}
              
              {selectedProgress.image_ids && selectedProgress.image_ids.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{t('app.progress.details.photos')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedProgress.image_ids.map((imageId, index) => {
                      const imageKey = `${selectedProgress.id}-${imageId}`;
                      const imageUrl = imageUrls[imageKey];
                      
                      return imageUrl ? (
                      <div key={index} className="relative">
                        <img
                            src={imageUrl}
                          alt={`${t('app.progress.photo')} ${index + 1}`}
                          className="w-full object-cover rounded-md"
                            onError={(e) => {
                              console.error(`Failed to load image ${imageId}`);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                      </div>
                      ) : (
                        <div key={index} className="relative">
                          <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderViewProgress;
