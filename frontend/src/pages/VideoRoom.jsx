import React, { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { PhoneOff, Video } from 'lucide-react';

const VideoRoom = () => {
  const { id } = useParams(); // Doctor ID
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const endSession = async () => {
    // Only the doctor needs to explicitly unlock, or either can trigger it
    // Let's trigger it for the doctor
    if (user.role === 'DOCTOR' || user.role === 'PATIENT') {
       try {
         await api.post(`/doctors/${id}/end-session`);
       } catch (e) {
         console.error('Error ending session', e);
       }
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center relative">
      
      <div className="absolute top-8 left-8 text-white font-bold text-xl flex items-center">
        <Video className="mr-2" /> Live Consultation
      </div>

      <div className="w-full max-w-4xl grid grid-cols-2 gap-4 p-8">
        <div className="bg-gray-800 rounded-2xl aspect-video flex items-center justify-center border border-gray-700 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-3xl animate-pulse"></div>
          <span className="text-gray-400 font-semibold z-10">Patient Cam (Mock)</span>
        </div>
        
        <div className="bg-gray-800 rounded-2xl aspect-video flex items-center justify-center border border-gray-700 shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 bg-green-900/20 backdrop-blur-3xl animate-pulse"></div>
           <span className="text-gray-400 font-semibold z-10">Dr. Cam (Mock)</span>
        </div>
      </div>

      <div className="mt-8">
        <button onClick={endSession} className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105">
          <PhoneOff className="mr-2" /> End Session
        </button>
      </div>

    </div>
  );
};

export default VideoRoom;
