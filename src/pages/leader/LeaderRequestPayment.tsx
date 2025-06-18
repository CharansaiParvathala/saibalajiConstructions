import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { Project, PaymentPurpose, PhotoWithMetadata, ProgressUpdate } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getProjects, getProgressUpdates, createPaymentRequest } from '@/lib/api/api-client';

const LeaderRequestPayment = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<string>('');
  const [purposes, setPurposes] = useState<PaymentPurpose[]>([
    { type: "food", amount: 0, images: [], remarks: "" }
  ]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Create file input ref for each purpose
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allProjects = await getProjects();
        if (user) {
          const userProjects = allProjects.filter(project => project.leader_id === Number(user.id));
          setProjects(userProjects);

          if (userProjects.length > 0) {
            const updates = await getProgressUpdates(Number(userProjects[0].id));
          setProgressUpdates(updates);
            setSelectedProject(userProjects[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, t]);

  useEffect(() => {
    // Calculate total amount whenever purposes change
    const newTotal = purposes.reduce((acc, purpose) => acc + (purpose.amount || 0), 0);
    setTotalAmount(newTotal);
  }, [purposes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject || !selectedProgress || purposes.length === 0) {
      toast.error(t("app.paymentRequest.allFieldsRequired"));
      return;
    }

    // Validate that all purposes have required fields
    const invalidPurpose = purposes.find(p => !p.type || !p.amount || p.amount <= 0);
    if (invalidPurpose) {
      toast.error(t("app.paymentRequest.invalidPurpose"));
      return;
    }

    setLoading(true);

    try {
      // Convert base64 images to File objects for all purposes
      const allImages: File[] = [];
      const expenses = purposes.map((purpose, index) => {
        // Convert images for this purpose
        const purposeImages = purpose.images.map((image, imgIndex) => {
          const imageIndex = allImages.length;
          // Convert base64 to File
          const dataUrl = image.dataUrl;
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const file = new File([u8arr], `receipt-${Date.now()}-${imgIndex}.jpg`, { type: mime });
          allImages.push(file);
          return imageIndex;
        });

        return {
          type: purpose.type as 'food' | 'fuel' | 'labour' | 'vehicle' | 'water' | 'other',
          amount: Number(purpose.amount),
          remarks: purpose.remarks || '',
          images: purposeImages
        };
      });

      // Create single payment request with all expenses
      await createPaymentRequest({
        projectId: Number(selectedProject),
        description: `Payment request for ${purposes.length} expense(s)`,
        expenses: expenses,
        images: allImages,
        progressId: Number(selectedProgress)
        });
      
      // Clear form
      setPurposes([{ type: "food", amount: 0, images: [], remarks: "" }]);
      setSelectedProgress('');
      setTotalAmount(0);
      
      toast.success(t("app.paymentRequest.requestSent"));
      navigate('/leader/view-payment');
    } catch (error) {
      console.error('Payment request error:', error);
      toast.error(t("app.paymentRequest.requestFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload 
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, purposeIndex: number) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      const file = files[0];
      
      // Validate file type (only images)
      if (!file.type.startsWith('image/')) {
        toast.error(t("app.paymentRequest.onlyImageFiles"));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = () => {
        // Create a new photo object
        const newPhoto: PhotoWithMetadata = {
          dataUrl: reader.result as string,
          timestamp: new Date().toISOString(),
          location: { latitude: 0, longitude: 0 }
        };

        // Update purposes with the new photo
        setPurposes(prevPurposes => 
          prevPurposes.map((purpose, index) => 
            index === purposeIndex 
              ? { ...purpose, images: [...purpose.images, newPhoto] }
              : purpose
          )
        );
        
        toast.success(t("app.paymentRequest.imageUploaded"));
      };
      
      reader.onerror = () => {
        toast.error(t("app.paymentRequest.uploadFailed"));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(t("app.paymentRequest.uploadFailed"));
    }
  };

  // Handler functions
  const handleRemovePurpose = (index: number) => {
    setPurposes(prevPurposes => prevPurposes.filter((_, i) => i !== index));
  };
  
  const handlePurposeChange = (index: number, field: keyof PaymentPurpose, value: any) => {
    setPurposes(prevPurposes => 
      prevPurposes.map((purpose, i) => 
        i === index ? { ...purpose, [field]: value } : purpose
      )
    );
  };
  
  const handleAddPurpose = () => {
    setPurposes(prevPurposes => [
      ...prevPurposes, 
      { 
        type: "food", 
        amount: 0, 
        images: [],
        remarks: "" 
      }
    ]);
  };
  
  const triggerFileInput = (index: number) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]?.click();
    }
  };
  
  const removeImage = (purposeIndex: number, imageIndex: number) => {
    setPurposes(prevPurposes => 
      prevPurposes.map((purpose, i) => 
        i === purposeIndex 
          ? { 
              ...purpose, 
              images: purpose.images.filter((_, imgIdx) => imgIdx !== imageIndex) 
            }
          : purpose
      )
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleProjectChange = async (projectId: string) => {
    console.log("Project selected:", projectId);
    try {
      setLoading(true);
      const project = projects.find(p => p.id.toString() === projectId);
      if (project) {
        setSelectedProject(projectId);
        const updates = await getProgressUpdates(Number(projectId));
        console.log("Fetched progress updates:", updates);
        setProgressUpdates(updates);
        // Reset selected progress when project changes
        setSelectedProgress(''); 
      }
    } catch (error) {
      console.error('Error loading project updates:', error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.leader.requestPayment.title")}</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project">{t("app.paymentRequest.project")}</Label>
            <Select 
              value={selectedProject} 
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("app.paymentRequest.selectProject")} />
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

          {selectedProject && (
            <div>
              <Label>{t("app.paymentRequest.selectProgress")}</Label>
              <Select 
                value={selectedProgress} 
                onValueChange={setSelectedProgress}
                key={`progress-select-${selectedProject}`}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("app.paymentRequest.selectProgressUpdate")} />
                </SelectTrigger>
                <SelectContent>
                  {progressUpdates.map((update) => {
                    const displayText = `${formatDate(update.created_at)} - ${update.completed_work}m completed (${update.status})`;
                    return (
                    <SelectItem 
                      key={update.id} 
                        value={update.id.toString()}
                    >
                        {displayText}
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t("app.paymentRequest.purposes")}</Label>
            {purposes.map((purpose, index) => (
              <div key={`purpose-${index}`} className="mb-4 p-4 border rounded">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`type-${index}`}>{t("app.paymentRequest.type")}</Label>
                    <Select 
                      value={purpose.type} 
                      onValueChange={(value) => handlePurposeChange(index, 'type', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("app.paymentRequest.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food" textValue={t("app.paymentRequest.food")}>
                          {t("app.paymentRequest.food")}
                        </SelectItem>
                        <SelectItem value="fuel" textValue={t("app.paymentRequest.fuel")}>
                          {t("app.paymentRequest.fuel")}
                        </SelectItem>
                        <SelectItem value="labour" textValue={t("app.paymentRequest.labour")}>
                          {t("app.paymentRequest.labour")}
                        </SelectItem>
                        <SelectItem value="vehicle" textValue={t("app.paymentRequest.vehicle")}>
                          {t("app.paymentRequest.vehicle")}
                        </SelectItem>
                        <SelectItem value="water" textValue={t("app.paymentRequest.water")}>
                          {t("app.paymentRequest.water")}
                        </SelectItem>
                        <SelectItem value="other" textValue={t("app.paymentRequest.other")}>
                          {t("app.paymentRequest.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`amount-${index}`}>{t("app.paymentRequest.amount")}</Label>
                    <Input
                      type="number"
                      id={`amount-${index}`}
                      value={purpose.amount?.toString() || ''}
                      onChange={(e) => handlePurposeChange(index, 'amount', Number(e.target.value))}
                      placeholder={t("app.paymentRequest.amountPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("app.paymentRequest.images")}</Label>
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => triggerFileInput(index)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {t("app.paymentRequest.uploadImage")}
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, index)}
                        ref={(el) => fileInputRefs.current[index] = el}
                      />
                    </div>
                    <div className="flex flex-wrap mt-2 gap-2">
                      {purpose.images.map((image, i) => (
                        <div key={`image-${index}-${i}`} className="relative">
                          <img 
                            src={image.dataUrl} 
                            alt={`${t("app.paymentRequest.receipt")} ${i+1}`} 
                            className="w-16 h-16 object-cover rounded"
                          />
                          <button
                            type="button"
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            onClick={() => removeImage(index, i)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor={`remarks-${index}`}>{t("app.paymentRequest.remarks")}</Label>
                  <Textarea
                    id={`remarks-${index}`}
                    placeholder={t("app.paymentRequest.remarksPlaceholder")}
                    value={purpose.remarks || ''}
                    onChange={(e) => handlePurposeChange(index, 'remarks', e.target.value)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => handleRemovePurpose(index)}
                >
                  {t("app.paymentRequest.removePurpose")}
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={handleAddPurpose}>
              {t("app.paymentRequest.addPurpose")}
            </Button>
          </div>

          <div>
            <Label htmlFor="total">{t("app.paymentRequest.totalAmount")}</Label>
            <Input type="number" id="total" value={totalAmount.toString()} readOnly />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("common.loading") : t("app.paymentRequest.submit")}
          </Button>
        </form>
      )}
    </div>
  );
};

export default LeaderRequestPayment;
