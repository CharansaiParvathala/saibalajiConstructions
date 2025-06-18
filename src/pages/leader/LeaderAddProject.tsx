import React, { useState } from 'react';
import { useLanguage } from '@/context/language-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const LeaderAddProject: React.FC = () => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalWork, setTotalWork] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Handle form submission
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{t('app.project.create.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.project.create.description')}
      </p>
      
      <div className="w-full max-w-6xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('app.project.create.formTitle')}</CardTitle>
            <CardDescription>
              {t('app.project.create.formDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="space-y-4 w-full">
                <div className="w-full">
                  <Label htmlFor="title">{t('app.project.create.title')}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('app.project.create.titlePlaceholder')}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="w-full">
                  <Label htmlFor="description">{t('app.project.create.description')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('app.project.create.descriptionPlaceholder')}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="w-full">
                  <Label htmlFor="totalWork">{t('app.project.create.totalWork')}</Label>
                  <Input
                    id="totalWork"
                    type="number"
                    value={totalWork}
                    onChange={(e) => setTotalWork(e.target.value)}
                    placeholder={t('app.project.create.totalWorkPlaceholder')}
                    required
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('app.project.create.submitting') : t('app.project.create.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderAddProject; 