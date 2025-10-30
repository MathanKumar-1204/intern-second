"use client";
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientChat from './pages/PatientChat';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  useEffect(() => {
    if (!loading && user && profile) {
      setCurrentPage('landing');
    } else if (!loading && !user) {
      if (currentPage !== 'login' && currentPage !== 'signup') {
        setCurrentPage('landing');
      }
    }
  }, [user, profile, loading, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && profile) {
    if (profile.role === 'doctor') {
      return <DoctorDashboard />;
    } else if (profile.role === 'patient') {
      return <PatientChat />;
    }
  }

  if (currentPage === 'login') {
    return <LoginPage onBack={() => setCurrentPage('landing')} />;
  }

  if (currentPage === 'signup') {
    return <SignupPage onBack={() => setCurrentPage('landing')} />;
  }

  return <LandingPage onNavigate={setCurrentPage} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
