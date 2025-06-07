
/**
 * Toast Swipe Functionality
 * 
 * This module adds the ability to swipe and dismiss toast notifications.
 * It is automatically imported and initialized by the main application.
 */

export const initToastSwipeSupport = (): void => {
  // Add event listeners once the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    setupToastSwipe();
  });

  // Also set up whenever the content is updated (for dynamically added toasts)
  const observer = new MutationObserver(() => {
    setupToastSwipe();
  });

  // Start observing the document for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
};

const setupToastSwipe = (): void => {
  // Find all toast elements
  const toasts = document.querySelectorAll('[data-sonner-toast]');
  
  toasts.forEach(toast => {
    if ((toast as HTMLElement).dataset.swipeInitialized === 'true') return;
    
    // Mark as initialized
    (toast as HTMLElement).dataset.swipeInitialized = 'true';
    
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    
    // Touch events
    toast.addEventListener('touchstart', (e) => handleDragStart(e as TouchEvent), { passive: true });
    toast.addEventListener('touchmove', (e) => handleDragMove(e as TouchEvent), { passive: false });
    toast.addEventListener('touchend', handleDragEnd, { passive: true });
    
    // Mouse events
    toast.addEventListener('mousedown', (e) => handleDragStart(e as MouseEvent));
    toast.addEventListener('mousemove', (e) => handleDragMove(e as MouseEvent));
    toast.addEventListener('mouseup', handleDragEnd);
    toast.addEventListener('mouseleave', handleDragEnd);
    
    function handleDragStart(e: TouchEvent | MouseEvent) {
      if (e instanceof TouchEvent) {
        startX = e.touches[0].clientX;
      } else {
        startX = e.clientX;
        e.preventDefault();
      }
      isSwiping = true;
      (toast as HTMLElement).dataset.swiping = 'true';
    }
    
    function handleDragMove(e: TouchEvent | MouseEvent) {
      if (!isSwiping) return;
      
      if (e instanceof TouchEvent) {
        currentX = e.touches[0].clientX - startX;
      } else {
        currentX = e.clientX - startX;
      }
      
      // Only allow swiping right
      if (currentX < 0) currentX = 0;
      
      (toast as HTMLElement).style.setProperty('--swipe-amount', `${currentX}px`);
      
      // Prevent page scrolling while swiping
      if (e instanceof TouchEvent && currentX > 10) {
        e.preventDefault();
      }
    }
    
    function handleDragEnd() {
      if (!isSwiping) return;
      
      isSwiping = false;
      (toast as HTMLElement).dataset.swiping = 'false';
      
      // If swiped more than 40% of toast width or 100px, dismiss
      const threshold = Math.min(toast.clientWidth * 0.4, 100);
      
      if (currentX > threshold) {
        // Mark toast for removal
        (toast as HTMLElement).dataset.swipeOut = 'true';
        
        // Remove after animation
        setTimeout(() => {
          toast.remove();
        }, 400);
      } else {
        // Reset position
        (toast as HTMLElement).style.setProperty('--swipe-amount', '0px');
      }
    }
  });
};
