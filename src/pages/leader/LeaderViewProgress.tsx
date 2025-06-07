import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { getProjectsByLeaderId, getProgressUpdatesByProjectId } from '@/lib/storage';
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
import { MapView } from '@/components/shared/map-view';
import { getVehicleById } from '@/lib/storage';
import { Vehicle } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File } from 'lucide-react';

const LeaderViewProgress = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<ProgressUpdate | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const projects = getProjectsByLeaderId(user?.id || '');
        setProjects(projects);

        if (projects.length > 0) {
          const updates = await getProgressUpdatesByProjectId(projects[0].id);
          setProgressUpdates(updates);
          setSelectedProject(projects[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, t]);
  
  const handleProjectChange = async (projectId: string) => {
    try {
      setLoading(true);
      const updates = await getProgressUpdatesByProjectId(projectId);
      setProgressUpdates(updates);
      setSelectedProject(projectId);
    } catch (error) {
      console.error('Error loading project updates:', error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewProgress = (progress: ProgressUpdate) => {
    setSelectedProgress(progress);
    
    if (progress.vehicleId) {
      const vehicle = getVehicleById(progress.vehicleId);
      setSelectedVehicle(vehicle);
    } else {
      setSelectedVehicle(null);
    }
    
    setShowDialog(true);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const calculateCompletionPercentage = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.totalWork === 0) return 0;
    return Math.min(100, Math.round((project.completedWork / project.totalWork) * 100));
  };
  
  const getGradientByIndex = (index: number) => {
    const gradients = [
      'bg-gradient-to-r from-primary to-secondary',
      'bg-gradient-to-r from-secondary to-primary',
      'bg-gradient-to-r from-amber-500 to-amber-300',
      'bg-gradient-to-r from-amber-300 to-amber-500'
    ];
    return gradients[index];
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.progress.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.progress.description')}
      </p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="project">{t("app.viewProgress.project")}</Label>
          <Select 
            value={selectedProject} 
            onValueChange={handleProjectChange}
            key="project-select"
          >
            <SelectTrigger className="w-full" key="project-trigger">
              <SelectValue placeholder={t("app.viewProgress.selectProject")} />
            </SelectTrigger>
            <SelectContent key="project-content">
              {projects.map((project) => (
                <SelectItem key={`project-${project.id}`} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedProject && (
          <Card className="mb-8" key="project-overview">
            <CardHeader>
              <CardTitle>
                {projects.find(p => p.id === selectedProject)?.name}
              </CardTitle>
              <CardDescription>
                {t('app.progress.overview')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('app.progress.overallCompletion')}:</span>
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
                    <p className="text-sm text-muted-foreground">{t('app.progress.totalWork')}:</p>
                    <p className="text-lg font-medium">
                      {projects.find(p => p.id === selectedProject)?.totalWork} {t('app.progress.meters')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('app.progress.completedWork')}:</p>
                    <p className="text-lg font-medium">
                      {projects.find(p => p.id === selectedProject)?.completedWork} {t('app.progress.meters')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card key="progress-updates">
          <CardHeader>
            <CardTitle>{t('app.progress.updates.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {progressUpdates.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">{t('app.progress.updates.empty.title')}</h3>
                <p className="text-muted-foreground">
                  {t('app.progress.updates.empty.description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {progressUpdates.map((update) => (
                  <Card key={`progress-${update.id}`} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>{formatDate(update.date)}</CardTitle>
                      <CardDescription>
                        {t("app.viewProgress.completedWork")}: {update.completedWork}m
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {update.photos && update.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                          {update.photos.map((photo, index) => (
                            <div key={`photo-${update.id}-${index}`} className="relative">
                              <img
                                src={photo.dataUrl}
                                alt={`${t("app.viewProgress.progressPhoto")} ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {update.remarks && (
                        <p className="mt-4 text-muted-foreground">{update.remarks}</p>
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
            <DialogTitle>{t('app.progress.details.title')}</DialogTitle>
            <DialogDescription>
              {t('app.progress.details.updateFrom')} {selectedProgress && formatDate(selectedProgress.date)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProgress && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('app.progress.details.workInfo')}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">{t('app.progress.details.date')}:</span> {formatDate(selectedProgress.date)}</p>
                    <p><span className="font-medium">{t('app.progress.details.workCompleted')}:</span> {selectedProgress.completedWork} {t('app.progress.meters')}</p>
                    <p><span className="font-medium">{t('app.progress.details.timeTaken')}:</span> {selectedProgress.timeTaken} {t('app.progress.hours')}</p>
                    <p>
                      <span className="font-medium">{t('app.progress.details.workRate')}:</span> {(selectedProgress.completedWork / selectedProgress.timeTaken).toFixed(2)} {t('app.progress.metersPerHour')}
                    </p>
                  </div>
                </div>
                
                {selectedVehicle && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('app.progress.details.vehicleInfo')}</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">{t('app.progress.details.vehicle')}:</span> {selectedVehicle.model}</p>
                      <p><span className="font-medium">{t('app.progress.details.registration')}:</span> {selectedVehicle.registrationNumber}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedProgress.notes && (
                <div>
                  <h3 className="font-semibold mb-2">{t('app.progress.details.notes')}</h3>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <p className="text-sm">{selectedProgress.notes}</p>
                  </div>
                </div>
              )}
              
              <Tabs defaultValue="photos" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="photos">{t('app.progress.details.photos')}</TabsTrigger>
                  <TabsTrigger value="documents">{t('app.progress.details.documents')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="photos">
                  <div>
                    <h3 className="font-semibold mb-2">{t('app.progress.details.progressPhotos')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProgress.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.dataUrl}
                            alt={`${t('app.progress.photo')} ${index + 1}`}
                            className="w-full object-cover rounded-md"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                            {new Date(photo.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedProgress.photos.length > 0 && selectedProgress.photos[0].location && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">{t('app.progress.details.location')}</h3>
                      <MapView location={selectedProgress.photos[0].location} />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="documents">
                  <div>
                    <h3 className="font-semibold mb-2">{t('app.progress.details.attachedDocuments')}</h3>
                    {selectedProgress.documents && selectedProgress.documents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProgress.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center p-3 bg-muted/30 rounded-lg border border-border">
                            <File className="h-8 w-8 mr-3 text-primary" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(doc.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-auto"
                              onClick={() => window.open(doc.dataUrl, '_blank')}
                            >
                              {t('app.progress.details.view')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded-md">
                        {t('app.progress.details.noDocuments')}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {selectedProgress.startMeterReading && selectedProgress.endMeterReading && (
                <div>
                  <h3 className="font-semibold mb-2">{t('app.progress.details.meterReadings')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">{t('app.progress.details.startReading')}:</p>
                      <div className="relative">
                        <img
                          src={selectedProgress.startMeterReading.dataUrl}
                          alt={t('app.progress.details.startMeterReading')}
                          className="w-full max-h-48 object-contain rounded-md"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          {new Date(selectedProgress.startMeterReading.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">{t('app.progress.details.endReading')}:</p>
                      <div className="relative">
                        <img
                          src={selectedProgress.endMeterReading.dataUrl}
                          alt={t('app.progress.details.endMeterReading')}
                          className="w-full max-h-48 object-contain rounded-md"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          {new Date(selectedProgress.endMeterReading.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
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
