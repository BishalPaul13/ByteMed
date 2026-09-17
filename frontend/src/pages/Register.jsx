import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [credentials, setCredentials] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ name, email, password, role, credentials });
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-4">
            <Stethoscope size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Join ByteMed</h2>
          <p className="text-sm text-gray-500">Create an account to get started.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 mt-1 border rounded-lg">
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
            </select>
          </div>
          {role === 'DOCTOR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Medical Credentials (Mock URL)</label>
              <input type="text" value={credentials} onChange={e => setCredentials(e.target.value)} required
                className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="https://verify.me/doc" />
            </div>
          )}
          <button type="submit" className="w-full py-2 font-bold text-white transition-all bg-purple-600 rounded-lg hover:bg-purple-700">
            Register
          </button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-purple-600 hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
