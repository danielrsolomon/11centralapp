// Dashboard Diagnostic Script - Non-Intrusive Version

// Track JavaScript errors without interfering with normal event flow
window.addEventListener('error', function(event) {
  console.error('Dashboard Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || 'No stack trace'
  });
  
  // Add visual indicator for errors - append to a specific element instead of body
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  container.style.color = 'white';
  container.style.padding = '8px 12px';
  container.style.borderRadius = '4px';
  container.style.zIndex = '9999';
  container.style.pointerEvents = 'none'; // Important: don't block clicks
  container.textContent = 'JS Error: ' + event.message;
  
  // Wait for body to be available
  if (document.body) {
    document.body.appendChild(container);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
    });
  }
}, { passive: true }); // Use passive to avoid blocking

// Check authentication state without interrupting flow
window.addEventListener('load', function() {
  console.log('Dashboard loaded - diagnostic mode');
  
  // Check localStorage but don't manipulate DOM
  try {
    // Log auth related localStorage items
    const authItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        try {
          const value = localStorage.getItem(key);
          const parsed = JSON.parse(value || '{}');
          authItems.push({
            key,
            hasUser: !!parsed.user,
            hasToken: !!parsed.access_token,
            expiresAt: parsed.expires_at
          });
        } catch (e) {
          authItems.push({ key, error: e.message });
        }
      }
    }
    console.log('Auth storage items:', authItems);
  } catch (e) {
    console.error('Error checking auth state:', e);
  }
  
  // Analyze buttons without attaching events
  setTimeout(() => {
    try {
      const buttons = document.querySelectorAll('button, a');
      console.log(`Found ${buttons.length} buttons/links`);
      
      buttons.forEach((btn, index) => {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const text = btn.textContent?.trim() || '[no text]';
        
        // Check for event listeners indirectly
        const hasAttributeHandler = btn.hasAttribute('onclick');
        const hasHref = btn.hasAttribute('href');
        
        console.log(`Button "${text}": visible=${isVisible}, hasClick=${hasAttributeHandler}, hasHref=${hasHref}`);
      });
    } catch (e) {
      console.error('Error analyzing buttons:', e);
    }
  }, 1000);
}, { passive: true });

console.log('Dashboard diagnostics loaded (passive mode)'); 