import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { getProjectsByLeaderId, getAllVehicles, addProgressUpdate, updateProject } from '@/lib/storage';
import { Project, Vehicle, PhotoWithMetadata, ProgressUpdate } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Clock, Percent, Upload, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/language-context';

// Simple component to display progress photos
const ImageDisplay = ({ images, onRemove }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-2">Progress Photos:</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={image.dataUrl}
              alt={`Progress photo ${index + 1}`}
              className="w-full h-24 object-cover rounded"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              type="button"
            >
              ×
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
              {new Date(image.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaderAddProgress = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [useVehicle, setUseVehicle] = useState<boolean>(false);
  const [photos, setPhotos] = useState<PhotoWithMetadata[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedWork, setCompletedWork] = useState<string>('');
  const [timeTaken, setTimeTaken] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [startMeterReading, setStartMeterReading] = useState<PhotoWithMetadata | null>(null);
  const [endMeterReading, setEndMeterReading] = useState<PhotoWithMetadata | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  
  useEffect(() => {
    if (user) {
      const userProjects = getProjectsByLeaderId(user.id);
      setProjects(userProjects);
      
      const allVehicles = getAllVehicles();
      setVehicles(allVehicles);
    }
  }, [user]);
  
  useEffect(() => {
    // Calculate progress percentage
    if (selectedProject && completedWork) {
      const project = projects.find(p => p.id === selectedProject);
      if (project && project.totalWork > 0) {
        const currentCompleted = project.completedWork + parseFloat(completedWork);
        const percentage = Math.min(100, Math.round((currentCompleted / project.totalWork) * 100));
        setProgressPercentage(percentage);
      }
    }
  }, [selectedProject, completedWork, projects]);
  
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    
    if (!completedWork || isNaN(parseFloat(completedWork)) || parseFloat(completedWork) <= 0) {
      toast.error("Please enter valid completed work distance");
      return;
    }
    
    if (!timeTaken || isNaN(parseFloat(timeTaken)) || parseFloat(timeTaken) <= 0) {
      toast.error("Please enter valid time taken");
      return;
    }
    
    if (useVehicle) {
      if (!selectedVehicle) {
        toast.error("Please select a vehicle");
        return;
      }
      
      if (!startMeterReading) {
        toast.error("Please upload start meter reading image");
        return;
      }
      
      if (!endMeterReading) {
        toast.error("Please upload end meter reading image");
        return;
      }
    }
    
    const selectedProjectObj = projects.find(p => p.id === selectedProject);
    if (!selectedProjectObj) {
      toast.error("Selected project not found");
      return;
    }

    // Validate that the new completed work doesn't exceed total work
    const newCompletedWork = selectedProjectObj.completedWork + parseFloat(completedWork);
    if (newCompletedWork > selectedProjectObj.totalWork) {
      toast.error(`Total completed work (${newCompletedWork}m) cannot exceed total work (${selectedProjectObj.totalWork}m)`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create progress update
      const progressData: Omit<ProgressUpdate, 'id'> = {
        projectId: selectedProject,
        date: new Date().toISOString(),
        completedWork: parseFloat(completedWork),
        timeTaken: parseFloat(timeTaken),
        photos: photos || [],
        notes: notes || undefined,
        vehicleId: useVehicle ? selectedVehicle : undefined,
        startMeterReading: useVehicle ? startMeterReading : undefined,
        endMeterReading: useVehicle ? endMeterReading : undefined,
        documents: [] // Empty documents array
      };

      console.log('Submitting progress data:', progressData);
      
      // Add progress update (now async)
      await addProgressUpdate(progressData);
      
      // Update project completion
      const updatedProject = {
        ...selectedProjectObj,
        completedWork: newCompletedWork
      };
      
      console.log('Updating project:', updatedProject);
      updateProject(updatedProject);
      
      toast.success("Progress update submitted successfully");
      
      // Check if project is completed
      if (newCompletedWork >= selectedProjectObj.totalWork) {
        toast.success("Project completed! You can now upload final project images.");
        // Navigate to final submission page
        setTimeout(() => {
          navigate('/leader/final-submission');
        }, 1500);
      } else {
        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/leader');
        }, 1500);
      }
      
    } catch (error) {
      console.error("Error submitting progress:", error);
      toast.error("Failed to submit progress. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const today = new Date().toLocaleDateString();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.progress.add.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.progress.add.description')}
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.progress.add.form.project.label')}</CardTitle>
            <CardDescription>
              {t('app.progress.add.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">{t('app.progress.add.form.project.label')}</Label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('app.progress.add.form.project.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProject && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Current Progress:</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {projects.find(p => p.id === selectedProject)?.completedWork || 0} meters completed
                  </span>
                  <span>
                    {projects.find(p => p.id === selectedProject)?.totalWork || 0} meters total
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Percent size={16} className="mr-2 text-muted-foreground" />
                <Label htmlFor="completedWork">{t('app.progress.add.form.completedWork.label')}</Label>
              </div>
              <Input
                id="completedWork"
                type="number"
                placeholder={t('app.progress.add.form.completedWork.placeholder')}
                min="0.1"
                step="0.01"
                value={completedWork}
                onChange={(e) => setCompletedWork(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-muted-foreground" />
                <Label htmlFor="timeTaken">{t('app.progress.add.form.timeTaken.label')}</Label>
              </div>
              <Input
                id="timeTaken"
                type="number"
                placeholder={t('app.progress.add.form.timeTaken.placeholder')}
                min="0.1"
                step="0.1"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">{t('app.progress.add.form.notes.label')}</Label>
              <Textarea
                id="notes"
                placeholder={t('app.progress.add.form.notes.placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useVehicle"
                checked={useVehicle}
                onChange={() => setUseVehicle(!useVehicle)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="useVehicle">This work used a vehicle</Label>
            </div>
            
            {useVehicle && (
              <div className="space-y-2">
                <Label htmlFor="vehicle">Select Vehicle</Label>
                <Select
                  value={selectedVehicle}
                  onValueChange={setSelectedVehicle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} ({vehicle.registrationNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('app.progress.add.form.photos.label')}</CardTitle>
            <CardDescription>
              {t('app.progress.add.form.photos.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-4">
                <TabsTrigger value="photos">{t('app.progress.add.form.photos.label')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="photos" className="space-y-4">
                <div className="flex justify-center mb-6">
                  <Button onClick={() => {
                    // Use standard file input for now
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const photoData: PhotoWithMetadata = {
                            dataUrl: reader.result as string,
                            timestamp: new Date().toISOString(),
                            location: { latitude: 0, longitude: 0 }
                          };
                          setPhotos(prev => [...prev, photoData]);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}>
                    {t('app.progress.add.form.photos.upload')}
                  </Button>
                </div>
                
                <ImageDisplay images={photos} onRemove={handleRemovePhoto} />
              </TabsContent>
            </Tabs>
            
            {useVehicle && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Vehicle Start Meter Reading:</h3>
                  {!startMeterReading ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const photoData: PhotoWithMetadata = {
                                dataUrl: reader.result as string,
                                timestamp: new Date().toISOString(),
                                location: { latitude: 0, longitude: 0 }
                              };
                              setStartMeterReading(photoData);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full h-32 flex flex-col items-center justify-center"
                    >
                      <span>Upload Start Meter Reading</span>
                    </Button>
                  ) : (
                    <div className="relative">
                      <img
                        src={startMeterReading.dataUrl}
                        alt="Start meter reading"
                        className="w-full max-h-48 object-contain"
                      />
                      <button
                        onClick={() => setStartMeterReading(null)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        type="button"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                        {new Date(startMeterReading.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Vehicle End Meter Reading:</h3>
                  {!endMeterReading ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const photoData: PhotoWithMetadata = {
                                dataUrl: reader.result as string,
                                timestamp: new Date().toISOString(),
                                location: { latitude: 0, longitude: 0 }
                              };
                              setEndMeterReading(photoData);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full h-32 flex flex-col items-center justify-center"
                    >
                      <span>Upload End Meter Reading</span>
                    </Button>
                  ) : (
                    <div className="relative">
                      <img
                        src={endMeterReading.dataUrl}
                        alt="End meter reading"
                        className="w-full max-h-48 object-contain"
                      />
                      <button
                        onClick={() => setEndMeterReading(null)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        type="button"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                        {new Date(endMeterReading.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : t('app.progress.add.submit')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LeaderAddProgress;
