import React, { useState, useEffect } from "react";
import axios from "axios";

const SystemSettings = () => {
  const [smtp, setSmtp] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    encryption: "SSL",
    from_address: "",
  });

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch SMTP settings on component mount
  useEffect(() => {
    const fetchSmtpSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/smtp-settings`);
        if (response.data.smtp) {
          setSmtp({
            host: response.data.smtp.MAIL_HOST || "",
            port: response.data.smtp.MAIL_PORT || "",
            username: response.data.smtp.MAIL_USERNAME || "",
            password: response.data.smtp.MAIL_PASSWORD || "", // Show the password from database
            encryption: response.data.smtp.MAIL_ENCRYPTION || "SSL",
            from_address: response.data.smtp.MAIL_FROM_ADDRESS || "",
          });
        }
      } catch (err) {
        console.error('Error fetching SMTP settings:', err);
        setError('Failed to load SMTP settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSmtpSettings();
  }, []);

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtp({ ...smtp, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords({ ...passwords, [name]: value });
  };

  const handleUpdatePassword = async () => {
    try {
      if (passwords.newPassword !== passwords.confirmPassword) {
        setError('New password and confirm password do not match');
        return;
      }

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/update-password`, {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });

      setSuccessMessage('Password updated successfully');
      setPasswords({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const handleUpdateSmtp = async () => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/smtp-settings`, {
        MAIL_HOST: smtp.host,
        MAIL_PORT: smtp.port,
        MAIL_USERNAME: smtp.username,
        MAIL_PASSWORD: smtp.password || undefined, // Only send if provided
        MAIL_ENCRYPTION: smtp.encryption,
        MAIL_FROM_ADDRESS: smtp.from_address
      });

      setSuccessMessage('SMTP settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating SMTP settings:', err);
      setError(err.response?.data?.error || 'Failed to update SMTP settings');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-10">
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccessMessage(null)}>
              <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        
        {/* ================= ADMIN PASSWORD ================= */}
        <div>
          <h3 className="text-xl font-semibold text-slate-800 mb-6">
            Change Admin Password
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Old Password
              </label>
              <input
                type="password"
                name="oldPassword"
                value={passwords.oldPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button 
            onClick={handleUpdatePassword} 
            className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
            Update Password
          </button>
        </div>  



        {/* ================= SMTP SETTINGS ================= */}
        <div>
          <h3 className="text-xl font-semibold text-slate-800 mb-6">
            SMTP Email Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {
            [
              ["MAIL_HOST", "host"],
              ["MAIL_PORT", "port"],
              ["MAIL_USERNAME", "username"],
              ["MAIL_FROM_ADDRESS", "from_address"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  type="text"
                  name={key}
                  value={smtp[key]}
                  onChange={handleSmtpChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MAIL_PASSWORD
              </label>
              <input
                type="text"
                name="password"
                value={smtp.password}
                onChange={handleSmtpChange}
                placeholder="Enter new password or leave blank to keep current"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Encryption */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MAIL_ENCRYPTION
              </label>
              <select
                name="encryption"
                value={smtp.encryption}
                onChange={handleSmtpChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="SSL">SSL</option>
                <option value="TLS">TLS</option>
                <option value="">None</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleUpdateSmtp} 
            className="mt-6 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition">
            Update SMTP Settings
          </button>
        </div>



      </div>
    </>
  );
};

export default SystemSettings;
