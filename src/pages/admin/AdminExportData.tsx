import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileOutput, Printer, FilePlus, Image } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getProjects, getProgressUpdates } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';
import { 
  exportToPDF, 
  generateProjectPdfReport, 
  exportProjectsToPDF, 
  exportPaymentsToPDF 
} from '@/utils/pdf-export';
import { exportToDocx, generateProjectReport } from '@/utils/docx-export';
import { exportProjectImages } from '@/utils/image-export';
import { Project, ProgressUpdate } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const AdminExportData = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [exportType, setExportType] = useState('projects');
  const [loading, setLoading] = useState({
    word: false,
    pdf: false,
    report: false,
    image: false,
    initial: true
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load projects on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allProjects, allUpdates] = await Promise.all([
          getProjects(),
          getProgressUpdates()
        ]);
        setProjects(allProjects);
        setProgressUpdates(allUpdates);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };

    loadData();
  }, [t]);

  const handleExportDocx = async () => {
    try {
      setLoading(prev => ({ ...prev, word: true }));
      toast.info(t("common.generating"));
      
      // Prepare project data for Word document
      const projectData = projects.map(project => ({
        id: project.id || '',
        name: project.name || '',
        leader: project.leaderId || 'N/A',
        completedWork: project.completedWork || 0,
        totalWork: project.totalWork || 0,
        progress: `${Math.round(((project.completedWork || 0) / (project.totalWork || 1)) * 100)}%`
      }));
      
      // Export projects to Word
      await exportToDocx({
        title: t("app.reports.projectsReport"),
        description: t("app.reports.projectsDescription"),
        data: projectData,
        columns: [
          { key: 'name', header: t("app.reports.projectName") },
          { key: 'completedWork', header: t("app.reports.completed") },
          { key: 'totalWork', header: t("app.reports.total") },
          { key: 'progress', header: t("app.reports.progress") }
        ],
        fileName: `saibalaji_projects_report_${new Date().toISOString().split('T')[0]}.docx`
      });
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Word export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, word: false }));
    }
  };

  const handleExportPdf = async () => {
    try {
      setLoading(prev => ({ ...prev, pdf: true }));
      toast.info(t("common.generating"));
      
      await exportProjectsToPDF(projects);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const handleExportProjectReport = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(prev => ({ ...prev, report: true }));
      toast.info(t("common.generating"));
      
      const projectUpdates = progressUpdates.filter(update => update.projectId === selectedProject.id);
      await generateProjectReport(selectedProject, projectUpdates);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Project report export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, report: false }));
    }
  };

  const handleExportImages = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(prev => ({ ...prev, image: true }));
      toast.info(t("common.generating"));
      
      const projectUpdates = progressUpdates.filter(update => update.projectId === selectedProject.id);
      await exportProjectImages(selectedProject, projectUpdates, aspectRatio);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Image export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, image: false }));
    }
  };

  if (loading.initial) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.export.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.export.description')}
      </p>
      
      <div className="grid gap-6">
        {/* Export Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t('app.export.type.title')}</CardTitle>
            <CardDescription>
              {t('app.export.type.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={exportType}
              onValueChange={setExportType}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="projects"
                  id="projects"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="projects"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileText className="mb-3 h-6 w-6" />
                  <span>{t('app.export.type.projects')}</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem
                  value="project"
                  id="project"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="project"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileOutput className="mb-3 h-6 w-6" />
                  <span>{t('app.export.type.project')}</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        
        {/* Project Selection (for single project exports) */}
        {exportType === 'project' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('app.export.project.title')}</CardTitle>
              <CardDescription>
                {t('app.export.project.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">{t('app.export.project.select')}</Label>
                  <Select
                    value={selectedProject?.id}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id === value);
                      setSelectedProject(project || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('app.export.project.placeholder')} />
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
                
                {/* Image Export Options */}
                <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowImageDialog(true)}
                    >
                      <Image className="mr-2 h-4 w-4" />
                      {t('app.export.image.options')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('app.export.image.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('app.export.image.aspectRatio')}</Label>
                        <RadioGroup
                          value={aspectRatio}
                          onValueChange={setAspectRatio}
                          className="grid grid-cols-3 gap-4"
                        >
                          <div>
                            <RadioGroupItem
                              value="original"
                              id="original"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="original"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              {t('app.export.image.original')}
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="16:9"
                              id="16:9"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="16:9"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              16:9
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="4:3"
                              id="4:3"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="4:3"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              4:3
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('app.export.actions.title')}</CardTitle>
            <CardDescription>
              {t('app.export.actions.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {exportType === 'projects' ? (
              <>
                <Button
                  onClick={handleExportDocx}
                  disabled={loading.word || loading.initial}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {loading.word ? t('common.generating') : t('app.export.actions.word')}
                </Button>
                
                <Button
                  onClick={handleExportPdf}
                  disabled={loading.pdf || loading.initial}
                >
                  <FileOutput className="mr-2 h-4 w-4" />
                  {loading.pdf ? t('common.generating') : t('app.export.actions.pdf')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleExportProjectReport}
                  disabled={loading.report || loading.initial || !selectedProject}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  {loading.report ? t('common.generating') : t('app.export.actions.report')}
                </Button>
                
                <Button
                  onClick={handleExportImages}
                  disabled={loading.image || loading.initial || !selectedProject}
                >
                  <Image className="mr-2 h-4 w-4" />
                  {loading.image ? t('common.generating') : t('app.export.actions.images')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminExportData;
