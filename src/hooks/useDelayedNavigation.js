import { useNavigate } from 'react-router-dom';
import NProgress from 'nprogress';

/**
 * Custom hook for delayed navigation with loading indicator
 * Waits for data to load before navigating to ensure smooth transitions
 * Current page stays visible while new page data loads in background
 *
 * @param {Function} loadDataCallback - Async function to load page data
 * @returns {Function} navigate - Function to trigger delayed navigation
 */
export function useDelayedNavigation(loadDataCallback) {
  const navigate = useNavigate();

  const delayedNavigate = async (path) => {
    // Start progress bar immediately
    NProgress.start();

    try {
      // Wait for data to load while staying on current page
      if (loadDataCallback && typeof loadDataCallback === 'function') {
        await loadDataCallback();
      }

      // Only navigate after data is loaded
      navigate(path);
    } catch (error) {
      console.error('Error loading data before navigation:', error);
      // Navigate anyway even if data load fails
      navigate(path);
    } finally {
      // Progress bar will be completed by usePageTransition hook
      // Don't call NProgress.done() here to avoid conflicts
    }
  };

  return delayedNavigate;
}
