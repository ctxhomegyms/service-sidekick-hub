import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wrench, Mail, Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  expires_at: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (inviteToken) {
      validateInvitation(inviteToken);
    }
  }, [inviteToken]);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const validateInvitation = async (token: string) => {
    setInviteLoading(true);
    setInviteError(null);

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, role, expires_at')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (error || !data) {
        setInviteError('This invitation link is invalid or has already been used.');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInviteError('This invitation has expired. Please contact your administrator for a new invite.');
        return;
      }

      setInvitation(data);
      setSignupData((prev) => ({ ...prev, email: data.email }));
    } catch (error) {
      setInviteError('Failed to validate invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully!');
    }
  };

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If there's an invite token, show the accept invitation form
  if (inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background safe-area-pt safe-area-pb">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FieldFlow</span>
            </div>

            {inviteError ? (
              <>
                <CardTitle className="text-xl sm:text-2xl text-destructive">Invalid Invitation</CardTitle>
                <CardDescription>{inviteError}</CardDescription>
              </>
            ) : invitation ? (
              <>
                <CardTitle className="text-xl sm:text-2xl">Accept Your Invitation</CardTitle>
                <CardDescription>
                  Create your account to join the team
                </CardDescription>
              </>
            ) : null}
          </CardHeader>

          {invitation && !inviteError && (
            <CardContent className="px-4 sm:px-6">
              <div className="mb-6 p-3 rounded-lg bg-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">You're being invited as:</span>
                </div>
                <Badge className="capitalize">{invitation.role}</Badge>
              </div>

              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 h-12 text-base"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData((d) => ({ ...d, fullName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      className="pl-10 h-12 text-base bg-muted"
                      value={signupData.email}
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-12 text-base"
                      value={signupData.password}
                      onChange={(e) => setSignupData((d) => ({ ...d, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account & Join Team
                </Button>
              </form>
            </CardContent>
          )}

          {inviteError && (
            <CardContent className="px-4 sm:px-6">
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate('/auth')}
              >
                Go to Sign In
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // No invite token - show sign in only
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Wrench className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">FieldFlow</h1>
              <p className="text-sm opacity-80">Service Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4">
            Streamline Your Field Service Operations
          </h2>
          <p className="text-lg opacity-90 max-w-md">
            Manage jobs, schedule technicians, and delight customers with our
            comprehensive field service management platform.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-primary-foreground/10">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm opacity-80">Jobs Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-primary-foreground/10">
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm opacity-80">Customer Satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Sign In Only */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FieldFlow</span>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={loginData.email}
                    onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={loginData.password}
                    onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">
                Need an account? Contact your administrator for an invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
