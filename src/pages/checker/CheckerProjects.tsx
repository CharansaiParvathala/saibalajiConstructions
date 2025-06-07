
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { getAllProjects, getAllProgressUpdates } from '@/lib/storage';
import { Project, ProgressUpdate } from '@/lib/types';
import { MapView } from '@/components/shared/map-view';

const CheckerProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectProgress, setProjectProgress] = useState<ProgressUpdate[]>([]);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  
  useEffect(() => {
    const allProjects = getAllProjects();
    setProjects(allProjects);
    setFilteredProjects(allProjects);
  }, []);
  
  // Filter projects based on search term
  useEffect(() => {
    const filtered = projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);
  
  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    
    // Get all progress updates for this project
    const updates = getAllProgressUpdates().filter(update => 
      update.projectId === project.id
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setProjectProgress(updates);
    setShowDialog(true);
  };
  
  const calculateCompletionPercentage = (project: Project) => {
    if (project.totalWork === 0) return 0;
    return Math.min(100, Math.round((project.completedWork / project.totalWork) * 100));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Projects</h1>
      <p className="text-muted-foreground mb-8">
        View and monitor all active projects.
      </p>
      
      <div className="mb-6">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                Created on {formatDate(project.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Completion:</span>
                    <span>{calculateCompletionPercentage(project)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${calculateCompletionPercentage(project)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Work:</p>
                    <p>{project.totalWork} meters</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completed:</p>
                    <p>{project.completedWork} meters</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Workers:</p>
                    <p>{project.workers}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleViewProject(project)}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {filteredProjects.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No Projects Found</CardTitle>
              <CardDescription>
                No projects match your search criteria.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      
      {/* Project Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              Project created on {selectedProject && formatDate(selectedProject.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Project Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Total Work:</span> {selectedProject.totalWork} meters</p>
                    <p><span className="font-medium">Completed Work:</span> {selectedProject.completedWork} meters</p>
                    <p><span className="font-medium">Workers:</span> {selectedProject.workers}</p>
                    <p>
                      <span className="font-medium">Completion:</span> {calculateCompletionPercentage(selectedProject)}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Progress Timeline</h3>
                {projectProgress.length > 0 ? (
                  <div className="space-y-4">
                    {projectProgress.map((progress) => (
                      <div key={progress.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{formatDate(progress.date)}</h4>
                          <span className="text-sm">{progress.completedWork} meters completed</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                          {progress.photos.slice(0, 4).map((photo, index) => (
                            <div key={index} className="relative">
                              <img
                                src={photo.dataUrl}
                                alt={`Progress photo ${index + 1}`}
                                className="w-full h-20 object-cover rounded"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {progress.photos.length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            + {progress.photos.length - 4} more photos
                          </p>
                        )}
                        
                        {progress.photos.length > 0 && progress.photos[0].location && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-1">Work Location:</p>
                            <div className="h-40">
                              <MapView location={progress.photos[0].location} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No progress updates recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckerProjects;
