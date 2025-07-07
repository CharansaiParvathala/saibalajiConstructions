import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Project, Vehicle, PhotoWithMetadata, ProgressUpdate, Driver } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Clock, Percent, Upload, CheckCircle, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/language-context';
import { getProjects, addProgress, updateProject, getFinalSubmissions, getVehicles, getDrivers } from '@/lib/api/api-client';

// Simple component to display progress photos
const ImageDisplay = ({ images, onRemove, t }: { images: PhotoWithMetadata[], onRemove: (index: number) => void, t: (key: string, params?: any) => string }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-2">{t('app.addProgress.progressPhotos')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((image: PhotoWithMetadata, index: number) => (
          <div key={index} className="relative">
            <img
              src={image.dataUrl}
              alt={t('app.addProgress.progressPhotoAlt', { index: index + 1 })}
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [completedWork, setCompletedWork] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeTaken, setTimeTaken] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [vehicleUsed, setVehicleUsed] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isExternalDriver, setIsExternalDriver] = useState(false);
  const [externalDriverName, setExternalDriverName] = useState('');
  const [externalDriverLicenseType, setExternalDriverLicenseType] = useState('');
  const [externalDriverMobileNumber, setExternalDriverMobileNumber] = useState('');
  const [startMeterImage, setStartMeterImage] = useState<File | null>(null);
  const [endMeterImage, setEndMeterImage] = useState<File | null>(null);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        if (user) {
          const userProjects = await getProjects({ notCompleted: true });
          setProjects(userProjects.filter(project => project.leader_id === Number(user.id)));
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error(t('app.addProgress.error.fetchProjects'));
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [user, t]);
  
  // Fetch final submissions only when a project is selected
  useEffect(() => {
    const checkFinalSubmission = async () => {
      if (selectedProject) {
        try {
          setLoadingProjects(true);
          const finalSubs = await getFinalSubmissions(selectedProject.id);
          const hasCompletedFinal = finalSubs.some(sub => sub.status === 'completed');
          if (hasCompletedFinal) {
            toast.error(t('app.addProgress.error.finalSubmissionCompleted'));
            setSelectedProject(null);
          }
        } catch (error) {
          // Ignore error, just don't block UI
        } finally {
          setLoadingProjects(false);
        }
      }
    };
    checkFinalSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);
  
  // Memoize project options for select
  const projectOptions = useMemo(() => projects.map((project) => ({
    value: project.id.toString(),
    label: project.title
  })), [projects]);
  
  useEffect(() => {
    if (vehicleUsed) {
      getVehicles().then(setVehicles).catch(() => setVehicles([]));
      getDrivers().then(setDrivers).catch(() => setDrivers([]));
    }
  }, [vehicleUsed]);
  
  useEffect(() => {
    // Calculate progress percentage
    if (selectedProject && completedWork) {
      const project = projects.find(p => p.id.toString() === selectedProject.id.toString());
      console.log('Selected project:', project);
      
      if (project) {
        const currentCompleted = Number(project.completed_work || 0) + Number(completedWork);
        const totalWork = Number(project.total_work || 0);
        const percentage = totalWork > 0 ? Math.min(100, Math.round((currentCompleted / totalWork) * 100)) : 0;
        
        console.log('Progress calculation:', {
          currentCompleted,
          totalWork,
          percentage,
          completedWork: Number(completedWork),
          projectCompletedWork: Number(project.completed_work || 0)
        });
        
        setProgressPercentage(percentage);
      }
    }
  }, [selectedProject, completedWork, projects]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
      
      // Create preview URLs
      const newPreviewUrls = files.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[index]);
      return newUrls.filter((_, i) => i !== index);
    });
  };

  const calculateProgress = (project: Project) => {
    const total = Number(project.total_work);
    const completed = Number(project.completed_work);
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    console.log('Progress calculation:', {
      completed,
      total,
      percentage,
      projectId: project.id
    });
    return percentage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    setIsSubmitting(true);
    try {
      const completedWorkNum = Number(completedWork);
      const totalWork = Number(selectedProject.total_work);
      const currentCompleted = Number(selectedProject.completed_work);
      const newCompletedWork = currentCompleted + completedWorkNum;

      console.log('Submitting progress:', {
        currentCompleted,
        totalWork,
        completedWorkNum,
        newCompletedWork,
        percentage: (newCompletedWork / totalWork) * 100,
        projectId: selectedProject.id
      });

      // Validate total work
      if (newCompletedWork > totalWork) {
        toast.error(t('app.addProgress.error.completedWorkExceeds'));
        return;
      }

      const selectedVehicle = vehicles.find(v => v.id.toString() === selectedVehicleId) || null;
      const selectedDriver = drivers.find(d => d.id.toString() === selectedDriverId) || null;

      await addProgress({
        projectId: selectedProject.id,
        completedWork: completedWorkNum,
        description,
        images: selectedImages,
        vehicle_id: vehicleUsed && selectedVehicle ? Number(selectedVehicle.id) : undefined,
        driver_id: vehicleUsed && !isExternalDriver && selectedDriver ? Number(selectedDriver.id) : undefined,
        is_external_driver: vehicleUsed ? isExternalDriver : undefined,
        external_driver_name: vehicleUsed && isExternalDriver ? externalDriverName : undefined,
        external_driver_license_type: vehicleUsed && isExternalDriver ? externalDriverLicenseType : undefined,
        external_driver_mobile_number: vehicleUsed && isExternalDriver ? externalDriverMobileNumber : undefined,
        start_meter_image: vehicleUsed && selectedVehicle && startMeterImage ? startMeterImage : undefined,
        end_meter_image: vehicleUsed && selectedVehicle && endMeterImage ? endMeterImage : undefined,
      });

      // Reset form
      setCompletedWork('');
      setDescription('');
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setSelectedProject(null);
      
      // Refresh projects list
      const updatedProjects = await getProjects();
      setProjects(updatedProjects.filter(project => project.leader_id === Number(user?.id)));

      toast.success(t('app.addProgress.success'));
      
      // Navigate to leader dashboard after short delay
      setTimeout(() => {
        navigate('/leader');
      }, 1500);
    } catch (error) {
      console.error('Error adding progress:', error);
      toast.error(t('app.addProgress.error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartMeterImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setStartMeterImage(e.target.files[0]);
  };
  const handleEndMeterImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setEndMeterImage(e.target.files[0]);
  };

  const selectedVehicle = vehicles.find(v => v.id.toString() === selectedVehicleId) || null;
  const selectedDriver = drivers.find(d => d.id.toString() === selectedDriverId) || null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{t('app.addProgress.title')}</h1>
      
      <div className="w-full max-w-6xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('app.addProgress.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="space-y-4 w-full">
                <div className="w-full">
                  <Label htmlFor="project">{t('app.addProgress.selectProject.label')}</Label>
                  {loadingProjects ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    projects.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">{t('app.addProgress.noProjectsAvailable')}</div>
                    ) : (
                      <select
                        className="w-full p-2 border rounded"
                    value={selectedProject?.id?.toString() || ''}
                        onChange={e => {
                          const project = projects.find(p => p.id.toString() === e.target.value);
              setSelectedProject(project || null);
            }}
                        disabled={loadingProjects}
                      >
                        <option value="" disabled>{t('app.addProgress.selectProject.placeholder')}</option>
                        {projectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                  ))}
                      </select>
                    )
                  )}
                </div>
            
                <div className="w-full">
                  <Label htmlFor="completedWork">Work (meters)</Label>
              <Input
                id="completedWork"
                placeholder="Enter completed work in meters"
                value={completedWork}
                onChange={(e) => setCompletedWork(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="w-full">
                  <Label htmlFor="description">{t('app.addProgress.description.label')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('app.addProgress.description.placeholder')}
            required
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label htmlFor="timeTaken">{t('app.addProgress.timeTaken')}</Label>
              <Input
                id="timeTaken"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
                    placeholder={t('app.addProgress.timeTakenPlaceholder')}
                    required
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label htmlFor="notes">{t('app.addProgress.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('app.addProgress.notesPlaceholder')}
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label>{t('app.addProgress.photos')}</Label>
                  <div className="mt-2">
                    <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                      className="w-full mb-4"
                    />
                    <div className="grid grid-cols-2 gap-4">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative">
                      <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                    onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                            <X size={16} />
                      </button>
                </div>
              ))}
              </div>
                  </div>
                </div>
        </div>

              <div className="w-full flex items-center gap-2">
                <input type="checkbox" id="vehicleUsed" checked={vehicleUsed} onChange={e => setVehicleUsed(e.target.checked)} />
                <Label htmlFor="vehicleUsed">{t('app.addProgress.vehicleUsed')}</Label>
              </div>
              {vehicleUsed && (
                <div className="space-y-4">
                  <div className="w-full">
                    <Label htmlFor="vehicle">{t('app.addProgress.selectVehicle')}</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('app.addProgress.selectVehiclePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label htmlFor="driver">{t('app.addProgress.selectDriver')}</Label>
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('app.addProgress.selectDriverPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>{driver.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="isExternalDriver"
                        checked={isExternalDriver}
                        onChange={e => {
                          setIsExternalDriver(e.target.checked);
                          if (e.target.checked) setSelectedDriverId('');
                        }}
                      />
                      <Label htmlFor="isExternalDriver">{t('app.addProgress.externalDriver')}</Label>
                    </div>
                    {isExternalDriver && (
                      <div className="space-y-2 mt-2">
                        <Input placeholder={t('app.addProgress.driverNamePlaceholder')} value={externalDriverName} onChange={e => setExternalDriverName(e.target.value)} required />
                        <Input placeholder={t('app.addProgress.licenseTypePlaceholder')} value={externalDriverLicenseType} onChange={e => setExternalDriverLicenseType(e.target.value)} required />
                        <Input placeholder={t('app.addProgress.mobileNumberPlaceholder')} value={externalDriverMobileNumber} onChange={e => setExternalDriverMobileNumber(e.target.value)} required />
                      </div>
                    )}
                  </div>
                  {selectedVehicle && (
                    <div className="w-full flex flex-col gap-2">
                      <Label>Starting Point Meter Image</Label>
                      <Input type="file" accept="image/*" onChange={handleStartMeterImage} />
                      <Label>End Meter Image</Label>
                      <Input type="file" accept="image/*" onChange={handleEndMeterImage} />
                    </div>
                  )}
                </div>
              )}

              <Button 
          type="submit"
                className="w-full"
              disabled={isSubmitting}
            >
                {isSubmitting ? t('app.addProgress.submitting') : t('app.addProgress.submit')}
              </Button>
      </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderAddProgress;
