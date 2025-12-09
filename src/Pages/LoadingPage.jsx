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
    console.log('MAC Address:', macAddress);

    let pollInterval;

    const checkForAssignment = async () => {
      try {
        // Get the registration for this PC
        const regResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/registrations`);
        const registration = regResponse.data.registrations.find(reg => reg.macAddress === macAddress);

        if (registration && registration.studentId) {
          const studentId = registration.studentId;

          // Get student details
          const studentResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/students`);
          const student = studentResponse.data.students.find(s => s._id === studentId);

          if (student) {
            setStudent(student);
            localStorage.setItem('student', JSON.stringify(student));
            if (window.electronAPI) {
              await window.electronAPI.store.set('student', student);
            }
            setMessage('Student authenticated. Waiting for exam to start...');

            // Start polling for exam status
            pollInterval = setInterval(async () => {
              try {
                const statusResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/check-exam-status`, {
                  params: { macAddress, studentId }
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
            setMessage('Student not found. Waiting for assignment...');
          }
        } else {
          setMessage('Waiting for student assignment...');
        }
      } catch (error) {
        console.error('Error checking for assignment:', error);
        setMessage('Error checking for assignment. Retrying...');
      }
    };

    // Check every 5 seconds
    const checkInterval = setInterval(checkForAssignment, 5000);

    // Initial check
    checkForAssignment();

    // Cleanup on unmount
    return () => {
      clearInterval(checkInterval);
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
