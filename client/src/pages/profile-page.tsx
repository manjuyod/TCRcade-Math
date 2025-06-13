import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { ProgressBar } from '@/components/progress-bar';
import { UserProgress } from '@shared/schema';
import { getGradeLabel } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Edit, Flame, HelpCircle, Coins, Star, Award, Medal } from 'lucide-react';
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
  const [newInterest, setNewInterest] = useState('');
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
  
  // Mutation for updating learning style
  const updateLearningStyleMutation = useMutation({
    mutationFn: async (data: {
      learningStyle: string;
      strengths: string[];
      weaknesses: string[];
    }) => {
      const response = await apiRequest('POST', '/api/analytics/learning-style', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update learning style');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Learning style updated',
        description: 'Your learning preferences have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating learning style',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to update email
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest('PATCH', '/api/user/email', data);
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
        description: 'Your email address has been updated.',
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
  
  // Mutation to update password
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { 
      currentPassword: string;
      newPassword: string;
    }) => {
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
        description: 'Your password has been changed. Please use your new password next time you login.',
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
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };
  
  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };
  
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      displayName,
      grade,
      interests
    });
  };
  
  const handleSelectLearningStyle = (style: string) => {
    updateLearningStyleMutation.mutate({
      learningStyle: style,
      strengths: user.strengthConcepts || [],
      weaknesses: user.weaknessConcepts || []
    });
  };
  
  // Handle email update
  const handleUpdateEmail = () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Email cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    updateEmailMutation.mutate({ email });
  };
  
  // Handle password update
  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!newPassword) {
      toast({
        title: "Error",
        description: "New password is required",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-purple-700 p-6 text-white">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mr-4">
                <span className="text-primary text-2xl font-bold">{user.initials}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.displayName || user.username}</h2>
                <p className="text-white text-opacity-90">
                  {getGradeLabel(user.grade || 'K')}
                </p>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-2 p-4">
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.tokens}</div>
                <div className="text-sm text-gray-600">Tokens</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.streakDays}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{user.questionsAnswered}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-dark mb-4">Your Progress</h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : progressResponse && progressResponse.progress.length > 0 ? (
              <div className="space-y-6">
                {/* Global Stats Overview */}
                {progressResponse.globalStats && (
                  <div className="bg-gradient-to-r from-primary/10 to-purple-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-3">Overall Performance</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{progressResponse.globalStats.totalTokens}</div>
                        <div className="text-gray-600">Total Tokens</div>
                        <div className="text-xs text-green-600">
                          {progressResponse.globalStats.tokenPercentile}th percentile
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{progressResponse.globalStats.accuracy}%</div>
                        <div className="text-gray-600">Accuracy</div>
                        <div className="text-xs text-green-600">
                          {progressResponse.globalStats.accuracyPercentile}th percentile
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{progressResponse.globalStats.totalQuestions}</div>
                        <div className="text-gray-600">Questions</div>
                        <div className="text-xs text-gray-500">
                          {progressResponse.globalStats.totalCorrect} correct
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{progressResponse.globalStats.streak}</div>
                        <div className="text-gray-600">Day Streak</div>
                        <div className="text-xs text-orange-600">🔥 Keep it up!</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Module Progress */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Module Progress</h4>
                  {progressResponse.progress
                    .filter(progress => progress.category !== 'overall')
                    .map((progress) => {
                      return (
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow" key={progress.id}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-medium text-gray-800">{getCategoryLabel(progress.category)}</h5>
                              <p className="text-sm text-gray-600">{progress.moduleData.concepts}</p>
                              <p className="text-xs text-gray-500">Grade {progress.moduleData.gradeLevel}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{progress.completion}%</div>
                              <div className="text-xs text-gray-500">Complete</div>
                            </div>
                          </div>
                          
                          <ProgressBar progress={progress.completion} />
                          
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-gray-700">{progress.score}</div>
                              <div className="text-xs text-gray-500">Tokens</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-gray-700">{progress.accuracy}%</div>
                              <div className="text-xs text-gray-500">Accuracy</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-gray-700">{progress.moduleData.streak}</div>
                              <div className="text-xs text-gray-500">Streak</div>
                            </div>
                          </div>
                          
                          {progress.lastPlayed && (
                            <div className="mt-2 text-xs text-gray-400">
                              Last played: {new Date(progress.lastPlayed).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No progress data yet. Start playing to see your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-dark mb-4">Your Badges</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {user.streakDays >= 3 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-2 relative overflow-hidden">
                    {/* Flame animation with multiple flames */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Flame className="h-10 w-10 text-red-500 absolute animate-pulse" style={{ transform: 'translateY(-2px)' }} />
                      <Flame className="h-8 w-8 text-yellow-400 absolute animate-bounce" />
                      <Flame className="h-12 w-12 text-orange-600 absolute opacity-50" style={{ transform: 'translateY(2px)' }} />
                    </div>
                    <span className="text-white font-bold z-10">{user.streakDays}🔥</span>
                  </div>
                  <span className="text-xs font-bold text-center text-gray-700">On Fire!</span>
                </div>
              )}
              
              {user.questionsAnswered >= 50 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-2 relative overflow-hidden">
                    {/* Multiple question marks in different positions */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <HelpCircle className="h-6 w-6 text-purple-300 absolute top-2 left-2 rotate-12" />
                      <HelpCircle className="h-5 w-5 text-purple-200 absolute bottom-2 right-3 -rotate-12" />
                      <HelpCircle className="h-4 w-4 text-purple-100 absolute bottom-3 left-4 rotate-45" />
                      <HelpCircle className="h-7 w-7 text-white absolute" />
                    </div>
                    <span className="text-white font-bold z-10 text-xs absolute bottom-1">×{user.questionsAnswered}</span>
                  </div>
                  <span className="text-xs font-bold text-center text-gray-700">Question Master</span>
                </div>
              )}
              
              {user.tokens >= 100 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-2 relative overflow-hidden">
                    {/* Multiple coins scattered around */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-yellow-300 absolute top-2 left-3 rotate-12" />
                      <Coins className="h-4 w-4 text-yellow-200 absolute bottom-2 right-3 -rotate-12" />
                      <Coins className="h-6 w-6 text-yellow-100 absolute top-4 right-2 rotate-45" />
                      <Coins className="h-8 w-8 text-yellow-600 absolute" />
                    </div>
                    <div className="z-10 bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full absolute bottom-1">
                      {user.tokens}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-center text-gray-700">Token Collector</span>
                </div>
              )}
              
              {/* Show empty state if no badges */}
              {user.streakDays < 3 && user.questionsAnswered < 50 && user.tokens < 100 && (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  <p>Keep playing to earn badges!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Subject Mastery Section */}
        <div className="mb-6">
          <SubjectMastery userId={user.id} currentGrade={user.grade || '5'} />
        </div>
        
        {/* Settings/Profile Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button 
              className="arcade-btn w-full bg-primary text-white font-bold py-3 px-4 rounded-xl mb-4"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
              <DialogDescription>
                Update your profile information and preferences
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="interests">Interests</TabsTrigger>
                <TabsTrigger value="learning">Learning Style</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>
              
              {/* Profile Settings Tab */}
              <TabsContent value="profile" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="text-sm font-medium">Display Name</label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="grade" className="text-sm font-medium">Grade Level</label>
                    <select
                      id="grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="K">Kindergarten</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  </div>
                </div>
              </TabsContent>
              
              {/* Interests Tab */}
              <TabsContent value="interests" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Interests</label>
                    <p className="text-sm text-muted-foreground">
                      These help us create more engaging math problems for you
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {interests.length > 0 ? (
                        interests.map((interest) => (
                          <Badge key={interest} variant="outline" className="py-1">
                            {interest}
                            <button 
                              className="ml-1 text-muted-foreground hover:text-foreground" 
                              onClick={() => handleRemoveInterest(interest)}
                            >
                              &times;
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No interests added yet</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="e.g. Space, Sports, Animals"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleAddInterest}
                        disabled={!newInterest.trim()}
                        type="button"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Learning Style Tab */}
              <TabsContent value="learning" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferred Learning Style</label>
                    <p className="text-sm text-muted-foreground">
                      Select how you learn best so we can adapt our teaching
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={user.learningStyle === 'visual' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => handleSelectLearningStyle('visual')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Visual Learner
                      </Button>
                      
                      <Button
                        variant={user.learningStyle === 'auditory' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => handleSelectLearningStyle('auditory')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m12.728 2.828a9 9 0 000-12.728" />
                        </svg>
                        Auditory Learner
                      </Button>
                      
                      <Button
                        variant={user.learningStyle === 'kinesthetic' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => handleSelectLearningStyle('kinesthetic')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                        </svg>
                        Hands-On Learner
                      </Button>
                      
                      <Button
                        variant={user.learningStyle === 'reading' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => handleSelectLearningStyle('reading')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Reading/Writing
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Account Settings Tab */}
              <TabsContent value="account" className="space-y-4 py-4">
                <div className="space-y-4">
                  {/* Grade Information Section */}
                  <div className="space-y-2 border-b pb-4">
                    <h4 className="font-medium">Grade Information</h4>
                    <p className="text-sm text-gray-600">
                      Current Grade: <span className="font-bold">{getGradeLabel(user?.grade || 'K')}</span>
                    </p>
                    
                    {user?.lastGradeAdvancement && (
                      <p className="text-sm text-gray-600">
                        Last Advanced: <span className="font-medium">
                          {new Date(user.lastGradeAdvancement).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                    
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <h5 className="text-sm font-medium text-blue-700">About Grade Advancement</h5>
                      <p className="text-xs text-blue-600 mt-1">
                        Your grade will automatically advance on July 4th each year. 
                        Teachers and parents can also adjust your grade manually in the profile settings.
                      </p>
                    </div>
                  </div>
                  
                  {/* Email Change Section */}
                  <div className="space-y-2 border-b pb-4">
                    <h4 className="font-medium">Update Email</h4>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                      />
                    </div>
                    <Button 
                      onClick={handleUpdateEmail}
                      className="mt-2"
                      disabled={updateEmailMutation.isPending}
                    >
                      {updateEmailMutation.isPending ? "Updating..." : "Update Email"}
                    </Button>
                  </div>
                  
                  {/* Password Change Section */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Change Password</h4>
                    <div className="space-y-2">
                      <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                      />
                    </div>
                    <Button
                      onClick={handleUpdatePassword}
                      className="mt-4 w-full"
                      disabled={updatePasswordMutation.isPending}
                      variant="outline"
                    >
                      {updatePasswordMutation.isPending ? "Updating..." : "Change Password"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                onClick={handleSaveProfile} 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          onClick={handleLogout}
          className="arcade-btn w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl mb-4"
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
        </Button>
      </main>
      
      <Navigation active="profile" />
    </div>
  );
}
