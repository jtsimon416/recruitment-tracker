import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';

/**
 * Custom hook to handle page transition loading bar
 * Shows progress bar at top of page when navigating between routes
 * Returns isTransitioning state to coordinate with page components
 */
export function usePageTransition() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Start transition and loading bar
    setIsTransitioning(true);
    NProgress.start();

    // Minimum display time for smooth UX (600ms)
    // Ensures users see the loading animation even if page loads instantly
    const minTimer = setTimeout(() => {
      setIsTransitioning(false);
      NProgress.done();
    }, 600);

    // Cleanup on unmount or route change
    return () => {
      clearTimeout(minTimer);
      setIsTransitioning(false);
      NProgress.done();
    };
  }, [location.pathname]); // Trigger on pathname change

  return isTransitioning;
}

// Configure NProgress globally
NProgress.configure({
  showSpinner: false,    // Hide the spinner, just show the bar
  trickleSpeed: 200,     // Speed of trickle animation
  minimum: 0.1,          // Minimum percentage to start with
  easing: 'ease',        // CSS easing function
  speed: 400,            // Animation speed in ms
  trickle: true,         // Automatically increment progress
  parent: 'body'         // Parent element for the progress bar
});
