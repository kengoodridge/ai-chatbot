'use client';

import { useState, useEffect } from 'react';

export interface GeneratedPageInfo {
  id?: string;
  path: string;
  url?: string;
  projectId?: string;
  projectName?: string;
  htmlContent: string;
}

export function GeneratedPagePreview({
  pageInfo
}: {
  pageInfo: GeneratedPageInfo;
}) {
  const [iframeHeight, setIframeHeight] = useState('500px');
  
  // Create a sanitized version of the HTML for the iframe
  const htmlContent = pageInfo.htmlContent;
  
  // Handle iframe load to adjust height
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = e.currentTarget;
      if (iframe.contentWindow) {
        // Set height based on content height with some padding
        const height = iframe.contentWindow.document.body.scrollHeight + 50;
        setIframeHeight(`${height}px`);
      }
    } catch (error) {
      console.error('Error adjusting iframe height:', error);
    }
  };
  
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-4 border border-gray-200 max-w-full w-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row justify-between items-center">
          <h3 className="text-lg font-medium">
            {pageInfo.projectName ? `${pageInfo.projectName} - Generated Page` : 'Generated Page'}
          </h3>
          <a 
            href={pageInfo.url || pageInfo.path} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            View Full Page
          </a>
        </div>
        <div className="text-sm text-gray-500">
          URL: {pageInfo.url || pageInfo.path}
        </div>
      </div>
      
      {/* Iframe to render the HTML content */}
      <div className="border border-gray-300 rounded overflow-hidden w-full">
        <iframe
          title="Generated Page Preview"
          srcDoc={htmlContent}
          className="w-full"
          style={{ height: iframeHeight, border: 'none' }}
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}