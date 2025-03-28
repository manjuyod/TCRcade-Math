import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DownloadCloud, RefreshCw, ChevronDown, ChevronUp, FileText, User, BookOpen, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Pie,
  PieChart,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// Analytics Types
type AdminAnalyticsSummary = {
  studentsCount: number;
  activeToday: number;
  totalQuestionsAnswered: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  mostActiveGrade: string;
  leastActiveGrade: string;
  mostChallengedConcept: string;
  totalSessionTime: number;
  mostPopularFeature: string;
  gradeDistribution: { grade: string; count: number }[];
  weeklyEngagement: { date: string; activeStudents: number; questionsAnswered: number }[];
  performanceByGrade: { grade: string; accuracy: number; questionsAnswered: number }[];
  conceptMastery: { concept: string; averageMastery: number }[];
};

type StudentAnalytics = {
  id: number;
  username: string;
  displayName: string | null;
  grade: string | null;
  questionsAnswered: number;
  correctAnswers: number;
  streakDays: number;
  lastActive: string;
  topStrengths: string[];
  topWeaknesses: string[];
  learningStyle: string | null;
  timeSpent: number;
  dailyStreak: number;
  inactiveStreak: number;
};

type ConceptAnalytics = {
  concept: string;
  category: string;
  averageMastery: number;
  attemptCount: number;
  successRate: number;
  difficultyRating: number;
  relatedConcepts: string[];
  grade: string;
};

// Constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#48C9B0'];
const gradeOptions = [
  { value: 'all', label: 'All Grades' },
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
  { value: '5', label: 'Grade 5' },
  { value: '6', label: 'Grade 6' }
];

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'year', label: 'Last Year' }
];

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [grade, setGrade] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30days');
  const [studentSortBy, setStudentSortBy] = useState<string>('questionsAnswered');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('desc');
  const [conceptSortBy, setConceptSortBy] = useState<string>('averageMastery');
  const [conceptSortOrder, setConceptSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Fetch analytics summary
  const { 
    data: summary, 
    isLoading: summaryLoading,
    refetch: refetchSummary
  } = useQuery<AdminAnalyticsSummary>({
    queryKey: ['/api/admin/analytics/summary', grade, dateRange],
    enabled: !!user?.isAdmin
  });
  
  // Fetch student analytics
  const { 
    data: studentAnalytics, 
    isLoading: studentsLoading,
    refetch: refetchStudents
  } = useQuery<StudentAnalytics[]>({
    queryKey: ['/api/admin/analytics/students', grade, dateRange],
    enabled: !!user?.isAdmin
  });
  
  // Fetch concept analytics
  const { 
    data: conceptAnalytics, 
    isLoading: conceptsLoading,
    refetch: refetchConcepts
  } = useQuery<ConceptAnalytics[]>({
    queryKey: ['/api/admin/analytics/concepts', grade],
    enabled: !!user?.isAdmin
  });
  
  // Sort student analytics based on current sort settings
  const sortedStudents = studentAnalytics 
    ? [...studentAnalytics].sort((a, b) => {
        let valueA = a[studentSortBy as keyof StudentAnalytics];
        let valueB = b[studentSortBy as keyof StudentAnalytics];
        
        // Handle string comparison
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        }
        
        // Handle arrays
        if (Array.isArray(valueA) && Array.isArray(valueB)) {
          valueA = valueA.length;
          valueB = valueB.length;
        }
        
        if (studentSortOrder === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      })
    : [];
  
  // Sort concept analytics based on current sort settings
  const sortedConcepts = conceptAnalytics 
    ? [...conceptAnalytics].sort((a, b) => {
        const valueA = a[conceptSortBy as keyof ConceptAnalytics];
        const valueB = b[conceptSortBy as keyof ConceptAnalytics];
        
        if (conceptSortOrder === 'asc') {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      })
    : [];
  
  // Handle exporting analytics
  const handleExport = async (format: string) => {
    window.open(`/api/admin/analytics/export?format=${format}&grade=${grade}&dateRange=${dateRange}`, '_blank');
  };
  
  // Refresh all analytics
  const refreshAll = () => {
    refetchSummary();
    refetchStudents();
    refetchConcepts();
  };
  
  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to view admin analytics.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-gray-500">Comprehensive insights into student performance and learning</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={refreshAll} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Select onValueChange={handleExport}>
            <SelectTrigger className="w-[110px]">
              <div className="flex items-center">
                <DownloadCloud className="h-4 w-4 mr-2" />
                <span>Export</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Analytics</TabsTrigger>
          <TabsTrigger value="concepts">Concept Mastery</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          {summaryLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Students"
                  value={summary.studentsCount.toString()}
                  description={`${summary.activeToday} active today`}
                  icon={<User className="h-5 w-5" />}
                />
                
                <StatCard
                  title="Questions Answered"
                  value={summary.totalQuestionsAnswered.toString()}
                  description={`${summary.averageAccuracy}% average accuracy`}
                  icon={<BookOpen className="h-5 w-5" />}
                />
                
                <StatCard
                  title="Time per Question"
                  value={`${summary.averageTimePerQuestion}s`}
                  description={`${summary.totalSessionTime} total minutes`}
                  icon={<FileText className="h-5 w-5" />}
                />
                
                <StatCard
                  title="Most Active Grade"
                  value={`Grade ${summary.mostActiveGrade}`}
                  description={`Least active: Grade ${summary.leastActiveGrade}`}
                  icon={<User className="h-5 w-5" />}
                />
              </div>
              
              {/* Engagement Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Engagement</CardTitle>
                    <CardDescription>Student activity and questions answered over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={summary.weeklyEngagement}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="activeStudents"
                          stroke="#8884d8"
                          name="Active Students"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="questionsAnswered"
                          stroke="#82ca9d"
                          name="Questions Answered"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                    <CardDescription>Student population across different grades</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.gradeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="grade"
                        >
                          {summary.gradeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              {/* Grade Performance and Concept Mastery */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance by Grade</CardTitle>
                    <CardDescription>Accuracy and question volume by grade level</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.performanceByGrade}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="accuracy"
                          fill="#8884d8"
                          name="Accuracy (%)"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="questionsAnswered"
                          fill="#82ca9d"
                          name="Questions Answered"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Concept Mastery Overview</CardTitle>
                    <CardDescription>Average mastery levels across key math concepts</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius={100} data={summary.conceptMastery.slice(0, 8)}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="concept" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Average Mastery"
                          dataKey="averageMastery"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p>No analytics data available. Try adjusting your filters or adding more students.</p>
            </div>
          )}
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Analytics</CardTitle>
              <CardDescription>Detailed student-level performance metrics and learning patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sortedStudents && sortedStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('displayName');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Student
                            {studentSortBy === 'displayName' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('grade');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Grade
                            {studentSortBy === 'grade' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('questionsAnswered');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Questions
                            {studentSortBy === 'questionsAnswered' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('timeSpent');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Time (min)
                            {studentSortBy === 'timeSpent' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('correctAnswers');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Accuracy
                            {studentSortBy === 'correctAnswers' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('dailyStreak');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Streak
                            {studentSortBy === 'dailyStreak' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setStudentSortBy('lastActive');
                          setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Last Active
                            {studentSortBy === 'lastActive' && (
                              studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b">Strengths</th>
                        <th className="p-3 border-b">Areas for Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map(student => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{student.displayName || student.username}</div>
                          </td>
                          <td className="p-3">{student.grade || 'N/A'}</td>
                          <td className="p-3">{student.questionsAnswered}</td>
                          <td className="p-3">{student.timeSpent}</td>
                          <td className="p-3">
                            {student.questionsAnswered > 0 
                              ? `${Math.round((student.correctAnswers / student.questionsAnswered) * 100)}%` 
                              : 'N/A'}
                          </td>
                          <td className="p-3">{student.dailyStreak} days</td>
                          <td className="p-3">
                            {new Date(student.lastActive).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {student.inactiveStreak === 0 
                                ? 'Today' 
                                : `${student.inactiveStreak} days ago`}
                            </div>
                          </td>
                          <td className="p-3">
                            <ul className="list-disc ml-4 text-sm">
                              {student.topStrengths.slice(0, 2).map((strength, idx) => (
                                <li key={idx}>{strength}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-3">
                            <ul className="list-disc ml-4 text-sm">
                              {student.topWeaknesses.slice(0, 2).map((weakness, idx) => (
                                <li key={idx}>{weakness}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>No student data available. Try adjusting your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Concepts Tab */}
        <TabsContent value="concepts">
          <Card>
            <CardHeader>
              <CardTitle>Concept Mastery Analysis</CardTitle>
              <CardDescription>Detailed breakdown of student performance by math concept</CardDescription>
            </CardHeader>
            <CardContent>
              {conceptsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sortedConcepts && sortedConcepts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('concept');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Concept
                            {conceptSortBy === 'concept' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('category');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Category
                            {conceptSortBy === 'category' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('grade');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Grade Level
                            {conceptSortBy === 'grade' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('averageMastery');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Mastery Level
                            {conceptSortBy === 'averageMastery' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('attemptCount');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Attempts
                            {conceptSortBy === 'attemptCount' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('successRate');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Success Rate
                            {conceptSortBy === 'successRate' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b cursor-pointer" onClick={() => {
                          setConceptSortBy('difficultyRating');
                          setConceptSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }}>
                          <div className="flex items-center">
                            Difficulty
                            {conceptSortBy === 'difficultyRating' && (
                              conceptSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="p-3 border-b">Related Concepts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedConcepts.map((concept, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{concept.concept}</td>
                          <td className="p-3">{concept.category}</td>
                          <td className="p-3">{concept.grade}</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                                <div 
                                  className="h-full bg-secondary rounded-full" 
                                  style={{ width: `${concept.averageMastery}%` }}
                                />
                              </div>
                              <span>{concept.averageMastery}%</span>
                            </div>
                          </td>
                          <td className="p-3">{concept.attemptCount}</td>
                          <td className="p-3">{concept.successRate}%</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`h-2 w-2 rounded-full mx-0.5 ${
                                    i < Math.round(concept.difficultyRating) 
                                      ? 'bg-primary' 
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {concept.relatedConcepts.map((related, idx) => (
                                <span key={idx} className="bg-gray-100 text-xs px-2 py-1 rounded">
                                  {related}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>No concept data available. Try adjusting your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon,
  variant = "default"
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  variant?: "default" | "secondary" | "success";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`p-2 rounded-full ${
            variant === "secondary" 
              ? "bg-secondary/20 text-secondary" 
              : variant === "success"
                ? "bg-green-100 text-green-600"
                : "bg-primary/20 text-primary"
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}