import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileOutput, Image, FileText, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getProjects, getProjectExportData, getFinalSubmissions, getPaymentRequestsByProjectId, deleteProject } from '@/lib/api/api-client';
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
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [deletableProjects, setDeletableProjects] = useState<Project[]>([]);
  const [selectedDeletableProject, setSelectedDeletableProject] = useState<Project | null>(null);
  const [loadingDeletable, setLoadingDeletable] = useState(false);
  const [downloadingMergedTender, setDownloadingMergedTender] = useState(false);

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

  // Load completed projects
  useEffect(() => {
    const loadCompletedProjects = async () => {
      setLoadingCompleted(true);
      try {
        const allProjects = await getProjects();
        const completed: Project[] = [];
        for (const project of allProjects) {
          // Check for final submission
          const finalSubs = await getFinalSubmissions(project.id);
          const hasCompletedFinal = finalSubs.some((fs: any) => fs.status === 'completed');
          if (!hasCompletedFinal) continue;
          // Check for payment requests with status 'paid' or 'approved'
          const payments = await getPaymentRequestsByProjectId(project.id);
          const hasPaid = payments.some((p: any) => p.status === 'paid' || p.status === 'approved');
          if (hasPaid) completed.push(project);
        }
        setCompletedProjects(completed);
      } catch (err) {
        toast.error(t('common.error'));
      } finally {
        setLoadingCompleted(false);
      }
    };
    if (user?.role === 'admin') loadCompletedProjects();
  }, [user, t]);

  // Load deletable projects (all payment requests must be paid)
  useEffect(() => {
    const loadDeletableProjects = async () => {
      setLoadingDeletable(true);
      try {
        const allProjects = await getProjects();
        const eligible: Project[] = [];
        for (const project of allProjects) {
          const payments = await getPaymentRequestsByProjectId(project.id);
          if (payments.length === 0) continue;
          const allPaid = payments.every((p: any) => p.status === 'paid');
          if (allPaid) eligible.push(project);
        }
        setDeletableProjects(eligible);
      } catch (err) {
        toast.error(t('common.error'));
      } finally {
        setLoadingDeletable(false);
      }
    };
    if (user?.role === 'admin') loadDeletableProjects();
  }, [user, t]);

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
    } catch (error) {
      console.error("Final images export error:", error);
        toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, finalImages: false }));
    }
  };

  // Handle download merged tender PDF
  const handleDownloadMergedTender = async () => {
    setDownloadingMergedTender(true);
    try {
      const res = await fetch('/api/tender/download');
      if (!res.ok) throw new Error('Failed to download merged tender PDF');
      
      // Create blob from response
      const blob = await res.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged-tender-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Merged tender PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download merged tender PDF');
    } finally {
      setDownloadingMergedTender(false);
    }
  };

  const handleDeleteSelectedProject = async () => {
    if (!selectedDeletableProject) return;
    if (!window.confirm(t('app.admin.tender.confirmDeleteProject'))) return;
    try {
      await deleteProject(selectedDeletableProject.id);
      setDeletableProjects(prev => prev.filter(p => p.id !== selectedDeletableProject.id));
      setSelectedDeletableProject(null);
      toast.success(t('app.admin.tender.deleteSuccess'));
    } catch (err) {
      toast.error(t('app.admin.tender.deleteError'));
    }
  };

  if (loading.initial) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return <div className="container mx-auto py-6">Access denied</div>;
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold">{t('app.admin.export.title')}</h1>
        </div>
        <Button 
          onClick={handleDownloadMergedTender} 
          disabled={downloadingMergedTender}
          className="flex items-center gap-2 w-full lg:w-auto"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">
            {downloadingMergedTender ? 'Downloading...' : 'Download Merged Tender PDF'}
          </span>
          <span className="sm:hidden">
            {downloadingMergedTender ? 'Downloading...' : 'Download Tender PDF'}
          </span>
        </Button>
      </div>
      <div className="grid gap-6">
        {/* Deletable Projects Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('app.admin.tender.completedProjects')}</CardTitle>
            <CardDescription>{t('app.admin.tender.completedProjectsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDeletable ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : deletableProjects.length === 0 ? (
              <div className="text-muted-foreground text-center">{t('app.admin.tender.noCompletedProjects')}</div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="deletable-project-select">{t('app.admin.tender.selectProjectToDelete')}</Label>
                <select
                  id="deletable-project-select"
                  className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                  value={selectedDeletableProject?.id || ''}
                  onChange={e => {
                    const project = deletableProjects.find(p => p.id.toString() === e.target.value);
                    setSelectedDeletableProject(project || null);
                  }}
                >
                  <option value="" disabled>{t('app.admin.tender.chooseProjectToDelete')}</option>
                  {deletableProjects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
                {selectedDeletableProject && (
                  <div className="flex items-center justify-between mt-4">
                    <span>{selectedDeletableProject.title}</span>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedProject}>
                      {t('app.admin.tender.deleteProject')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Project-Based Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('app.admin.tender.projectBasedExport')}</CardTitle>
            <CardDescription>
              {t('app.admin.tender.projectBasedExportDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-export">{t('app.admin.tender.selectProject')}</Label>
                <select
                  className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                  value={selectedProjectForExport?.id?.toString() || ''}
                  onChange={e => {
                    const project = projects.find(p => p.id.toString() === e.target.value);
                    setSelectedProjectForExport(project || null);
                  }}
                >
                  <option value="" disabled>{t('app.admin.tender.chooseProjectToExport')}</option>
                    {projects.map((project) => (
                    <option key={project.id} value={project.id.toString()}>
                        {project.title}
                    </option>
                    ))}
                </select>
              </div>
              <Button
                onClick={handleExportProjectPdf}
                disabled={loading.projectPdf || loading.initial || !selectedProjectForExport}
                >
                <FileOutput className="mr-2 h-4 w-4" />
                {loading.projectPdf ? t('common.generating') : t('app.admin.tender.exportProjectReport')}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://www.ilovepdf.com/pdf_to_word', '_blank')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Convert to Word
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Image Export Section */}
          <Card>
            <CardHeader>
            <CardTitle>{t('app.admin.tender.imageExport')}</CardTitle>
              <CardDescription>
              Export project images with custom aspect ratios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="project-image-export">{t('app.admin.tender.selectProject')}</Label>
                  <select
                    className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                    value={selectedProject?.id?.toString() || ''}
                    onChange={e => {
                      const project = projects.find(p => p.id.toString() === e.target.value);
                      setSelectedProject(project || null);
                    }}
                  >
                    <option value="" disabled>Choose a project</option>
                      {projects.map((project) => (
                      <option key={project.id} value={project.id.toString()}>
                          {project.title}
                      </option>
                      ))}
                  </select>
                </div>
                      <div className="space-y-2">
                <Label htmlFor="aspect-ratio-select">{t('app.admin.tender.aspectRatio')}</Label>
                <select
                  className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                          value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value)}
                >
                  <option value="original">Original</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="3:2">3:2</option>
                  <option value="2:3">2:3</option>
                  <option value="9:16">9:16</option>
                  <option value="21:9">21:9</option>
                  <option value="5:4">5:4</option>
                  <option value="4:5">4:5</option>
                  <option value="custom">Custom</option>
                </select>
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
                {loading.image ? t('common.generating') : t('app.admin.tender.exportImages')}
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
