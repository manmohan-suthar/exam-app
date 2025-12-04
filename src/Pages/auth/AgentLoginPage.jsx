import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AgentLoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    agent_id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.agent_id.trim() || !formData.password.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/agents/login`, formData);
      setSuccess('Login successful! Redirecting...');

      // Store agent data in localStorage
      localStorage.setItem('agent', JSON.stringify(response.data.agent));
      localStorage.setItem('agentToken', response.data.token);

      if (response.data.assignedExams) {
        localStorage.setItem('agentAssignedExams', JSON.stringify(response.data.assignedExams));
      }

      // Redirect to agent dashboard
      setTimeout(() => {
        navigate('/agent-dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 to-blue-800 items-center justify-center relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
          alt="Background Image"
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Agent Portal</h1>
          <p className="text-xl">Monitor and manage student exams</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Login</h1>
            <p className="text-gray-600">Access your monitoring dashboard</p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 mb-2">
                Agent ID *
              </label>
              <input
                type="text"
                id="agent_id"
                name="agent_id"
                value={formData.agent_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter your agent ID"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Logging in...' : 'Login as Agent'}
            </button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-gray-600">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                onClick={() => navigate('/login')}
              >
                Login as Student
              </button>
            </p>
            <p className="text-gray-600">
              <button
                type="button"
                className="text-green-600 hover:text-green-800 font-medium transition-colors"
                onClick={() => navigate('/admin-login')}
              >
                Login as Admin
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLoginPage;