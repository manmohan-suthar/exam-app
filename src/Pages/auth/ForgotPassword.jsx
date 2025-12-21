import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminEmail, setAdminEmail] = useState(false);


  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/forgot/admin`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
  
        console.log(response.data.mail);
        setAdminEmail(response.data.mail);
      } catch (error) {
        console.error("Failed to fetch admin email", error);
      }
    };
  
    fetchEmail();
  }, []);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/forgot/admin/forgot-password`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setLoading(false);
      setSuccess(response.data.message);
      setEmail("");
    } catch (error) {
      setLoading(false);
      setError(
        error.response?.data?.message || "Failed to send reset link. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 items-center justify-center relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1553877522-43269d4ea984"
          alt="Forgot Password Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-50"></div>

        <div className="relative z-10 text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">Forgot Password?</h2>
          <p className="text-lg text-white/80">
            Don’t worry — we’ll help you recover your account
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full h-[96vh] overflow-y-scroll lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reset Password
            </h1>
            <p className="text-gray-600">
              Enter your registered email address
            </p>
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
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={adminEmail}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Remember your password?{" "}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                onClick={() => navigate("/admin-login")}
              >
                Login
              </button>
            </p>

            <p className="text-gray-600">
              Back to{" "}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                onClick={() => navigate("/")}
              >
                Home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
