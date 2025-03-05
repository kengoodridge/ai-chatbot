declare module 'swagger-ui-react' {
  import React from 'react';

  interface SwaggerUIProps {
    spec?: Record<string, any>;
    url?: string;
    layout?: string;
    validatorUrl?: string;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelRendering?: 'example' | 'model';
    requestInterceptor?: (request: any) => any;
    responseInterceptor?: (response: any) => any;
    showMutatedRequest?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    withCredentials?: boolean;
    supportedSubmitMethods?: string[];
    filter?: string | boolean;
    oauth2RedirectUrl?: string;
  }

  const SwaggerUI: React.FC<SwaggerUIProps>;

  export default SwaggerUI;
}