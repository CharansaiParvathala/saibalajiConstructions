import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/context/language-context';
import { createProject } from '@/lib/api/api-client';

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Project name must be at least 3 characters.",
  }),
  workers: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Workers must be a positive number.",
  }),
  totalWork: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Total work distance must be a positive number.",
  }),
});

const LeaderCreateProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      workers: "",
      totalWork: "",
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("You must be logged in to create a project");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newProject = await createProject({
        name: values.name,
        leaderId: user.id,
        workers: parseInt(values.workers),
        totalWork: parseFloat(values.totalWork),
        completedWork: 0
      });
      
      toast.success("Project created successfully");
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/leader');
      }, 1500);
      
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.createProject.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.createProject.description')}
      </p>
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.createProject.details.title')}</CardTitle>
            <CardDescription>
              {t('app.createProject.details.subtitle')}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('app.createProject.details.name.label')}</Label>
                <Input
                  id="name"
                  placeholder={t('app.createProject.details.name.placeholder')}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workers">{t('app.createProject.details.workers.label')}</Label>
                <Input
                  id="workers"
                  type="number"
                  placeholder={t('app.createProject.details.workers.placeholder')}
                  min="1"
                  {...register("workers")}
                />
                {errors.workers && (
                  <p className="text-sm text-destructive">{errors.workers.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalWork">{t('app.createProject.details.distance.label')}</Label>
                <Input
                  id="totalWork"
                  type="number"
                  placeholder={t('app.createProject.details.distance.placeholder')}
                  min="1"
                  step="0.01"
                  {...register("totalWork")}
                />
                {errors.totalWork && (
                  <p className="text-sm text-destructive">{errors.totalWork.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : t('app.createProject.submit')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LeaderCreateProject;
