// Test data to verify the changes
const exam = {
  _id: '69496d8fd1836d07ddb36309',
  student: { name: 'Test Student', student_id: '69391ea7e23612136027dad1' },
  exam_type: ['speaking'],
  exam_paper: { speaking_exam_paper: '692c1e45a07a541affa1ba64' },
  exam_date: '2025-12-22T00:00:00.000+00:00',
  status: 'assigned',
  is_visible: true,
  exam_tittle: 'test',
  exam_bio: 'test',
  agent: '69496a2dd1836d07ddb3567e',
  examStarted: true,
  auto_login_time: null,
  createdAt: '2025-12-22T16:10:55.886+00:00',
  updatedAt: '2025-12-22T16:11:21.321+00:00',
  __v: 0,
  pc: '69398bd227709338cba20fff'
};

// Test the getExamStatus function
const getExamStatus = (exam) => {
  if (exam.status === 'completed') return { status: 'completed', color: 'green' };
  if (exam.status === 'in_progress') return { status: 'in_progress', color: 'blue' };
  if (exam.status === 'available') return { status: 'available', color: 'yellow' };
  if (exam.status === 'assigned') return { status: 'assigned', color: 'yellow' };
  return { status: 'scheduled', color: 'gray' };
};

const examStatus = getExamStatus(exam);
console.log('Exam Status:', examStatus);

// Test the conditions for displaying the buttons
const isSpeaking = Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking';
const shouldShowButtons = examStatus.status === 'available' || examStatus.status === 'in_progress' || examStatus.status === 'assigned';

console.log('Is Speaking:', isSpeaking);
console.log('Should Show Buttons:', shouldShowButtons);

if (shouldShowButtons && isSpeaking) {
  console.log('Buttons should be displayed');
} else {
  console.log('Buttons should not be displayed');
}