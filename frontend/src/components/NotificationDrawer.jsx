import React, { useState, useEffect } from 'react';
import api from '../api';
import { Bell, CheckCheck, ExternalLink, X, ShieldAlert, Award, MessageSquare, Video } from 'lucide-react';

const NotificationDrawer = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/notifications/user/${userId}`);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/user/${userId}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? ({ ...n, isRead: true }) : n));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  if (!isOpen) return null;

  const getIconForType = (type) => {
    switch (type) {
      case 'RANK_ADVANCEMENT':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'SESSION_INVITE':
      case 'SESSION_FEEDBACK_REQUIRED':
        return <Video className="w-4 h-4 text-cyan-400" />;
      case 'MODERATION_ALERT':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Activity Notifications</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={markAllAsRead}
              title="Mark all as read"
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/60 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No notifications at this time.</span>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n._id}
                onClick={() => markAsRead(n._id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  n.isRead 
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' 
                    : 'bg-indigo-950/20 border-cyan-500/30 text-white shadow-md shadow-cyan-500/5'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 mt-0.5 shrink-0">
                    {getIconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs truncate text-slate-100">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;

