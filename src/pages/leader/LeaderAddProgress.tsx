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
import { Project, Vehicle, PhotoWithMetadata, ProgressUpdate, Driver } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Clock, Percent, Upload, CheckCircle, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/language-context';
import { getProjects, addProgress, updateProject, getFinalSubmissions, getVehicles, getDrivers } from '@/lib/api/api-client';

// Simple component to display progress photos
const ImageDisplay = ({ images, onRemove }: { images: PhotoWithMetadata[], onRemove: (index: number) => void }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-2">Progress Photos:</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((image: PhotoWithMetadata, index: number) => (
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
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const allProjects = await getProjects();
        if (user) {
          // Filter projects where the user is the leader
          const userProjects = allProjects.filter(project => project.leader_id === Number(user.id));
          // Further filter out projects that are completed or have a completed final submission
          const filteredProjects = [];
          for (const project of userProjects) {
            if (project.completed_work >= project.total_work) continue;
            const finalSubs = await getFinalSubmissions(project.id);
            const hasCompletedFinal = finalSubs.some(sub => sub.status === 'completed');
            if (!hasCompletedFinal) {
              filteredProjects.push(project);
            }
          }
          setProjects(filteredProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to fetch projects');
      }
    };
    fetchProjects();
  }, [user]);
  
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
  
  useEffect(() => {
    if (vehicleUsed) {
      getVehicles().then(setVehicles).catch(() => setVehicles([]));
      getDrivers().then(setDrivers).catch(() => setDrivers([]));
    }
  }, [vehicleUsed]);
  
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
        toast.error('Total completed work cannot exceed total work');
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

      toast.success('Progress added successfully');
      
      // Navigate to leader dashboard after short delay
      setTimeout(() => {
        navigate('/leader');
      }, 1500);
    } catch (error) {
      console.error('Error adding progress:', error);
      toast.error('Failed to add progress');
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
      <h1 className="text-4xl font-bold mb-6">{t('app.progress.add.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.progress.add.description')}
      </p>
      
      <div className="w-full max-w-6xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('app.progress.add.formTitle')}</CardTitle>
            <CardDescription>
              {t('app.progress.add.formDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="space-y-4 w-full">
                <div className="w-full">
                  <Label htmlFor="project">{t('app.progress.add.selectProject')}</Label>
                  <Select
                    value={selectedProject?.id?.toString() || ''}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id.toString() === value);
              setSelectedProject(project || null);
            }}
          >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('app.progress.add.selectProjectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                  {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                {project.title}
                        </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </div>
            
                <div className="w-full">
                  <Label htmlFor="completedWork">{t('app.progress.add.completedWork')}</Label>
              <Input
                id="completedWork"
                type="number"
                value={completedWork}
                onChange={(e) => setCompletedWork(e.target.value)}
                    placeholder={t('app.progress.add.completedWorkPlaceholder')}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="w-full">
                  <Label htmlFor="description">{t('app.progress.add.description')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('app.progress.add.descriptionPlaceholder')}
            required
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label htmlFor="timeTaken">{t('app.progress.add.timeTaken')}</Label>
              <Input
                id="timeTaken"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
                    placeholder={t('app.progress.add.timeTakenPlaceholder')}
                    required
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label htmlFor="notes">{t('app.progress.add.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('app.progress.add.notesPlaceholder')}
                    className="w-full"
              />
            </div>
            
                <div className="w-full">
                  <Label>{t('app.progress.add.photos')}</Label>
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
                <Label htmlFor="vehicleUsed">Vehicle Used</Label>
              </div>
              {vehicleUsed && (
                <div className="space-y-4">
                  <div className="w-full">
                    <Label htmlFor="vehicle">Select Vehicle</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label htmlFor="driver">Select Driver</Label>
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select driver" />
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
                      <Label htmlFor="isExternalDriver">External Driver</Label>
                    </div>
                    {isExternalDriver && (
                      <div className="space-y-2 mt-2">
                        <Input placeholder="Driver Name" value={externalDriverName} onChange={e => setExternalDriverName(e.target.value)} required />
                        <Input placeholder="License Type" value={externalDriverLicenseType} onChange={e => setExternalDriverLicenseType(e.target.value)} required />
                        <Input placeholder="Mobile Number" value={externalDriverMobileNumber} onChange={e => setExternalDriverMobileNumber(e.target.value)} required />
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
                {isSubmitting ? t('app.progress.add.submitting') : t('app.progress.add.submit')}
              </Button>
      </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderAddProgress;
