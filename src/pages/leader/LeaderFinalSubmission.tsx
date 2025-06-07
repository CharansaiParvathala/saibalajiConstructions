import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Upload, Clock, CheckCircle } from 'lucide-react';
import { getProjectsByLeaderId, saveFinalSubmission } from '@/lib/storage';
import { Project, PhotoWithMetadata, FinalSubmission } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const TIMER_STORAGE_KEY = 'final_submission_timer';

const LeaderFinalSubmission = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [completionPhotos, setCompletionPhotos] = useState<PhotoWithMetadata[]>([]);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);

  // Clear any existing timer when component mounts
  useEffect(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    return () => {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const userProjects = getProjectsByLeaderId(user.id);
      // Filter only completed projects
      const completedProjects = userProjects.filter(project => 
        project.completedWork >= project.totalWork
      );
      setProjects(completedProjects);
      
      if (completedProjects.length > 0) {
        setSelectedProject(completedProjects[0].id);
      }
    }
  }, [user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeRemaining > 0) {
      // Store timer state in localStorage
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        startedAt: timerStartedAt,
        remaining: timeRemaining
      }));

      timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setTimerActive(false);
            localStorage.removeItem(TIMER_STORAGE_KEY);
            toast.error("Time's up! You can no longer upload completion photos.");
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerActive(false);
      localStorage.removeItem(TIMER_STORAGE_KEY);
      toast.error("Time's up! You can no longer upload completion photos.");
    }

    // Cleanup function
    return () => {
      clearInterval(timer);
      if (timerActive) {
        // Save timer state when component unmounts
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
          startedAt: timerStartedAt,
          remaining: timeRemaining
        }));
      }
    };
  }, [timerActive, timeRemaining, timerStartedAt]);

  const startCompletionTimer = () => {
    // Clear any existing timer
    localStorage.removeItem(TIMER_STORAGE_KEY);
    
    const startTime = new Date().toISOString();
    setTimerStartedAt(startTime);
    setTimerActive(true);
    setTimeRemaining(600); // Reset to 10 minutes
    toast.success("You have 10 minutes to upload completion photos");
  };

  const handleCompletionPhotoUpload = () => {
    if (!timerActive) {
      toast.error("Please start the timer first to upload completion photos");
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            const photoData: PhotoWithMetadata = {
              dataUrl: reader.result as string,
              timestamp: new Date().toISOString(),
              location: { latitude: 0, longitude: 0 }
            };
            setCompletionPhotos(prev => [...prev, photoData]);
          };
          reader.readAsDataURL(file);
        });
      }
    };
    input.click();
  };

  const handleRemoveCompletionPhoto = (index: number) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedProject || !user) {
      toast.error("Please select a project");
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
      const finalSubmission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: selectedProject,
        leaderId: user.id,
        submissionDate: new Date().toISOString(),
        timerDuration: 600,
        timerStartedAt: timerStartedAt || new Date().toISOString(),
        timerEndedAt: new Date().toISOString(),
        status: 'completed',
        images: completionPhotos,
        notes: notes || undefined
      };

      saveFinalSubmission(finalSubmission);
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

  if (projects.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>No Completed Projects</CardTitle>
            <CardDescription>
              You don't have any completed projects to submit final images for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/leader')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Final Project Submission</h1>
      <p className="text-muted-foreground mb-8">
        Upload final project images for completed projects
      </p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Selection</CardTitle>
            <CardDescription>
              Select a completed project to upload final images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedProject && !timerActive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Ready to Upload Final Images
              </CardTitle>
              <CardDescription>
                You'll have 10 minutes to upload multiple images for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startCompletionTimer} className="w-full">
                Start Photo Upload Timer
              </Button>
            </CardContent>
          </Card>
        )}

        {timerActive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </CardTitle>
              <CardDescription>
                Upload final project images before time runs out
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={(timeRemaining / 600) * 100} className="w-full" />
                <Button onClick={handleCompletionPhotoUpload} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Final Project Images
                </Button>
                {completionPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {completionPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.dataUrl}
                          alt={`Final project photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          onClick={() => handleRemoveCompletionPhoto(index)}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          type="button"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
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

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Add any additional notes about the final project submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={isSubmitting || timerActive || completionPhotos.length === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit Final Project"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LeaderFinalSubmission;
