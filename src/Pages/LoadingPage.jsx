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
  const pollRefs = React.useRef({}); 
  
  useEffect(() => {
    const handleHotkeys = (e) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrlOrCmd || !e.shiftKey) return;
  
      // helper — stop polling before navigate
      const stopAllPolling = () => {
        if (pollRefs.current?.main) clearInterval(pollRefs.current.main);
        if (pollRefs.current?.poll) clearInterval(pollRefs.current.poll);
        pollRefs.current = {};
        console.log('✅ All polling stopped before navigation');
      };
  
      // Ctrl/Cmd + Shift + R  →  /register
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopPropagation();
        stopAllPolling();
        navigate('/register');
      }
  
      // Ctrl/Cmd + Shift + A  →  /admin-login
      if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        stopAllPolling();
        navigate('/admin-login');
      }
      // Ctrl/Cmd + Shift + A  →  /admin-login
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        e.stopPropagation();
        stopAllPolling();
        navigate('/update-page');
      }
    };
  
    window.addEventListener('keydown', handleHotkeys, true);
    return () => window.removeEventListener('keydown', handleHotkeys, true);
  }, [navigate]);
  
  
  


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
                // 1. Fetch all assignments for this student on this PC
                const statusResponse = await axios.get(
                  `${import.meta.env.VITE_API_BASE_URL}/admin/check-exam-status`,
                  { params: { macAddress, studentId } }
                );
           
            
                // 2. Check if all assignments completed
                if (statusResponse.data.allCompleted) {
                  setMessage("All exams are completed. Contact administrator.");
                  clearInterval(pollInterval);
                  return;
                }
            
                const { examStarted, assignment } = statusResponse.data;
            
                // 3. If no active assignment, wait
                if (!assignment) {
                  setMessage("Waiting for assignment...");
                  return;
                }
            
                // 4. If assignment already completed, skip
                if (assignment.status === "completed") {
                  setMessage("Exam already completed. Please contact administrator.");
                  return;
                }
            
                // 5. If assignment not started, start it dynamically
                if (!examStarted) {
                  // Start the exam automatically
                  await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/start-exam`, {
                    assignmentId: assignment._id
                  });
                }
            
                // 6. Save and navigate to dashboard
                localStorage.setItem("examAssignment", JSON.stringify(assignment));
                if (window.electronAPI) {
                  await window.electronAPI.store.set("examAssignment", assignment);
                }
            
                navigate("/dashboard");
            
              } catch (error) {
                console.error("Error checking exam status:", error);
                setMessage("Error checking exam status. Retrying...");
              }
            }, 5000);
            
            
             // Poll every 5 seconds
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
    pollRefs.current.main = setInterval(checkForAssignment, 5000);

    // Initial check
    checkForAssignment();

    // Cleanup on unmount
    return () => {
      if (pollRefs.current?.main) clearInterval(pollRefs.current.main);
      if (pollRefs.current?.poll) clearInterval(pollRefs.current.poll);
      pollRefs.current = {};
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


    </Box>
  );
};

export default LoadingPage;
