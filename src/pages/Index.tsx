import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/language-context';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-4xl font-bold mb-8 gradient-text-animated">
        {t('app.name')}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="card-glow card-gradient-1">
          <CardHeader>
            <CardTitle>{t('app.navigation.projects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('index.projectManagementDescription')}</p>
            <Button onClick={() => navigate('/leader/create-project')}>{t('app.navigation.createProject')}</Button>
          </CardContent>
        </Card>
        
        <Card className="card-glow card-gradient-2">
          <CardHeader>
            <CardTitle>{t('app.navigation.viewProgress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('index.progressTrackingDescription')}</p>
            <Button onClick={() => navigate('/leader/add-progress')}>{t('app.navigation.addProgress')}</Button>
          </CardContent>
        </Card>
        
        <Card className="card-glow card-gradient-3">
          <CardHeader>
            <CardTitle>{t('app.navigation.requestPayment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('index.paymentsDescription')}</p>
            <Button onClick={() => navigate('/leader/request-payment')}>{t('app.navigation.requestPayment')}</Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-card p-6 rounded-lg shadow-md border border-border/40">
        <h2 className="text-2xl font-bold mb-4">{t('index.gettingStarted')}</h2>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>{t('index.step1')}</li>
          <li>{t('index.step2')}</li>
          <li>{t('index.step3')}</li>
          <li>{t('index.step4')}</li>
        </ol>
      </div>
    </div>
  );
};

export default Index;
