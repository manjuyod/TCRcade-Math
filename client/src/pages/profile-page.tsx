import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { ProgressBar } from '@/components/progress-bar';
import { getGradeLabel } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Edit, Flame, HelpCircle, Coins, Star, Award, Medal, TrendingUp, Target } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { SubjectMastery } from '@/components/subject-mastery';

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [grade, setGrade] = useState(user?.grade || 'K');
  
  // Email and password change fields
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Fetch comprehensive progress data with global stats and percentiles
  const { data: progressResponse, isLoading } = useQuery<{
    progress: Array<{
      category: string;
      label: string;
      score: number;
      completion: number;
      questionsAnswered: number;
      correctAnswers: number;
      accuracy: number;
      moduleData: any;
    }>;
    globalStats: {
      totalTokens: number;
      totalQuestions: number;
      totalCorrect: number;
      accuracy: number;
      tokenPercentile: number;
      accuracyPercentile: number;
    };
  }>({
    queryKey: ['/api/progress'],
    enabled: !!user,
    refetchOnWindowFocus: false
  });
  
  // Mutation to update user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      displayName?: string;
      grade?: string;
      interests?: string[];
    }) => {
      const response = await apiRequest('PATCH', '/api/user', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Profile updated successfully',
        description: 'Your profile settings have been saved.',
      });
      setShowSettings(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Email update mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest('PATCH', '/api/user', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update email');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Email updated successfully',
        description: 'Your email address has been changed.',
      });
      setShowSettings(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating email',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('PATCH', '/api/user/password', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update password');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password updated successfully',
        description: 'Your password has been changed.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSettings(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Reset module progress mutation (for testing)
  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user/reset-progress');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset progress');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: 'Progress reset successfully',
        description: 'All module assessments and mastery levels have been reset.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error resetting progress',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate({
      displayName,
      grade,
      interests
    });
  };

  const handleEmailUpdate = () => {
    if (!user || user.email === email) {
      toast({
        title: 'No changes detected',
        description: 'Your email address is already up to date.',
        variant: 'destructive',
      });
      return;
    }

    if (!email || email.length < 3) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    updateEmailMutation.mutate({ email });
  };

  const handlePasswordUpdate = () => {
    if (!currentPassword) {
      toast({
        title: 'Current password required',
        description: 'Please enter your current password.',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Invalid new password',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length > 50) {
      toast({
        title: 'Password too long',
        description: 'Password must be less than 50 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your new passwords match.',
        variant: 'destructive',
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  // Show loading state while fetching progress data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading your progress...</span>
          </div>
        </main>
        <Navigation />
      </div>
    );
  }

  const progressData = progressResponse?.progress || [];
  const globalStats = progressResponse?.globalStats || {
    totalTokens: user?.tokens || 0,
    totalQuestions: user?.questionsAnswered || 0,
    totalCorrect: user?.correctAnswers || 0,
    accuracy: 0,
    tokenPercentile: 50,
    accuracyPercentile: 50
  };

  // Find overall progress and module progress
  const overallProgress = progressData.find(p => p.category === 'overall');
  const moduleProgress = progressData.filter(p => p.category !== 'overall');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8" data-testid="progress-container">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hello, {user?.displayName || user?.username}! 👋
            </h1>
            <p className="text-gray-600">
              Welcome to your learning dashboard
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign Out'
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            {/* <TabsTrigger value="subjects">Subjects</TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Global Statistics Card */}
            <Card data-testid="global-stats">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Your Learning Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Coins className="h-6 w-6 text-yellow-500 mr-1" />
                      <span className="text-2xl font-bold text-yellow-600" data-testid="total-tokens">
                        {globalStats.totalTokens}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <div className="mt-1">
                      <Badge variant="secondary" className="percentile-display">
                        {Math.round(globalStats.tokenPercentile)}th percentile
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-6 w-6 text-blue-500 mr-1" />
                      <span className="text-2xl font-bold text-blue-600">
                        {globalStats.totalQuestions}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Questions Answered</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-6 w-6 text-green-500 mr-1" />
                      <span className="text-2xl font-bold text-green-600">
                        {globalStats.totalCorrect}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Correct Answers</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-6 w-6 text-purple-500 mr-1" />
                      <span className="text-2xl font-bold text-purple-600">
                        {Math.round(globalStats.accuracy)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Accuracy</p>
                    <div className="mt-1">
                      <Badge variant="secondary" className="percentile-display">
                        {Math.round(globalStats.accuracyPercentile)}th percentile
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Display Name</p>
                    <p className="text-lg">{user?.displayName || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Grade Level</p>
                    <p className="text-lg">{getGradeLabel(user?.grade || 'K')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-lg">{user?.email || 'Not set'}</p>
                  </div>
                </div>
                
                {interests.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Learning Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest, index) => (
                        <Badge key={index} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Module Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {moduleProgress.map((progress, index) => (
                <Card key={progress.category} data-testid="module-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{progress.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(progress.completion)}%</span>
                      </div>
                      <ProgressBar 
                        progress={progress.completion} 
                        className="h-2"
                      />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tokens</p>
                          <p className="font-semibold">{progress.score}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Accuracy</p>
                          <p className="font-semibold">{Math.round(progress.accuracy)}%</p>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {progress.questionsAnswered} questions answered • {progress.correctAnswers} correct
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* <TabsContent value="subjects">
            <SubjectMastery />
          </TabsContent> */}
        </Tabs>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md !rounded-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
              <DialogDescription>
                Update your profile information and preferences.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Grade Level</label>
                <select 
                  value={grade} 
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="K">Kindergarten</option>
                  <option value="1">Grade 1</option>
                  <option value="2">Grade 2</option>
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
                <Button 
                  onClick={handleEmailUpdate}
                  disabled={updateEmailMutation.isPending}
                  className="w-full mt-2"
                  variant="outline"
                >
                  {updateEmailMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Email'
                  )}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium">Change Password</label>
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                  />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button 
                  onClick={handlePasswordUpdate}
                  disabled={updatePasswordMutation.isPending}
                  className="w-full mt-2"
                  variant="outline"
                >
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium">Learning Interests</label>
                <div className="flex gap-2 mt-1">
                  <select
                    value=""
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const selectedInterest = e.target.value;
                      if (selectedInterest && !interests.includes(selectedInterest)) {
                        setInterests([...interests, selectedInterest]);
                      }
                      e.target.value = ""; // Reset selection
                    }}
                    className="flex-1 p-2 border rounded-md"
                  >
                    <option value="">Select an interest...</option>
                    <option value="Addition">Addition</option>
                    <option value="Subtraction">Subtraction</option>
                    <option value="Multiplication">Multiplication</option>
                    <option value="Division">Division</option>
                    <option value="Fractions">Fractions</option>
                    <option value="Decimals">Decimals</option>
                    <option value="Pre-Algebra">Pre-Algebra</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeInterest(index)}>
                      {interest} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Testing Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Testing Tools</h3>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => resetProgressMutation.mutate()}
                disabled={resetProgressMutation.isPending}
              >
                {resetProgressMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Reset All Module Progress'
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Resets test_taken and mastery_level flags for all modules
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleProfileUpdate} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      
      <Navigation />
    </div>
  );
}