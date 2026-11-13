import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import VideoRoom from './pages/VideoRoom';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading ByteMed...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" />;
    return <Navigate to={user.role === 'DOCTOR' ? '/doctor' : '/patient'} />;
  }
  return children;
};

const DefaultRoute = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading ByteMed...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" />;
  return user.role === 'DOCTOR' ? <Navigate to="/doctor" /> : <Navigate to="/patient" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/patient" element={<PrivateRoute role="PATIENT"><PatientDashboard /></PrivateRoute>} />
            <Route path="/doctor" element={<PrivateRoute role="DOCTOR"><DoctorDashboard /></PrivateRoute>} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin" element={<PrivateRoute role="ADMIN"><AdminDashboard /></PrivateRoute>} />
            <Route path="/room/:id" element={<PrivateRoute><VideoRoom /></PrivateRoute>} />
            <Route path="/" element={<DefaultRoute />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
