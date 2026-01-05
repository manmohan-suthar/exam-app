import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Alert, Select, MenuItem, FormControl, InputLabel, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StartExamPanel = () => {
  const [assignments, setAssignments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedPC, setSelectedPC] = useState('');

  const navigate = useNavigate();

  // Check if admin is logged in
  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      navigate('/admin-login');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudent && registrations.length > 0) {
      // Automatically select the first active PC
      const activePC = registrations.find(reg => reg.status === 'active');
      if (activePC) {
        setSelectedPC(activePC.macAddress);
        setMessage(''); // Clear any previous message
      } else {
        setSelectedPC('');
        setMessage('No active PCs available');
      }
    } else {
      setSelectedPC('');
      setMessage('');
    }
  }, [selectedStudent, registrations]);


  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, regRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/registrations`)
      ]);
      // Filter assignments for today (using IST)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const todayIST = new Date(now.getTime() + istOffset);
      todayIST.setUTCHours(0, 0, 0, 0);
      const tomorrowIST = new Date(todayIST.getTime() + 24 * 60 * 60 * 1000);
      const todaysAssignments = assignRes.data.assignments.filter(assignment =>
        new Date(assignment.exam_date) >= todayIST && new Date(assignment.exam_date) < tomorrowIST
      );
      setAssignments(todaysAssignments);
      setRegistrations(regRes.data.registrations);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginStudent = async () => {
    if (!selectedStudent || !selectedPC) {
      setMessage('Please select a student and a PC');
      return;
    }
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/start-exam`, {
        studentId: selectedStudent,
        macAddress: selectedPC
      });
      setMessage('Student logged in successfully on the selected device');
      // The student will be automatically logged in on the device
    } catch (error) {
      console.error('Error starting exam:', error);
      setMessage(error.response?.data?.error || 'Error logging in student');
    }
  };


  const todaysStudents = assignments
  .filter(assignment => !assignment.examStarted) // ✅ ONLY Pending
  .map(assignment => assignment.student)
  .filter((student, index, self) =>
    self.findIndex(s => s._id === student._id) === index
  );


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Start Exam - Login Student
      </Typography>
      {message && (
        <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      {/* Single Form for Student Login and Auto-Login Configuration */}
      <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Student Login Configuration
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Student</InputLabel>
          <Select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            label="Select Student"
          >
            {todaysStudents.map(student => (
              <MenuItem key={student._id} value={student._id}>
                {student.name} ({student.student_id})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select PC</InputLabel>
          <Select
            value={selectedPC}
            onChange={(e) => setSelectedPC(e.target.value)}
            label="Select PC"
          >
            {registrations.filter(reg => reg.status === 'active').map(reg => (
              <MenuItem key={reg._id} value={reg.macAddress}>
                {reg.pcName} - {reg.macAddress} ({reg.centerName})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Play />}
          onClick={handleLoginStudent}
          disabled={!selectedStudent || !selectedPC}
          fullWidth
        >
          Login Student
        </Button>
      </Box>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Today's Exam Assignments
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Exam Type</TableCell>
                <TableCell>Exam Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment._id}>
                  <TableCell>{assignment.student.name}</TableCell>
                  <TableCell>{assignment.student.student_id}</TableCell>
                  <TableCell>{Array.isArray(assignment.exam_type) ? assignment.exam_type.join(', ') : assignment.exam_type}</TableCell>
                  <TableCell>{new Date(assignment.exam_date).toLocaleDateString()}</TableCell>
                  <TableCell>{assignment.examStarted ? 'Started' : 'Pending'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {assignments.length === 0 && !loading && (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No exam assignments for today.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default StartExamPanel;