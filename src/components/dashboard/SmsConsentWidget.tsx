import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ConsentStats {
  total: number;
  withConsent: number;
  withoutConsent: number;
  noPhone: number;
}

export function SmsConsentWidget() {
  const [stats, setStats] = useState<ConsentStats>({
    total: 0,
    withConsent: 0,
    withoutConsent: 0,
    noPhone: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConsentStats();
  }, []);

  const fetchConsentStats = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, phone, sms_consent');

      if (error) throw error;

      const total = customers?.length || 0;
      const withConsent = customers?.filter(c => c.sms_consent === true).length || 0;
      const noPhone = customers?.filter(c => !c.phone || c.phone.trim() === '').length || 0;
      const withoutConsent = total - withConsent - noPhone;

      setStats({ total, withConsent, withoutConsent, noPhone });
    } catch (error) {
      console.error('Error fetching consent stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const consentRate = stats.total > 0 
    ? Math.round((stats.withConsent / stats.total) * 100) 
    : 0;

  const needsAttention = stats.withoutConsent > 0 || stats.noPhone > 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={needsAttention ? 'border-warning/50' : 'border-success/50'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          SMS Compliance
          {needsAttention ? (
            <Badge variant="outline" className="text-warning border-warning">
              Needs Review
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success border-success">
              Compliant
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{consentRate}%</p>
            <p className="text-sm text-muted-foreground">
              Consent rate
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            needsAttention ? 'bg-warning/10' : 'bg-success/10'
          }`}>
            {needsAttention ? (
              <AlertCircle className="w-7 h-7 text-warning" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-success" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-success/10">
            <p className="text-lg font-semibold text-success">{stats.withConsent}</p>
            <p className="text-xs text-muted-foreground">Consented</p>
          </div>
          <div className="p-2 rounded bg-warning/10">
            <p className="text-lg font-semibold text-warning">{stats.withoutConsent}</p>
            <p className="text-xs text-muted-foreground">No Consent</p>
          </div>
          <div className="p-2 rounded bg-muted">
            <p className="text-lg font-semibold">{stats.noPhone}</p>
            <p className="text-xs text-muted-foreground">No Phone</p>
          </div>
        </div>

        {needsAttention && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/customers?filter=no_consent">
              Review Customers <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
