import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Upload, Clock, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  getProjects, 
  startFinalSubmissionTimer, 
  uploadFinalSubmissionImages, 
  completeFinalSubmission,
  getTimerStatus,
  getFinalSubmissions,
  getFinalSubmissionDetails
} from '@/lib/api/api-client';
import { Project, PhotoWithMetadata } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const LeaderFinalSubmission = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [completionPhotos, setCompletionPhotos] = useState<PhotoWithMetadata[]>([]);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timerResumed, setTimerResumed] = useState<boolean>(false);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const allProjects = await getProjects();
      // Filter only completed projects (100% work done or at least 95% complete)
      const completedProjects = allProjects.filter(project => 
        project.completed_work >= project.total_work || (project.completed_work / project.total_work) >= 0.95
      );
      setProjects(completedProjects);
      if (completedProjects.length > 0) {
        setSelectedProject(completedProjects[0].id);
        // Only check for active timers for the first project
        await checkForActiveTimersAcrossProjects([completedProjects[0]]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
      setIsLoading(false);
    }
  };

  const checkForActiveTimersAcrossProjects = async (projects: Project[]) => {
    try {
      for (const project of projects) {
        const submissions = await getFinalSubmissions(project.id);
        const activeSubmission = submissions.find(sub => sub.status === 'in_progress');
        
        if (activeSubmission) {
          console.log('Found active timer for project:', project.id);
          setSelectedProject(project.id);
          setCurrentSubmissionId(activeSubmission.id);
          setTimerActive(true);
          
          // Get current timer status
          const timerStatus = await getTimerStatus(activeSubmission.id);
          setTimeRemaining(timerStatus.timeRemaining);
          
          // Check if submission was auto-completed
          if (timerStatus.autoCompleted) {
            setTimerActive(false);
            toast.success(`Timer expired and submission auto-completed with ${timerStatus.imageCount} images`);
            // Redirect to dashboard after short delay
            setTimeout(() => {
              navigate('/leader');
            }, 2000);
            return;
          }
          
          // Load existing images for this submission
          await loadSubmissionImages(activeSubmission.id);
          
          setTimerResumed(true);
          toast.success(`Resumed active timer for project: ${project.title}`);
          break; // Found an active timer, no need to check other projects
        }
      }
    } catch (error) {
      console.error('Error checking for active timers:', error);
    }
  };

  const loadSubmissionImages = async (submissionId: number) => {
    try {
      const submissionDetails = await getFinalSubmissionDetails(submissionId);
      if (submissionDetails.images && submissionDetails.images.length > 0) {
        const photos: PhotoWithMetadata[] = submissionDetails.images.map((img: any) => ({
          dataUrl: img.dataUrl,
          timestamp: img.timestamp,
          location: { latitude: 0, longitude: 0 }
        }));
        setCompletionPhotos(photos);
      }
    } catch (error) {
      console.error('Error loading submission images:', error);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (timerActive && currentSubmissionId) {
      timer = setInterval(async () => {
        try {
          // Check timer status from server
          const timerStatus = await getTimerStatus(currentSubmissionId);
          
          if (timerStatus.status === 'expired') {
            setTimerActive(false);
            setTimeRemaining(0);
            toast.error("Time's up! You can no longer upload completion photos.");
            // Auto-complete final submission if not already completed
            try {
              await completeFinalSubmission(currentSubmissionId, notes);
              toast.success("Final project submission auto-completed after timer expired.");
              setTimeout(() => {
                navigate('/leader');
              }, 1500);
            } catch (error) {
              // Ignore if already completed
            }
            return;
          }
          
          if (timerStatus.status === 'completed' && timerStatus.autoCompleted) {
            setTimerActive(false);
            setTimeRemaining(0);
            toast.success(`Timer expired and submission auto-completed with ${timerStatus.imageCount} images`);
            setTimeout(() => {
              navigate('/leader');
            }, 2000);
            return;
          }
          
          setTimeRemaining(timerStatus.timeRemaining);
          
          if (timerStatus.timeRemaining <= 0) {
            setTimerActive(false);
            toast.error("Time's up! You can no longer upload completion photos.");
            // Auto-complete final submission if not already completed
            try {
              await completeFinalSubmission(currentSubmissionId, notes);
              toast.success("Final project submission auto-completed after timer expired.");
              setTimeout(() => {
                navigate('/leader');
              }, 1500);
            } catch (error) {
              // Ignore if already completed
            }
          }
        } catch (error) {
          console.error('Error checking timer status:', error);
        }
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [timerActive, currentSubmissionId, navigate, notes]);

  const startCompletionTimer = async () => {
    if (!selectedProject || !user) {
      toast.error("Please select a project");
      return;
    }

    try {
      const response = await startFinalSubmissionTimer(selectedProject, parseInt(user.id));
      setCurrentSubmissionId(response.submissionId);
      setTimerActive(true);
      setTimeRemaining(response.timerDuration);
      setTimerResumed(false);
      toast.success("You have 10 minutes to upload completion photos");
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer. Please try again.');
    }
  };

  const handleCompletionPhotoUpload = async () => {
    if (!timerActive || !currentSubmissionId) {
      toast.error("Please start the timer first to upload completion photos");
      return;
    }

    // Check submission status before uploading
    try {
      const timerStatus = await getTimerStatus(currentSubmissionId);
      if (timerStatus.status === 'expired') {
        setTimerActive(false);
        setTimeRemaining(0);
        toast.error("Timer has expired. You can no longer upload images.");
        return;
      }
    } catch (error) {
      console.error('Error checking timer status:', error);
      toast.error('Error checking timer status. Please try again.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        try {
          // Send files directly to the API
          const fileArray = Array.from(files);
          const uploadResponse = await uploadFinalSubmissionImages(currentSubmissionId, fileArray);
          // Reload images from server to get the updated list
          await loadSubmissionImages(currentSubmissionId);
          toast.success(`Uploaded ${uploadResponse.uploadedCount} images successfully`);
        } catch (error) {
          console.error('Error uploading images:', error);
          let errorMessage = 'Failed to upload images. Please try again.';
          if (error instanceof Error) {
            if (error.message.includes('Timer has expired')) {
              errorMessage = 'Timer has expired. You can no longer upload images.';
            } else if (error.message.includes('No active submission found')) {
              errorMessage = 'No active submission found. Please start the timer again.';
            } else if (error.message.includes('Failed to upload images')) {
              errorMessage = 'Server error while uploading images. Please try again.';
            }
          }
          toast.error(errorMessage);
        }
      }
    };
    input.click();
  };

  const handleRemoveCompletionPhoto = async (index: number) => {
    // For now, we'll just remove from local state
    // In a full implementation, you'd want to add a delete endpoint to remove from server
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentSubmissionId || !user) {
      toast.error("Please start the timer first");
      return;
    }

    if (completionPhotos.length === 0) {
      toast.error("Please upload at least one completion photo");
      return;
    }

    if (timerActive) {
      toast.error("Please wait for the timer to finish before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      await completeFinalSubmission(currentSubmissionId, notes);
      toast.success("Final project submission completed successfully");
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/leader');
      }, 1500);
    } catch (error) {
      console.error("Error submitting final project:", error);
      toast.error("Failed to submit final project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoize project options for select
  const projectOptions = useMemo(() => projects.map((project) => ({
    value: project.id.toString(),
    label: `${project.title} - ${project.completed_work}/${project.total_work} completed`
  })), [projects]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && projects.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.finalSubmission.noCompletedProjectsTitle') || 'No Completed Projects'}</CardTitle>
            <CardDescription>
              {t('app.leader.finalSubmission.noCompletedProjects')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/leader')} className="w-full">
              {t('app.leader.finalSubmission.returnToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-1 py-2 sm:px-4 overflow-x-auto">
      <h1 className="text-4xl font-bold mb-6">{t('app.leader.finalSubmission.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.leader.finalSubmission.description')}
      </p>

      <div className="grid gap-3 sm:gap-6 w-full min-w-0">
        <Card className="w-full min-w-0">
          <CardHeader>
            <CardTitle>{t('app.leader.finalSubmission.projectSelection')}</CardTitle>
            <CardDescription>
              {t('app.leader.finalSubmission.selectProjectDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0">
            {loadingProjects ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
            <select
              value={selectedProject || ''}
              onChange={async (e) => {
                const newProjectId = parseInt(e.target.value);
                setSelectedProject(newProjectId);
                setTimerActive(false);
                setTimeRemaining(600);
                setCurrentSubmissionId(null);
                setCompletionPhotos([]);
                setTimerResumed(false);
                await checkForActiveTimersAcrossProjects(projects.filter(p => p.id === newProjectId));
              }}
                className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white min-w-0"
                disabled={timerActive || loadingProjects}
            >
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value} className="truncate">
                    {option.label}
                </option>
              ))}
            </select>
            )}
          </CardContent>
        </Card>

        {selectedProject && !timerActive && (
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                {t('app.leader.finalSubmission.readyToUpload')}
              </CardTitle>
              <CardDescription>
                {t('app.leader.finalSubmission.readyToUploadDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full min-w-0">
              <Button onClick={startCompletionTimer} className="w-full">
                {t('app.leader.finalSubmission.startTimer')}
              </Button>
            </CardContent>
          </Card>
        )}

        {timerActive && (
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {t('app.leader.finalSubmission.timeRemaining', { time: `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` })}
                {timerResumed && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
                    {t('app.leader.finalSubmission.resumed')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('app.leader.finalSubmission.uploadBeforeTimeout')}
                {timerResumed && ` - ${t('app.leader.finalSubmission.timerResumed')}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-1 sm:px-4 w-full min-w-0">
              <div className="space-y-4">
                <Progress value={(timeRemaining / 600) * 100} className="w-full" />
                <Button onClick={handleCompletionPhotoUpload} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('app.leader.finalSubmission.uploadImages')}
                </Button>
                {completionPhotos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full min-w-0">
                    {completionPhotos.map((photo, index) => (
                      <div key={index} className="relative w-full min-w-0">
                        <img
                          src={photo.dataUrl}
                          alt={`Final project photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded max-w-full"
                          style={{ maxWidth: '100%' }}
                        />
                        <button
                          onClick={() => handleRemoveCompletionPhoto(index)}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          type="button"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 break-words w-full min-w-0">
                          {new Date(photo.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full min-w-0">
          <CardHeader>
            <CardTitle>{t('app.leader.finalSubmission.additionalNotes')}</CardTitle>
            <CardDescription>{t('app.leader.finalSubmission.additionalNotesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0">
            <Textarea
              placeholder={t('app.leader.finalSubmission.additionalNotesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] w-full min-w-0 break-words"
            />
          </CardContent>
          <CardFooter className="px-1 sm:px-4 w-full min-w-0">
            <Button 
              onClick={handleSubmit} 
              className="w-full min-w-0"
              disabled={isSubmitting || timerActive || completionPhotos.length === 0}
            >
              {isSubmitting ? t('app.leader.finalSubmission.submitting') : t('app.leader.finalSubmission.submit')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LeaderFinalSubmission;
