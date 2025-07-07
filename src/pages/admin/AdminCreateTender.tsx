import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { Download, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api/tender';

const AdminCreateTender = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<{ folder: string; sectionName: string }[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [merging, setMerging] = useState(false);
  const [addingImage, setAddingImage] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [sectionPdfUrl, setSectionPdfUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch section names on mount
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await fetch(`${API_BASE}/sections`);
        if (!res.ok) throw new Error('Failed to fetch sections');
        const data = await res.json();
        setSections(data.sections);
        if (data.sections.length > 0) setSelectedSection(data.sections[0].folder);
      } catch (err) {
        toast.error('Failed to load section names');
      }
    };
    fetchSections();
  }, []);

  // Handle add image
  const handleAddImage = async () => {
    setAddingImage(true);
    setMergedPdfUrl(null);
    try {
      if (!selectedSection || !imageFile) {
        toast.error('Select section and image');
        return;
      }
      const formData = new FormData();
      formData.append('section', selectedSection);
      formData.append('image', imageFile);
      const res = await fetch(`${API_BASE}/add-image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to add image');
      const data = await res.json();
      if (data.mergedPdf) {
        setMergedPdfUrl(data.mergedPdf);
        toast.success('Image added and tender merged!');
      } else {
        toast.error('Image added but no merged PDF returned');
      }
    } catch (err) {
      toast.error('Failed to add image');
    } finally {
      setAddingImage(false);
    }
  };

  // Handle download merged tender PDF
  const handleDownloadTender = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/download`);
      if (!res.ok) throw new Error('Failed to download tender PDF');
      
      // Create blob from response
      const blob = await res.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let filename = window.prompt('Enter a name for the PDF file:', 'tender.pdf');
      if (!filename || !filename.trim()) filename = 'tender.pdf';
      if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Tender PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download tender PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold">Create Tender Document</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
        All PDFs in the tender folders are automatically merged. Add images to sections as needed.
      </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => navigate('/admin/tender-images')}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Update Images</span>
            <span className="sm:hidden">Images</span>
          </Button>
          <Button 
            onClick={handleDownloadTender} 
            disabled={downloading}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {downloading ? 'Downloading...' : 'Download Tender PDF'}
            </span>
            <span className="sm:hidden">
              {downloading ? 'Downloading...' : 'Download PDF'}
            </span>
          </Button>
        </div>
      </div>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Add Image to Section</CardTitle>
          <CardDescription>
            Select a section and image to add as a new page to that section. The merged PDF will be updated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Section</Label>
            <select
              className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
            >
              {sections.map(section => (
                <option key={section.folder} value={section.folder}>
                  {section.sectionName}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <Label>Image File</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={handleAddImage} disabled={addingImage}>
            {addingImage ? 'Adding...' : 'Add Image to Section'}
          </Button>
          {mergedPdfUrl && (
            <div className="mt-4">
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch(mergedPdfUrl);
                    if (!res.ok) throw new Error('Failed to download tender PDF');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    let filename = window.prompt('Enter a name for the PDF file:', 'tender.pdf');
                    if (!filename || !filename.trim()) filename = 'tender.pdf';
                    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (err) {
                    toast.error('Failed to download tender PDF');
                  }
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Latest Merged Tender PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreateTender; 