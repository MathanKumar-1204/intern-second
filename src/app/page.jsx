"use client";
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientPage from './pages/PatientDashboard'; // This is the correct path

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  useEffect(() => {
    if (!loading && user && profile) {
      // If user is logged in, default to their dashboard
      if (profile.role === 'doctor') {
        setCurrentPage('doctor-dashboard');
      } else if (profile.role === 'patient') {
        setCurrentPage('patient-dashboard');
      }
    } else if (!loading && !user) {
      // If user is not logged in, show landing, login, or signup
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

  // --- Authenticated Routes ---
  if (user && profile) {
    if (profile.role === 'doctor' || currentPage === 'doctor-dashboard') {
      return <DoctorDashboard />;
    }
    if (profile.role === 'patient' || currentPage === 'patient-dashboard') {
      return <PatientPage />;
    }
    // Fallback for authenticated user with no role page
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  // --- Public Routes ---
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
