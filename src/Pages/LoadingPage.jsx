import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

const LoadingPage = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Waiting for exam to start...');
  const [student, setStudent] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [error, setError] = useState(null);

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
        setMessage('Failed to retrieve PC fingerprint');
      }
    };
    fetchFingerprint();
  }, []);

  useEffect(() => {
    if (!fingerprint) return;
    const macAddress = fingerprint.macAddress;
    const uuid = fingerprint.uuid;
    console.log('MAC Address:', macAddress);

    let checkInterval;
    let pollInterval;

    const checkAutoLogin = async () => {
      try {
        // Check for auto-login session
        const checkResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/check-auto-login`, {
          params: { macAddress }
        });

        if (checkResponse.data.eligible) {
          const session = checkResponse.data.session;

          // Set student from session
          setStudent(session.student);
          localStorage.setItem('student', JSON.stringify(session.student));
          if (window.electronAPI) {
            await window.electronAPI.store.set('student', session.student);
          }
          setMessage('Authenticated. Waiting for exam to start...');

          // Update session status to logged_in
          await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/login-sessions/${session._id}`, {
            status: 'logged_in'
          });

          // Clear the check interval
          clearInterval(checkInterval);

          // Start polling for exam status
          pollInterval = setInterval(async () => {
            try {
              const statusResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/check-exam-status`, {
                params: { macAddress, studentId: session.student._id }
              });

              if (statusResponse.data.examStarted) {
                localStorage.setItem('examAssignment', JSON.stringify(statusResponse.data.assignment));
                if (window.electronAPI) {
                  await window.electronAPI.store.set('examAssignment', statusResponse.data.assignment);
                }
                clearInterval(pollInterval);
                navigate('/dashboard');
              }
            } catch (error) {
              console.error('Error checking exam status:', error);
              setMessage('Error checking exam status. Retrying...');
            }
          }, 5000); // Poll every 5 seconds
        } else {
          const reason = checkResponse.data.reason || 'Unknown reason';
          console.log('Not eligible for auto-login:', reason);
          setMessage(`Waiting for assignment... (${reason})`);
        }
      } catch (error) {
        console.error('Check auto-login error:', error);
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        setMessage(`Error checking auto-login: ${errorMsg}`);
      }
    };

    // Check every 5 seconds
    checkInterval = setInterval(checkAutoLogin, 5000);

    // Initial check
    checkAutoLogin();

    // Cleanup on unmount
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fingerprint, navigate]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: '#f5f5f5' }}
    >
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" align="center">
        {message}
      </Typography>

      <Button
        variant="outlined"
        color="primary"
        sx={{ mt: 4 }}
        onClick={() => navigate('/register')}
      >
        Register Device
      </Button>
    </Box>
  );
};

export default LoadingPage;
