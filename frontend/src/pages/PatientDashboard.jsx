import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { AlertTriangle, Send, LogOut } from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [queries, setQueries] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');

  const fetchQueries = async () => {
    const { data } = await api.get('/queries');
    setQueries(data);
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/queries', { title, description, category, patientId: user.id });
    setTitle('');
    setDescription('');
    fetchQueries();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}</h1>
          <p className="text-gray-500">Patient Dashboard</p>
        </div>
        <button onClick={logout} className="flex items-center text-red-500 hover:text-red-700">
          <LogOut size={18} className="mr-2" /> Logout
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Post a Query</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
              <option>General</option>
              <option>Cardiology</option>
              <option>Dermatology</option>
              <option>Neurology</option>
            </select>
            <textarea placeholder="Describe your symptoms..." value={description} onChange={e => setDescription(e.target.value)} required rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg flex justify-center items-center hover:bg-blue-700 transition">
              <Send size={18} className="mr-2" /> Submit Query
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Community Board</h2>
          {queries.map(q => (
            <div key={q._id} className={`p-5 rounded-xl border ${q.aiTriage.isEmergency ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{q.title}</h3>
                <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded-full">{q.category}</span>
              </div>
              <p className="text-gray-600 mt-2">{q.description}</p>
              
              {q.aiTriage.isEmergency && (
                <div className="mt-3 flex items-center text-red-600 bg-red-100 px-3 py-2 rounded-lg text-sm font-semibold">
                  <AlertTriangle size={16} className="mr-2" />
                  Urgent: AI detected emergency keywords (Confidence: {q.aiTriage.confidenceScore})
                </div>
              )}
              
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold text-gray-500 mb-2">Doctor Responses</p>
                <ResponsesList queryId={q._id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ResponsesList = ({ queryId }) => {
  const [responses, setResponses] = useState([]);
  
  useEffect(() => {
    const fetchResponses = async () => {
      const { data } = await api.get(`/responses/query/${queryId}`);
      setResponses(data);
    };
    fetchResponses();
  }, [queryId]);

  const handleRate = async (responseId, rating) => {
    await api.post(`/responses/${responseId}/rate`, { rating });
    // refresh
    const { data } = await api.get(`/responses/query/${queryId}`);
    setResponses(data);
  };

  if (responses.length === 0) return <p className="text-sm text-gray-400">No responses yet.</p>;

  return (
    <div className="space-y-3">
      {responses.map(r => (
        <div key={r._id} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-sm text-blue-600">{r.doctorId?.name || 'Doctor'}</span>
            <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">{r.doctorId?.plusRank}</span>
          </div>
          <p className="text-sm text-gray-800">{r.currentContent}</p>
          {!r.rating && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs text-gray-500">Rate this answer:</span>
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => handleRate(r._id, star)} className="text-yellow-400 hover:scale-110 transition">★</button>
              ))}
            </div>
          )}
          {r.rating && <p className="text-xs text-green-600 mt-2">You rated this {r.rating}/5 stars.</p>}
        </div>
      ))}
    </div>
  );
};

export default PatientDashboard;
