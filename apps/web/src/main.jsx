import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
function Entry() {
  const { pathname } = useLocation();
  return googleClientId && ['/login', '/register', '/verify-email'].includes(pathname) ? <GoogleOAuthProvider clientId={googleClientId}><App /></GoogleOAuthProvider> : <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter><Entry /></BrowserRouter>
  </React.StrictMode>,
);

