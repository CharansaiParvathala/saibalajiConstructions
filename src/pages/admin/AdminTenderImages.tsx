import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { ArrowLeft, Image, Edit, Trash2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TenderImage {
  id: number;
  section: string;
  filename: string;
  serial_number: number;
}

const API_BASE = '/api/tender';

const AdminTenderImages = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [images, setImages] = useState<TenderImage[]>([]);
  const [sections, setSections] = useState<{ folder: string; sectionName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState<TenderImage | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<TenderImage | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    section: '',
    serial_number: '',
    imageFile: null as File | null
  });

  // Add section filter state
  const [sectionFilter, setSectionFilter] = useState<string>('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch sections and images on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sections
        const sectionsRes = await fetch(`${API_BASE}/sections`);
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData.sections);
        }

        // Fetch images
        const imagesRes = await fetch(`${API_BASE}/images`);
        if (imagesRes.ok) {
          const imagesData = await imagesRes.json();
          setImages(imagesData.images);
        } else {
          const errorData = await imagesRes.json();
          console.error('API Error:', errorData);
          toast.error(`Failed to load images: ${errorData.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleEditImage = (image: TenderImage) => {
    navigate(`/admin/tender-images/${image.id}/edit`);
  };

  const handleUpdateImage = async () => {
    if (!editingImage) return;

    try {
      const formData = new FormData();
      formData.append('section', editForm.section);
      formData.append('serial_number', editForm.serial_number);
      if (editForm.imageFile) {
        formData.append('image', editForm.imageFile);
      }

      const res = await fetch(`${API_BASE}/images/${editingImage.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to update image');

      toast.success('Image updated successfully');
      setShowEditDialog(false);
      setEditingImage(null);
      
      // Refresh images
      const imagesRes = await fetch(`${API_BASE}/images`);
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        setImages(imagesData.images);
      }
    } catch (err) {
      toast.error('Failed to update image');
    }
  };

  const handleDeleteImage = async (image: TenderImage) => {
    if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/images/${image.id}`, {
        method: 'DELETE',
      });
      if (res.status === 404) {
        toast.info('Image already deleted or not found.');
      } else if (!res.ok) {
        throw new Error('Failed to delete image');
      } else {
        toast.success('Image deleted successfully');
      }
      // Refresh images
      const imagesRes = await fetch(`${API_BASE}/images`);
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        setImages(imagesData.images);
      }
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  const getSectionName = (sectionFolder: string) => {
    const section = sections.find(s => s.folder === sectionFolder);
    return section ? section.sectionName : sectionFolder;
  };

  // Filter images by section
  const filteredImages = sectionFilter ? images.filter(img => img.section === sectionFilter) : images;

  if (user?.role !== 'admin') {
    return <div className="container mx-auto py-6">Access denied</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <Button 
            onClick={() => navigate('/admin/create-tender')}
            variant="outline"
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Create Tender</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">Tender Images</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Manage and update tender document images
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Image className="h-5 w-5" />
            Tender Images Management
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            View, update, and delete tender images. Serial numbers determine the order of images in each section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add section filter select box above image list */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <Label htmlFor="sectionFilter" className="mr-2">Section:</Label>
            <select
              id="sectionFilter"
              className="w-full sm:w-auto p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section.folder} value={section.folder}>{section.sectionName}</option>
              ))}
            </select>
          </div>

          {filteredImages.length === 0 ? (
            <div className="text-center py-8">
              <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tender images found.</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border rounded-lg gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">Serial:</span>
                      <span className="font-bold text-base md:text-lg">{image.serial_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">Section:</span>
                      <span className="font-medium text-sm md:text-base">{getSectionName(image.section)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">File:</span>
                      <span className="text-xs md:text-sm truncate max-w-[150px] md:max-w-[200px]">{image.filename}</span>
                    </div>
                  </div>
                  {/* Image preview */}
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <img
                      src={`/api/tender/images/${image.id}/blob`}
                      alt={image.filename}
                      className="w-24 h-24 object-contain border rounded bg-white dark:bg-[#23272f]"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditImage(image)}
                      className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                    >
                      <Edit className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Update</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteImage(image)}
                      className="flex items-center gap-1 md:gap-2 text-red-600 hover:text-red-700 text-xs md:text-sm"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">Del</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTenderImages; 