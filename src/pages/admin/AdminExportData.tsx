import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileOutput, Image } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getProjects, getProjectExportData } from '@/lib/api/api-client';
import { useNavigate } from 'react-router-dom';
import { exportProjectDataToPDF } from '@/utils/pdf-export';
import { exportProjectImages } from '@/utils/image-export';
import { Project } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { exportFinalSubmissionImages } from '../../utils/final-submission-image-export';

const AdminExportData = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState({
    image: false,
    projectPdf: false,
    finalImages: false,
    initial: true
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<Project | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customAspectRatio, setCustomAspectRatio] = useState({ width: '', height: '' });

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const allProjects = await getProjects();
        setProjects(allProjects);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };

    if (user?.role === 'admin') {
      loadData();
    }
  }, [t, user]);

  const handleExportProjectPdf = async () => {
    if (!selectedProjectForExport) return;

    try {
      setLoading(prev => ({ ...prev, projectPdf: true }));
      toast.info(t("common.generating"));
      
      // Fetch project-specific data
      const projectData = await getProjectExportData(selectedProjectForExport.id);
      
      // Export to PDF
      await exportProjectDataToPDF(projectData.data);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Project PDF export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, projectPdf: false }));
    }
  };

  const handleExportImages = async () => {
    if (!selectedProject) return;

    try {
      setLoading(prev => ({ ...prev, image: true }));
      toast.info(t("common.generating"));
      
      // Convert aspect ratio string to object
      let aspectRatioObj;
      if (aspectRatio === '16:9') aspectRatioObj = { width: 16, height: 9 };
      else if (aspectRatio === '4:3') aspectRatioObj = { width: 4, height: 3 };
      else if (aspectRatio === '1:1') aspectRatioObj = { width: 1, height: 1 };
      else if (aspectRatio === '3:2') aspectRatioObj = { width: 3, height: 2 };
      else if (aspectRatio === '2:3') aspectRatioObj = { width: 2, height: 3 };
      else if (aspectRatio === '9:16') aspectRatioObj = { width: 9, height: 16 };
      else if (aspectRatio === '21:9') aspectRatioObj = { width: 21, height: 9 };
      else if (aspectRatio === '5:4') aspectRatioObj = { width: 5, height: 4 };
      else if (aspectRatio === '4:5') aspectRatioObj = { width: 4, height: 5 };
      else if (aspectRatio === 'custom' && customAspectRatio.width && customAspectRatio.height) {
        aspectRatioObj = { width: Number(customAspectRatio.width), height: Number(customAspectRatio.height) };
      }

      await exportProjectImages({
        project: selectedProject,
        aspectRatio: aspectRatioObj,
        outputDirectory: 'project_images'
      });

      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Image export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, image: false }));
    }
  };

  const handleExportFinalImages = async () => {
    if (!selectedProject) return;
    try {
      setLoading(prev => ({ ...prev, finalImages: true }));
      toast.info(t("common.generating"));
      let aspectRatioObj;
      if (aspectRatio === '16:9') aspectRatioObj = { width: 16, height: 9 };
      else if (aspectRatio === '4:3') aspectRatioObj = { width: 4, height: 3 };
      else if (aspectRatio === '1:1') aspectRatioObj = { width: 1, height: 1 };
      else if (aspectRatio === '3:2') aspectRatioObj = { width: 3, height: 2 };
      else if (aspectRatio === '2:3') aspectRatioObj = { width: 2, height: 3 };
      else if (aspectRatio === '9:16') aspectRatioObj = { width: 9, height: 16 };
      else if (aspectRatio === '21:9') aspectRatioObj = { width: 21, height: 9 };
      else if (aspectRatio === '5:4') aspectRatioObj = { width: 5, height: 4 };
      else if (aspectRatio === '4:5') aspectRatioObj = { width: 4, height: 5 };
      else if (aspectRatio === 'custom' && customAspectRatio.width && customAspectRatio.height) {
        aspectRatioObj = { width: Number(customAspectRatio.width), height: Number(customAspectRatio.height) };
      }
      await exportFinalSubmissionImages({
        project: selectedProject,
        aspectRatio: aspectRatioObj,
        outputDirectory: 'final_submission_images'
      });
      toast.success(t("common.exportSuccess"));
    } catch (error: any) {
      console.error("Final image export error:", error);
      const errorMsg = (typeof error === 'string') ? error : (error && error.message ? error.message : '');
      if (errorMsg.toLowerCase().includes('no final submission images found')) {
        toast.error('Project not completed: No final submission images found for this project.');
      } else {
        toast.error(t("common.exportError"));
      }
    } finally {
      setLoading(prev => ({ ...prev, finalImages: false }));
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
        {/* Project-Based Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('app.export.projectBasedExport')}</CardTitle>
            <CardDescription>
              {t('app.export.projectBasedExportDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-export">{t('app.export.selectProject')}</Label>
                <Select
                  value={selectedProjectForExport?.id?.toString()}
                  onValueChange={(value) => {
                    const project = projects.find(p => p.id.toString() === value);
                    setSelectedProjectForExport(project || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('app.export.chooseProjectToExport')} />
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
              <Button
                onClick={handleExportProjectPdf}
                disabled={loading.projectPdf || loading.initial || !selectedProjectForExport}
                >
                <FileOutput className="mr-2 h-4 w-4" />
                {loading.projectPdf ? t('common.generating') : t('app.export.exportProjectReport')}
              </Button>
              </div>
          </CardContent>
        </Card>
        {/* Image Export Section */}
          <Card>
            <CardHeader>
            <CardTitle>{t('app.export.imageExport')}</CardTitle>
              <CardDescription>
              Export project images with custom aspect ratios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="project-image-export">{t('app.export.selectProject')}</Label>
                  <Select
                    value={selectedProject?.id?.toString()}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id.toString() === value);
                      setSelectedProject(project || null);
                    }}
                  >
                    <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
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
                      <div className="space-y-2">
                <Label htmlFor="aspect-ratio-select">{t('app.export.aspectRatio')}</Label>
                <Select
                          value={aspectRatio}
                          onValueChange={setAspectRatio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                    <SelectItem value="2:3">2:3</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="21:9">21:9</SelectItem>
                    <SelectItem value="5:4">5:4</SelectItem>
                    <SelectItem value="4:5">4:5</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {aspectRatio === 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <input type="number" min="1" placeholder="Width" value={customAspectRatio.width} onChange={e => setCustomAspectRatio({ ...customAspectRatio, width: e.target.value })} className="border rounded p-1 w-20" />
                    <span>:</span>
                    <input type="number" min="1" placeholder="Height" value={customAspectRatio.height} onChange={e => setCustomAspectRatio({ ...customAspectRatio, height: e.target.value })} className="border rounded p-1 w-20" />
                          </div>
                )}
              </div>
                <Button
                  onClick={handleExportImages}
                  disabled={loading.image || loading.initial || !selectedProject}
                >
                  <Image className="mr-2 h-4 w-4" />
                {loading.image ? t('common.generating') : t('app.export.exportImages')}
              </Button>
              <Button
                onClick={handleExportFinalImages}
                disabled={loading.finalImages || loading.initial || !selectedProject}
                variant="secondary"
              >
                <Image className="mr-2 h-4 w-4" />
                {loading.finalImages ? t('common.generating') : 'Export Final Images'}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminExportData;
