import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { DeleteAccount } from './pages/DeleteAccount';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AnnouncementModal } from './components/AnnouncementModal';

const MainApp = () => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState(() => localStorage.getItem('pending_verification_email') || '');

  const navigateTo = (page, data = null) => {
    if (data?.email) {
      setRegisteredEmail(data.email);
      localStorage.setItem('pending_verification_email', data.email);
    }
    setCurrentPage(page);
  };

  // Determine active view
  const renderPage = () => {
    if (isAuthenticated) {
      if (isAdmin && currentPage !== 'participant') {
        return <AdminDashboard onNavigate={navigateTo} />;
      }
      return <ParticipantDashboard onNavigate={navigateTo} />;
    }

    switch (currentPage) {
      case 'register':
        return <Register onNavigate={navigateTo} setRegisteredEmail={setRegisteredEmail} />;
      case 'verify-email':
        return <VerifyEmail email={registeredEmail} onNavigate={navigateTo} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={navigateTo} />;
      case 'delete-account':
        return <DeleteAccount onNavigate={navigateTo} />;
      case 'login':
      default:
        return <Login onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      {isAuthenticated && !isAdmin && <AnnouncementModal />}
      {renderPage()}
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
