import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileOutput, Printer, FilePlus, Image } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { generateExportData, getAllProjects, getProgressUpdatesByProjectId } from '@/lib/storage';
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
    const loadProjects = async () => {
      try {
        const allProjects = getAllProjects();
        setProjects(allProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };

    loadProjects();
  }, [t]);

  const handleExportDocx = async () => {
    try {
      setLoading(prev => ({ ...prev, word: true }));
      toast.info(t("common.generating"));
      
      // Generate the export data
      const data = generateExportData();
      
      // Prepare project data for Word document
      const projectData = data.projects.map(project => ({
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

  const handleExportPDF = async () => {
    try {
      setLoading(prev => ({ ...prev, pdf: true }));
      toast.info(t("common.generating"));
      
      // Generate the export data
      const data = generateExportData();
      
      // Export projects to PDF
      await exportProjectsToPDF(data.projects);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(prev => ({ ...prev, report: true }));
      toast.info(t("common.generating"));
      
      // Generate the export data
      const data = generateExportData();
      
      // Generate detailed report
      await generateProjectReport(data.projects[0]);
      
      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error("Report generation error:", error);
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

      // Get progress updates for the selected project
      const updates = await getProgressUpdatesByProjectId(selectedProject.id);
      if (!updates || !Array.isArray(updates)) {
        throw new Error('No progress updates found for this project');
      }

      setProgressUpdates(updates);

      let ratio;
      switch (aspectRatio) {
        case '1:1':
          ratio = { width: 1, height: 1 };
          break;
        case '4:3':
          ratio = { width: 4, height: 3 };
          break;
        case '3:4':
          ratio = { width: 3, height: 4 };
          break;
        case '16:9':
          ratio = { width: 16, height: 9 };
          break;
        case '9:16':
          ratio = { width: 9, height: 16 };
          break;
        case '2:3':
          ratio = { width: 2, height: 3 };
          break;
        case '3:2':
          ratio = { width: 3, height: 2 };
          break;
        default:
          ratio = undefined;
      }

      await exportProjectImages({
        project: selectedProject,
        aspectRatio: ratio,
        outputDirectory: ''
      });

      toast.success(t("common.exportSuccess"));
      setShowImageDialog(false);
    } catch (error) {
      console.error("Image export error:", error);
      toast.error(error instanceof Error ? error.message : t("common.exportError"));
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
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.export.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.admin.export.description")}
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.export.exportOptions")}</CardTitle>
            <CardDescription>
              {t("app.admin.export.selectFormat")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exportType">{t("app.admin.export.exportType")}</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("app.admin.export.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="projects">{t("app.admin.export.projects")}</SelectItem>
                  <SelectItem value="payments">{t("app.admin.export.payments")}</SelectItem>
                  <SelectItem value="statistics">{t("app.admin.export.statistics")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportDocx}
                disabled={loading.word}
              >
                <FileText className="mr-2 h-4 w-4" />
                {loading.word ? t("common.generating") : t("app.admin.export.exportWord")}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportPDF}
                disabled={loading.pdf}
              >
                <FileOutput className="mr-2 h-4 w-4" />
                {loading.pdf ? t("common.generating") : t("app.admin.export.exportPDF")}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateReport}
                disabled={loading.report}
              >
                <Printer className="mr-2 h-4 w-4" />
                {loading.report ? t("common.generating") : t("app.admin.export.generateReport")}
              </Button>

              <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loading.image}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    {loading.image ? t("common.generating") : t("app.admin.export.exportImages")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("app.admin.export.imageExport")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("app.admin.export.selectProject")}</Label>
                      <Select
                        value={selectedProject?.id}
                        onValueChange={(value) => {
                          const project = projects.find(p => p.id === value);
                          setSelectedProject(project || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("app.admin.export.selectProject")} />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("app.admin.export.aspectRatio")}</Label>
                      <RadioGroup value={aspectRatio} onValueChange={setAspectRatio}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="original" id="original" />
                          <Label htmlFor="original">{t("app.admin.export.original")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1:1" id="1:1" />
                          <Label htmlFor="1:1">1:1 (Square)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="4:3" id="4:3" />
                          <Label htmlFor="4:3">4:3 (Standard)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3:4" id="3:4" />
                          <Label htmlFor="3:4">3:4 (Portrait)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="16:9" id="16:9" />
                          <Label htmlFor="16:9">16:9 (Widescreen)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="9:16" id="9:16" />
                          <Label htmlFor="9:16">9:16 (Mobile)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="2:3" id="2:3" />
                          <Label htmlFor="2:3">2:3 (Portrait)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3:2" id="3:2" />
                          <Label htmlFor="3:2">3:2 (Landscape)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleExportImages}
                      disabled={!selectedProject || loading.image}
                    >
                      {loading.image ? t("common.generating") : t("app.admin.export.export")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.export.exportHistory")}</CardTitle>
            <CardDescription>
              {t("app.admin.export.recentExports")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {t("app.admin.export.noExports")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminExportData;
