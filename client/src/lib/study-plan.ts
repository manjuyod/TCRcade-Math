import { queryClient } from '@/lib/queryClient';
import { generateCustomStudyPlanFromAnalytics } from '@/components/ai-analytics';

/**
 * Utility function to request a refresh of the user's custom study plan
 * We'll call this after significant learning events like completing a session
 * or answering several questions correctly/incorrectly in succession
 */
export async function refreshStudyPlan() {
  try {
    // Fetch current analytics from cache
    const analyticsData = queryClient.getQueryData(['/api/analytics']);
    
    // If we have no analytics data, we need to fetch it first
    if (!analyticsData) {
      console.log('No analytics data available, fetching...');
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const newAnalyticsData = await response.json();
      // Update cache with the new data
      queryClient.setQueryData(['/api/analytics'], newAnalyticsData);
      
      // Only continue if we actually got data
      if (!newAnalyticsData) {
        console.log('No analytics data returned from API');
        return false;
      }
      
      return true;
    }
    
    // Analytics data exists, so we can just invalidate to trigger a refresh
    console.log('Invalidating analytics data to trigger refresh');
    await queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    
    return true;
  } catch (error) {
    console.error('Error refreshing study plan:', error);
    return false;
  }
}