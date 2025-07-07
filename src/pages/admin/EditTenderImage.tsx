import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

const API_BASE = '/api/tender';

const EditTenderImage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<any>(null);
  const [sections, setSections] = useState<{ folder: string; sectionName: string }[]>([]);
  const [form, setForm] = useState({
    section: '',
    serial_number: '',
    imageFile: null as File | null,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch sections
        const sectionsRes = await fetch(`${API_BASE}/sections`);
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData.sections);
        }
        // Fetch image data
        const imagesRes = await fetch(`${API_BASE}/images`);
        if (imagesRes.ok) {
          const imagesData = await imagesRes.json();
          const found = imagesData.images.find((img: any) => img.id.toString() === id);
          if (found) {
            setImage(found);
            setForm({
              section: found.section,
              serial_number: found.serial_number.toString(),
              imageFile: null,
            });
          }
        }
      } catch (err) {
        toast.error('Failed to load image data');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    setForm(prev => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const formData = new FormData();
      formData.append('section', form.section);
      formData.append('serial_number', form.serial_number);
      if (form.imageFile) formData.append('image', form.imageFile);
      const res = await fetch(`${API_BASE}/images/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to update image');
      toast.success('Image updated successfully');
      navigate('/admin/tender-images');
    } catch (err) {
      toast.error('Failed to update image');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!image) {
    return <div className="container mx-auto py-6">Image not found.</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Tender Image</CardTitle>
          <CardDescription>Update the section, serial number, or upload a new image file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Section</Label>
              <select
                name="section"
                className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                value={form.section}
                onChange={handleChange}
                required
              >
                {sections.map(section => (
                  <option key={section.folder} value={section.folder}>{section.sectionName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input
                name="serial_number"
                type="number"
                min="1"
                value={form.serial_number}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first. Changing this will reorder other images in the same section.
              </p>
            </div>
            <div>
              <Label>New Image File (Optional)</Label>
              <Input
                name="imageFile"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to keep the current image.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Update Image</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/tender-images')}>Cancel</Button>
            </div>
          </form>
          <div className="mt-6 flex flex-col items-center">
            <Label className="mb-2">Current Image</Label>
            <img
              src={`/api/tender/images/${image.id}/blob`}
              alt={image.filename}
              className="max-w-xs max-h-64 object-contain border rounded bg-white dark:bg-[#23272f]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditTenderImage; 