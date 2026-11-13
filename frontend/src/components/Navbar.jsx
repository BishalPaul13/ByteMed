import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  HeartPulse, LogOut, ShieldCheck, User, Bell, Award, 
  ShieldAlert, Stethoscope, ChevronRight 
} from 'lucide-react';
import NotificationDrawer from './NotificationDrawer';
import api from '../api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get(`/notifications/user/${user.id}`);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
                <HeartPulse className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    Byte<span className="text-cyan-400">Med</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-wide uppercase">
                    8-Rank Platform
                  </span>
                </div>
              </div>
            </Link>

            {/* Core Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to={user?.role === 'DOCTOR' ? '/doctor' : '/patient'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  location.pathname === '/patient' || location.pathname === '/doctor'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {user?.role === 'DOCTOR' ? 'Doctor Portal' : 'Patient Portal'}
              </Link>

              <Link
                to="/leaderboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  location.pathname === '/leaderboard'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Leaderboard (Plus 1-8)</span>
              </Link>

              {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                    location.pathname === '/admin'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Trust & Ops</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Controls & Notification Bell */}
          {user ? (
            <div className="flex items-center space-x-3 sm:space-x-4">
              
              {/* Notification Bell */}
              <button
                onClick={() => setNotificationsOpen(true)}
                title="Activity notifications"
                className="relative p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-extrabold text-[10px] animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Role & Rank Badge */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
                  user.role === 'DOCTOR' 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                    : user.role === 'ADMIN'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {user.role === 'DOCTOR' ? 'Physician' : user.role === 'ADMIN' ? 'Safety Officer' : 'Patient'}
                </span>

                {user.role === 'DOCTOR' && user.status === 'VERIFIED' && (
                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}

                {user.role === 'DOCTOR' && user.plusRank && (
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {user.plusRank}
                  </span>
                )}
              </div>

              {/* User Profile Pill */}
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 font-bold text-xs border border-slate-700">
                  {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden lg:inline">
                  {user.role === 'DOCTOR' ? `Dr. ${user.name}` : user.name}
                </span>
              </div>

              {/* Sign out */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          )}

        </div>
      </header>

      {/* Notification Slide-Over */}
      <NotificationDrawer
        userId={user?.id}
        isOpen={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          setUnreadCount(0);
        }}
      />
    </>
  );
};

export default Navbar;
