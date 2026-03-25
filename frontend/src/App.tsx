import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { darkTheme } from './theme/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ApiKeys } from './pages/ApiKeys';
import { Languages } from './pages/Languages';
import { Templates } from './pages/Templates';
import { Translate } from './pages/Translate';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }}/>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/keys" element={<PrivateRoute><ApiKeys /></PrivateRoute>} />
            <Route path="/languages" element={<PrivateRoute><Languages /></PrivateRoute>} />
            <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
            <Route path="/translate" element={<PrivateRoute><Translate /></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
