import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { LogOut, Video } from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [queries, setQueries] = useState([]);
  const [availability, setAvailability] = useState('OFFLINE');
  const navigate = useNavigate();

  const fetchQueries = async () => {
    const { data } = await api.get('/queries');
    setQueries(data);
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const toggleAvailability = async () => {
    const newState = availability === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    await api.put(`/doctors/${user.id}/availability`, { availability: newState });
    setAvailability(newState);
  };

  const handleBook = async () => {
     try {
       const { data } = await api.post(`/doctors/${user.id}/book`);
       navigate(data.roomUrl);
     } catch(err) {
       alert('Failed to book. State might have changed.');
     }
  };

  if (user.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto p-12 mt-10 bg-white rounded-xl shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800">Account Pending Verification</h2>
        <p className="mt-4 text-gray-600">Your credentials are being reviewed by an admin. You will be able to contribute once verified.</p>
        <button onClick={logout} className="mt-6 text-blue-600 underline">Logout</button>
        
        {/* Mock verification trigger for prototype */}
        <div className="mt-12 p-4 bg-gray-100 rounded-lg border border-dashed">
          <p className="text-sm font-bold text-gray-500 mb-2">Prototype Action (Admin Mock)</p>
          <button onClick={async () => {
            await api.put(`/doctors/${user.id}/approve`);
            window.location.reload();
          }} className="px-4 py-2 bg-green-500 text-white rounded">Approve My Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dr. {user.name}</h1>
          <div className="flex items-center space-x-3 mt-1">
             <span className="text-sm font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">{user.plusRank}</span>
             <span className="text-gray-500 text-sm">Doctor Dashboard</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Live Status:</span>
            <button onClick={toggleAvailability} 
              className={`px-4 py-1.5 rounded-full font-bold text-sm transition ${availability === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {availability}
            </button>
          </div>
          
          {availability === 'AVAILABLE' && (
            <button onClick={handleBook} className="flex items-center bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
              <Video size={16} className="mr-2"/> Test Booking (Mock Patient)
            </button>
          )}

          <button onClick={logout} className="flex items-center text-red-500 hover:text-red-700 ml-4">
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4">Open Queries</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {queries.map(q => (
             <QueryCard key={q._id} query={q} doctorId={user.id} refresh={fetchQueries} />
          ))}
        </div>
      </div>
    </div>
  );
};

const QueryCard = ({ query, doctorId, refresh }) => {
  const [reply, setReply] = useState('');
  
  const submitReply = async () => {
    await api.post('/responses', { queryId: query._id, doctorId, content: reply });
    setReply('');
    refresh();
  };

  return (
    <div className={`p-5 rounded-xl border ${query.aiTriage.isEmergency ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
       <div className="flex justify-between items-start">
         <h3 className="font-bold">{query.title}</h3>
         <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">{query.category}</span>
       </div>
       <p className="text-sm text-gray-600 mt-2">{query.description}</p>
       
       <div className="mt-4 pt-4 border-t border-gray-200/50">
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Provide medical advice..."
             className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
          <button onClick={submitReply} className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Submit Response</button>
       </div>
    </div>
  );
};

export default DoctorDashboard;
