import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    student_id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fingerprint, setFingerprint] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchFingerprint = async () => {
      try {
        if (!window.electronAPI?.getFingerprint) {
          throw new Error('electronAPI not available');
        }
        const fp = await window.electronAPI.getFingerprint();
        setFingerprint(fp);
      } catch (err) {
        console.error('Failed to get fingerprint:', err);
        // For testing, set default fingerprint if getFingerprint fails
        const defaultFingerprint = {
          macAddress: '00:00:00:00:00:00',
          uuid: 'test-uuid-123',
          hostname: 'test-hostname',
          platform: 'test-platform'
        };
        setFingerprint(defaultFingerprint);
      }
    };
    fetchFingerprint();
  }, []);

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
    if (!formData.student_id.trim() || !formData.password.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const defaultFingerprint = {
        macAddress: '00:00:00:00:00:00',
        uuid: 'test-uuid-123',
        hostname: 'test-hostname',
        platform: 'test-platform'
      };

      const payload = {
        ...formData,
        ...(fingerprint || defaultFingerprint)
      };

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, payload);
      setSuccess('Login successful! Redirecting...');

      // Store student data in localStorage and electron-store
      localStorage.setItem('student', JSON.stringify(response.data.student));
      if (window.electronAPI) {
        await window.electronAPI.store.set('student', response.data.student);
      }

      localStorage.setItem('registration', JSON.stringify(response.data.registration));
      if (window.electronAPI) {
        await window.electronAPI.store.set('registration', response.data.registration);
      }

      if (response.data.assignments) {
        localStorage.setItem('assignments', JSON.stringify(response.data.assignments));
        if (window.electronAPI) {
          await window.electronAPI.store.set('assignments', response.data.assignments);
        }
      }

      // Redirect based on role
      setTimeout(() => {
        if (response.data.student.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/dashboard');
        }
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-teal-800 items-center justify-center relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
          alt="Background Image"
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black opacity-50"></div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Login</h1>
            <p className="text-gray-600">Access your exam dashboard</p>
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
              <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-2">
                Student ID *
              </label>
              <input
                type="text"
                id="student_id"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                placeholder="Enter your student ID"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            {fingerprint && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">PC Verification (Auto-detected)</h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <p><strong>MAC Address:</strong> {fingerprint.macAddress}</p>
                  <p><strong>UUID:</strong> {fingerprint.uuid}</p>
                  <p><strong>Hostname:</strong> {fingerprint.hostname}</p>
                  <p><strong>Platform:</strong> {fingerprint.platform}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Need to register PC?{' '}
              <button
                type="button"
                className="text-green-600 hover:text-green-800 font-medium transition-colors"
                onClick={() => navigate('/register')}
              >
                Register
              </button>
            </p>
            <p className="text-gray-600">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
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

export default LoginPage;

