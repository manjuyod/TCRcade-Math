import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { formatRelativeTime, getGradeLabel } from '@/lib/utils';
import { Loader2, Eye, Edit, Trash, UserPlus, LogOut, ChevronRight, BarChart2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAnalytics from '@/components/admin-analytics';
import AdminMultiplayer from '@/components/admin-multiplayer';

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Redirect if not admin
  if (user && !user.isAdmin) {
    window.location.href = '/';
    return null;
  }
  
  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchOnWindowFocus: false
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<User> }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'User updated',
        description: 'User information has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'User has been permanently deleted from the system',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting user',
        description: error.message || 'There was an error deleting the user',
        variant: 'destructive'
      });
    }
  });
  
  const editForm = useForm<Partial<User>>({
    defaultValues: {
      displayName: '',
      grade: '',
      tokens: 0
    }
  });
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      displayName: user.displayName,
      grade: user.grade,
      tokens: user.tokens
    });
  };
  
  const handleUpdateUser = (data: Partial<User>) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        updates: data
      });
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Admin Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <span className="text-xl font-bold text-dark">Math Arcade <span className="text-sm text-gray-500">Admin</span></span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark mb-2">Admin Dashboard</h1>
          <p className="text-gray-500">Manage students, track progress, and analyze learning data</p>
        </div>
        
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Students
            </TabsTrigger>
            <TabsTrigger value="multiplayer" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Multiplayer
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Advanced Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="students">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-4">
                    <i className="ri-user-line text-xl text-primary"></i>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Students</p>
                    <h3 className="text-2xl font-bold text-dark">{users?.length || 0}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center mr-4">
                    <i className="ri-question-line text-xl text-secondary"></i>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Questions Answered</p>
                    <h3 className="text-2xl font-bold text-dark">
                      {users?.reduce((total, user) => total + user.questionsAnswered, 0) || 0}
                    </h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-accent bg-opacity-10 rounded-full flex items-center justify-center mr-4">
                    <i className="ri-time-line text-xl text-accent"></i>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Active Today</p>
                    <h3 className="text-2xl font-bold text-dark">
                      {users?.filter(u => {
                        const lastActive = new Date(u.lastActive);
                        const today = new Date();
                        return lastActive.getDate() === today.getDate() &&
                          lastActive.getMonth() === today.getMonth() &&
                          lastActive.getFullYear() === today.getFullYear();
                      }).length || 0}
                    </h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-danger bg-opacity-10 rounded-full flex items-center justify-center mr-4">
                    <i className="ri-bar-chart-line text-xl text-danger"></i>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Avg. Score</p>
                    <h3 className="text-2xl font-bold text-dark">
                      {users && users.length > 0
                        ? Math.round(
                            (users.reduce((total, user) => 
                              total + (user.correctAnswers / (user.questionsAnswered || 1)), 0) / users.length) * 100
                          ) + '%'
                        : '0%'
                      }
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Student Management */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark">Student Management</h2>
                <Button className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Student
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-3 px-2 text-gray-600">Name</th>
                        <th className="text-left py-3 px-2 text-gray-600">Grade</th>
                        <th className="text-left py-3 px-2 text-gray-600">Progress</th>
                        <th className="text-left py-3 px-2 text-gray-600">Last Active</th>
                        <th className="text-left py-3 px-2 text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users && users.map(student => (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                                <span className="text-primary text-xs font-bold">{student.initials}</span>
                              </div>
                              <span className="font-medium">{student.displayName || student.username}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">{getGradeLabel(student.grade || 'K')}</td>
                          <td className="py-3 px-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-secondary rounded-full" 
                                style={{ 
                                  width: `${student.questionsAnswered > 0 
                                    ? Math.round((student.correctAnswers / student.questionsAnswered) * 100) 
                                    : 0}%` 
                                }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-500 text-sm">
                            {formatRelativeTime(student.lastActive)}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditUser(student)}
                                  >
                                    <Edit className="h-4 w-4 text-gray-500 hover:text-primary" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Student</DialogTitle>
                                  </DialogHeader>
                                  
                                  <Form {...editForm}>
                                    <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                                      <FormField
                                        control={editForm.control}
                                        name="displayName"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Display Name</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <FormField
                                        control={editForm.control}
                                        name="grade"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Grade</FormLabel>
                                            <FormControl>
                                              <select
                                                {...field}
                                                className="w-full p-2 border rounded"
                                              >
                                                <option value="K">Kindergarten</option>
                                                <option value="1">Grade 1</option>
                                                <option value="2">Grade 2</option>
                                                <option value="3">Grade 3</option>
                                                <option value="4">Grade 4</option>
                                                <option value="5">Grade 5</option>
                                                <option value="6">Grade 6</option>
                                              </select>
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <FormField
                                        control={editForm.control}
                                        name="tokens"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Tokens</FormLabel>
                                            <FormControl>
                                              <Input 
                                                {...field} 
                                                type="number" 
                                                min="0" 
                                                onChange={e => field.onChange(parseInt(e.target.value))}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <div className="flex justify-end">
                                        <Button 
                                          type="submit" 
                                          className="bg-primary text-white"
                                          disabled={updateUserMutation.isPending}
                                        >
                                          {updateUserMutation.isPending ? "Updating..." : "Save Changes"}
                                        </Button>
                                      </div>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete User</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p>Are you sure you want to delete the user <strong>{student.displayName || student.username}</strong>?</p>
                                    <p className="text-sm text-gray-500">This action cannot be undone. All user data including progress, scores, and achievements will be permanently deleted.</p>
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline" onClick={() => {}}>
                                        Cancel
                                      </Button>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => deleteUserMutation.mutate(student.id)}
                                        disabled={deleteUserMutation.isPending}
                                      >
                                        {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {(!users || users.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No students found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="multiplayer">
            <AdminMultiplayer />
          </TabsContent>
          
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
