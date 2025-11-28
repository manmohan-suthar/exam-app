import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const ExamPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);

  useEffect(() => {
    // Get exam data from localStorage or API
    const examAssignment = localStorage.getItem('examAssignment');
    if (examAssignment) {
      setExamData(JSON.parse(examAssignment));
      setLoading(false);
    } else {
      // Redirect back if no exam data
      navigate('/');
    }
  }, [navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Exam in Progress
      </Typography>
      <Typography variant="body1">
        Exam Type: {examData?.exam_type}
      </Typography>
      <Typography variant="body1">
        Duration: {examData?.duration} minutes
      </Typography>
      {/* Add exam components here based on type */}
    </Box>
  );
};

export default ExamPage;