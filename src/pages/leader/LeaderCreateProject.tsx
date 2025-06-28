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

const LeaderCreateProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formSchema = z.object({
    title: z.string().min(3, {
      message: t('app.createProject.validation.title'),
    }),
    description: z.string().min(10, {
      message: t('app.createProject.validation.description'),
    }),
    totalWork: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: t('app.createProject.validation.totalWork'),
    }),
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      totalWork: "",
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error(t('app.createProject.error.notLoggedIn'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error(t('app.createProject.error.tokenMissing'));
      navigate('/login');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const projectData = {
        title: values.title.trim(),
        description: values.description.trim(),
        leaderId: Number(user.id),
        totalWork: Number(values.totalWork)
      };

      console.log('Creating project with values:', projectData);
      console.log('User ID:', user.id);
      console.log('Auth token:', token.substring(0, 10) + '...');

      const newProject = await createProject(projectData);
      
      console.log('Project created:', newProject);
      toast.success(t('app.createProject.success'));
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/leader');
      }, 1500);
      
    } catch (error: any) {
      if (error.message && error.message.includes('Project name already exists')) {
        toast.error(t('app.createProject.error.duplicateName'));
      } else {
        toast.error(t('app.createProject.error.generic'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{t('app.createProject.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.createProject.description')}
      </p>
      
      <div className="w-full max-w-6xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('app.createProject.details.title')}</CardTitle>
            <CardDescription>
              {t('app.createProject.details.subtitle')}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2 w-full">
                <Label htmlFor="title">{t('app.createProject.details.title.label')}</Label>
                <Input
                  id="title"
                  placeholder={t('app.createProject.details.title.placeholder')}
                  {...register("title")}
                  className="w-full"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
              
              <div className="space-y-2 w-full">
                <Label htmlFor="description">{t('app.createProject.details.description.label')}</Label>
                <Input
                  id="description"
                  placeholder={t('app.createProject.details.description.placeholder')}
                  {...register("description")}
                  className="w-full"
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
              
              <div className="space-y-2 w-full">
                <Label htmlFor="totalWork">{t('app.createProject.details.totalWork.label')}</Label>
                <Input
                  id="totalWork"
                  type="number"
                  placeholder={t('app.createProject.details.totalWork.placeholder')}
                  {...register("totalWork")}
                  className="w-full"
                />
                {errors.totalWork && (
                  <p className="text-sm text-destructive">{errors.totalWork.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('app.createProject.submitting') : t('app.createProject.submit')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LeaderCreateProject;
