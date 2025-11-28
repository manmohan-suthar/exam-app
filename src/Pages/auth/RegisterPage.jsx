import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    centerName: '',
    centerAddress: '',
    pcName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fingerprint, setFingerprint] = useState(null);

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
        setError('Failed to retrieve PC fingerprint');
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

    if (!formData.centerName.trim() || !formData.centerAddress.trim() || !formData.pcName.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (!fingerprint) {
      setError('PC fingerprint not available');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData, ...fingerprint };
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, payload);
      setSuccess('Registration successful!');
      setFormData({ centerName: '', centerAddress: '', pcName: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 items-center justify-center relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170"
          alt="Registration Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PC Registration</h1>
            <p className="text-gray-600">Register your PC for the Online Exam system</p>
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
              <label htmlFor="centerName" className="block text-sm font-medium text-gray-700 mb-2">
                Center Name *
              </label>
              <input
                type="text"
                id="centerName"
                name="centerName"
                value={formData.centerName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter center name"
                required
              />
            </div>

            <div>
              <label htmlFor="centerAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Center Address *
              </label>
              <textarea
                id="centerAddress"
                name="centerAddress"
                value={formData.centerAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Enter center address"
                required
              />
            </div>

            <div>
              <label htmlFor="pcName" className="block text-sm font-medium text-gray-700 mb-2">
                PC Name *
              </label>
              <input
                type="text"
                id="pcName"
                name="pcName"
                value={formData.pcName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter PC name"
                required
              />
            </div>

            {fingerprint && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">PC Fingerprint (Auto-detected)</h3>
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
              disabled={loading || !fingerprint}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Registering...' : 'Register PC'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-gray-600">
              Have an account?{' '}
              {/* Either a button using navigate... */}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              {/* ...or a Link (also fine): */}
              {/* <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Login</Link> */}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
