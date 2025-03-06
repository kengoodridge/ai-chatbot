'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function DynamicPage() {
  const pathname = usePathname();
  const [pageContent, setPageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPageContent() {
      if (!pathname) return;
      
      // Skip API paths - they should be handled by the API route handlers
      if (pathname.startsWith('/api/')) {
        setError('Invalid path');
        setLoading(false);
        return;
      }
      
      try {
        // Attempt to fetch the page content
        const response = await fetch(`/api/pages/render?path=${encodeURIComponent(pathname)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Page not found');
          } else {
            const data = await response.json();
            setError(data.error || 'An error occurred');
          }
          setLoading(false);
          return;
        }
        
        // Get the HTML content
        const htmlContent = await response.text();
        setPageContent(htmlContent);
      } catch (err) {
        console.error('Error fetching page:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    }

    fetchPageContent();
  }, [pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  // Render the HTML content
  return (
    <div 
      className="dynamic-page-content" 
      dangerouslySetInnerHTML={{ __html: pageContent || '' }} 
    />
  );
}