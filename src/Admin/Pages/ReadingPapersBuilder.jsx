import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Save, Eye, Trash2, Edit, FileText, HelpCircle, CheckSquare, Type, FileText as FileTextIcon, Target, BookOpen } from 'lucide-react';
import Type1WordReplacement from '../Components/Type1WordReplacement';
import Type2GapFill from '../Components/Type2GapFill';
import Type3SentenceCompletion from '../Components/Type3SentenceCompletion';
import Type4MatchingHeadings from '../Components/Type4MatchingHeadings';
import Type5ReadingComprehension from '../Components/Type5ReadingComprehension';

const ReadingPapersBuilder = () => {
  const [papers, setPapers] = useState([]);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'builder', or 'preview'
  const [currentUnit, setCurrentUnit] = useState(1); // Current unit number (1-5)
  const [currentQuestion, setCurrentQuestion] = useState(0); // Current question index within unit
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchPapers();
    fetchAdmins();
  }, []);


  const fetchPapers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/reading-papers`);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/agents`);
      setAdmins(response.data.agents);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const createNewPaper = () => {
    setCurrentPaper({
      title: '',
      description: '',
      units: [
        {
          unitNumber: 1,
          title: 'Section 1',
          instructions: 'Read the text below and answer the questions.',
          questions: []
        },
        {
          unitNumber: 2,
          title: 'Section 2',
          instructions: 'Read the text below and answer the questions.',
          questions: []
        },
        {
          unitNumber: 3,
          title: 'Section 3',
          instructions: 'Read the text below and answer the questions.',
          questions: []
        },
        {
          unitNumber: 4,
          title: 'Section 4',
          instructions: 'Read the text below and answer the questions.',
          questions: []
        },
        {
          unitNumber: 5,
          title: 'Section 5',
          instructions: 'Read the text below and answer the questions.',
          questions: []
        }
      ],
      status: 'draft',
      estimatedTime: 60
    });
    setCurrentUnit(1);
    setCurrentQuestion(0);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const editPaper = (paper) => {
    // Create units structure and distribute questions based on unitNumber
    const paperWithUnits = { ...paper };
    const units = [
      {
        unitNumber: 1,
        title: 'Section 1',
        instructions: 'Read the text below and answer the questions.',
        questions: []
      },
      {
        unitNumber: 2,
        title: 'Section 2',
        instructions: 'Read the text below and answer the questions.',
        questions: []
      },
      {
        unitNumber: 3,
        title: 'Section 3',
        instructions: 'Read the text below and answer the questions.',
        questions: []
      },
      {
        unitNumber: 4,
        title: 'Section 4',
        instructions: 'Read the text below and answer the questions.',
        questions: []
      },
      {
        unitNumber: 5,
        title: 'Section 5',
        instructions: 'Read the text below and answer the questions.',
        questions: []
      }
    ];

    // Distribute questions across units based on unitNumber property
    if (paperWithUnits.questions && paperWithUnits.questions.length > 0) {
      paperWithUnits.questions.forEach((question) => {
        const unitIndex = (question.unitNumber || 1) - 1;
        if (unitIndex >= 0 && unitIndex < 5) {
          units[unitIndex].questions.push(question);
        } else {
          // If unitNumber is invalid, put in section 1
          units[0].questions.push(question);
        }
      });

      // Group type2_gap_fill questions back into single questions (type5 are already grouped)
      units.forEach((unit, unitIndex) => {
        const groupedQuestions = [];
        const type2Gaps = unit.questions.filter(q => q.type === 'type2_gap_fill');
        const otherQuestions = unit.questions.filter(q => q.type !== 'type2_gap_fill');

        if (type2Gaps.length > 0) {
          // Group all type2 gaps in this unit into one question
          const sortedGaps = type2Gaps.sort((a, b) => a.order - b.order);
          const gaps = sortedGaps.map((q, index) => ({
            gapNumber: index + 1,
            options: q.options,
            correctAnswer: q.correctAnswer
          }));

          const type2Question = {
            type: 'type2_gap_fill',
            question: paper.passages ? paper.passages[unitIndex]?.content || '' : '',
            instructions: type2Gaps[0].instructions || 'Read the text below and decide which option (A, B or C) best fits each gap.',
            gaps: gaps,
            unitNumber: unit.unitNumber,
            order: type2Gaps[0].order
          };
          groupedQuestions.push(type2Question);
        }

        groupedQuestions.push(...otherQuestions);
        unit.questions = groupedQuestions.sort((a, b) => a.order - b.order);
      });
    }


    paperWithUnits.units = units;
    delete paperWithUnits.passages; // Remove old structure
    delete paperWithUnits.questions; // Remove old structure

    setCurrentPaper(paperWithUnits);
    setCurrentUnit(1);
    setCurrentQuestion(0);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const savePaper = async () => {
    if (!currentPaper.title.trim()) {
      alert('Please enter a title for the paper');
      return;
    }

    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin'));

      // Create passages from units and collect all questions
      const flattenedPassages = [];
      const allQuestions = [];
      let globalQuestionNumber = 1;

      currentPaper.units?.forEach((unit, unitIndex) => {
        // Create one passage per unit
        flattenedPassages.push({
          title: unit.title,
          content: '',
          images: [],
          order: unitIndex,
          unitNumber: unit.unitNumber,
          sectionTitle: unit.title,
          globalIndex: flattenedPassages.length,
          localIndex: 0
        });

        // Collect questions from this unit
        if (unit.questions) {
          unit.questions.forEach((question) => {
            if (question.type === 'type2_gap_fill' && question.gaps) {
              // Set passage content to the text with gaps
              flattenedPassages[unitIndex].content = question.question;
              // For gap fill, create separate questions for each gap
              question.gaps.forEach((gap, index) => {
                allQuestions.push({
                  ...question,
                  type: 'type2_gap_fill',
                  question: `Gap ${gap.gapNumber || (index + 1)}`,
                  options: gap.options,
                  correctAnswer: gap.correctAnswer,
                  gapNumber: gap.gapNumber || (index + 1),
                  passageIndex: flattenedPassages.length - 1,
                  unitNumber: unit.unitNumber,
                  order: allQuestions.length,
                  questionNumber: globalQuestionNumber++
                });
              });
            } else if (question.type === 'type3_sentence_completion') {
              // Set passage content to the article text with gaps
              flattenedPassages[unitIndex].content = question.question;
              // For sentence completion, create a single question
              allQuestions.push({
                ...question,
                passageIndex: flattenedPassages.length - 1,
                unitNumber: unit.unitNumber,
                order: allQuestions.length,
                questionNumber: globalQuestionNumber++
              });
            } else if (question.type === 'type5_reading_comprehension') {
              // Set passage content to the article text
              flattenedPassages[unitIndex].content = question.question;
              // For reading comprehension, create separate question objects for each comprehension question
              question.comprehensionQuestions.forEach((cq, index) => {
                allQuestions.push({
                  type: 'type5_reading_comprehension',
                  question: cq.question,
                  instructions: question.instructions,
                  options: cq.options,
                  correctAnswer: cq.correctAnswer,
                  passageIndex: flattenedPassages.length - 1,
                  unitNumber: unit.unitNumber,
                  order: allQuestions.length,
                  questionNumber: globalQuestionNumber++,
                  maxWords: cq.maxWords,
                  questionType: cq.questionType
                });
              });
            } else {
              allQuestions.push({
                ...question,
                passageIndex: flattenedPassages.length - 1, // Reference to the passage index
                unitNumber: unit.unitNumber,
                order: allQuestions.length,
                questionNumber: globalQuestionNumber++
              });
            }
          });
        }
      });

      const paperData = {
        ...currentPaper,
        passages: flattenedPassages,
        questions: allQuestions,
        createdBy: currentPaper.createdBy || admin.admin
      };

      // Remove units from paperData as backend doesn't expect it
      delete paperData.units;

      if (currentPaper._id) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/reading-papers/${currentPaper._id}`, paperData);
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/reading-papers`, paperData);
        setCurrentPaper(response.data.paper);
      }

      await fetchPapers();
      alert('Paper saved successfully!');
    } catch (error) {
      console.error('Error saving paper:', error);
      alert('Error saving paper');
    } finally {
      setLoading(false);
    }
  };

  const deletePaper = async (id) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/reading-papers/${id}`);
      await fetchPapers();
      if (currentPaper && currentPaper._id === id) {
        setCurrentPaper(null);
        setIsEditing(false);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error deleting paper:', error);
      alert('Error deleting paper');
    }
  };


  const updateUnit = (unitNumber, updates) => {
    if (!currentPaper || !currentPaper.units) return;

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === unitNumber ? { ...unit, ...updates } : unit
    );
    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };


  // Question management functions
  const addQuestionToUnit = (questionType) => {
    if (!currentPaper || !currentPaper.units) return;

    const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
    if (!currentUnitData) return;

    const questions = currentUnitData.questions || [];

    let newQuestion;
    switch (questionType) {
      case 'type1_word_replacement':
        newQuestion = {
          type: 'type1_word_replacement',
          question: '',
          instructions: 'Read the sentences below and decide which option (A, B, C or D) can best replace the word in bold so that the meaning of the sentence remains the same.',
          options: [
            { letter: 'A', text: '' },
            { letter: 'B', text: '' },
            { letter: 'C', text: '' },
            { letter: 'D', text: '' }
          ],
          correctAnswer: '',
          unitNumber: currentUnit,
          order: questions.length
        };
        break;
      case 'type2_gap_fill':
        newQuestion = {
          type: 'type2_gap_fill',
          question: '',
          instructions: 'Read the text below and decide which option (A, B or C) best fits each gap.',
          gaps: [
            {
              gapNumber: 1,
              options: [
                { letter: 'A', text: '' },
                { letter: 'B', text: '' },
                { letter: 'C', text: '' }
              ],
              correctAnswer: ''
            },
            {
              gapNumber: 2,
              options: [
                { letter: 'A', text: '' },
                { letter: 'B', text: '' },
                { letter: 'C', text: '' }
              ],
              correctAnswer: ''
            }
          ],
          unitNumber: currentUnit,
          order: questions.length
        };
        break;
      case 'type3_sentence_completion':
        newQuestion = {
          type: 'type3_sentence_completion',
          question: '',
          instructions: 'Read the article from an international news magazine. Drag and drop the correct sentence to complete the gaps in the text. There are extra sentences you will not need.',
          sentences: [
            { letter: 'A', text: '', isExtra: false },
            { letter: 'B', text: '', isExtra: false },
            { letter: 'C', text: '', isExtra: false },
            { letter: 'D', text: '', isExtra: false },
            { letter: 'E', text: '', isExtra: false },
            { letter: 'F', text: '', isExtra: false },
            { letter: 'G', text: '', isExtra: false },
            { letter: 'H', text: '', isExtra: true },
            { letter: 'I', text: '', isExtra: true },
            { letter: 'J', text: '', isExtra: true }
          ],
          gapMappings: [],
          unitNumber: currentUnit,
          order: questions.length
        };
        break;
      case 'type4_matching_headings':
        newQuestion = {
          type: 'type4_matching_headings',
          question: '',
          instructions: 'Read the texts below. There are questions about the texts. Which text gives you the answer to each question? Drag and drop the correct text to answer each question.',
          texts: [],
          matchingQuestions: [],
          unitNumber: currentUnit,
          order: questions.length
        };
        break;
      case 'type5_reading_comprehension':
        newQuestion = {
          type: 'type5_reading_comprehension',
          question: 'The picture gets even more complicated, however, once we take into account the \'dark matter\' of intelligence. In the intelligence field, there is a distinction between \'fluid\' intelligence (abstract reasoning and pattern detection) and \'crystallized\' intelligence (vocabulary and general knowledge). But domain-specific knowledge – the dark matter of intelligence – is not identical to either fluid or crystallized intelligence. Most IQ tests, which were only ever designed for testing schoolchildren, do not include the rich depth of knowledge acquired after extensive immersion in a field. So, while it is true that, when measured by the standards of youth, middle-aged adults might not be as \'intelligent\' as young adults, once dark matter is taken into account, middle-aged adults might well be up to par.\n\nProfessor Phillip Ackerman from the Georgia Institute of Technology wonders whether we should be judging adult intelligence by the same standard we judge childhood intelligence. To dive deeper into this question, Ackerman administered a wide variety of domain-specific knowledge tests to 288 adults who were educated to college level and between the ages of 21 and 62. Domains included art, music, world literature, biology, physics, psychology, technology, law, astronomy and electronics. Ackerman found that in general, middle-aged adults are more knowledgeable in many domains compared with younger adults. As for the implications of this finding, his paper states: \'Many intellectually demanding tasks in the real world cannot be accomplished without a vast repertoire of declarative knowledge and procedural skills.\' Using an example from academia and how several years of intense study and empirical research experience are required before even the best college student could be expected to deliver a flawless doctoral thesis defense, he argues: \'knowledge does not compensate for a declining adult intelligence; it is intelligence!\'\n\nThere was an important exception to Ackerman\'s finding, however. All three science-related tests were negatively associated with age. Tellingly, these three tests were most strongly correlated with fluid intelligence. Nevertheless, on the whole, these results should be considered good news for older adults. Unless you are trying to win the Nobel Prize for Physics at a very old age, there are a lot of domains of knowledge that you can continue to learn in throughout your life. What is more, Ackerman found that certain measures of personality, such as intellectual curiosity, were related to domain-specific knowledge above and beyond the effects of standard measures of intelligence.\n\nAnd if you do want to maintain your fluid intelligence as long as possible, there is recent research suggesting that having a greater purpose in life can help protect against cognitive decline among older adults. Professor Giyeon Kim and her colleagues at Chung-Ang University in the Republic of Korea looked at various aspects of purpose, including: whether one cares about the future and whether one has a good sense of what one wishes to accomplish in the future. They found that purpose in life actedas a protective factor against cognitive decline and have argued that it could be used as a treatment technique for cognitive decline in clinical settings.',
          instructions: 'Read the article about intelligence and ageing and answer the questions.',
          comprehensionQuestions: [
            {
              questionNumber: 1,
              question: 'According to the article, what is the main difference between fluid and crystallized intelligence?',
              questionType: 'multiple_choice',
              options: [
                { letter: 'A', text: 'Fluid intelligence is more important for adults' },
                { letter: 'B', text: 'Crystallized intelligence declines with age' },
                { letter: 'C', text: 'Fluid intelligence involves abstract reasoning, crystallized involves knowledge' },
                { letter: 'D', text: 'They are the same thing' }
              ],
              correctAnswer: 'C',
              maxWords: 3
            },
            {
              questionNumber: 2,
              question: 'What did Professor Ackerman find about middle-aged adults?',
              questionType: 'multiple_choice',
              options: [
                { letter: 'A', text: 'They are less knowledgeable in all domains' },
                { letter: 'B', text: 'They are more knowledgeable in many domains' },
                { letter: 'C', text: 'They perform worse on science tests' },
                { letter: 'D', text: 'They have declining fluid intelligence' }
              ],
              correctAnswer: 'B',
              maxWords: 3
            }
          ],
          unitNumber: currentUnit,
          order: questions.length
        };
        break;
      default:
        return;
    }

    const updatedUnit = {
      ...currentUnitData,
      questions: [...questions, newQuestion]
    };

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit ? updatedUnit : unit
    );

    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };

  const updateQuestionInUnit = (questionIndex, updatedQuestion) => {
    if (!currentPaper || !currentPaper.units) return;

    const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
    if (!currentUnitData) return;

    const questions = currentUnitData.questions || [];

    const updatedQuestions = questions.map((q, idx) =>
      idx === questionIndex ? { ...updatedQuestion, order: idx } : q
    );

    const updatedUnit = {
      ...currentUnitData,
      questions: updatedQuestions
    };

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit ? updatedUnit : unit
    );

    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };

  const deleteQuestionFromUnit = (questionIndex) => {
    if (!currentPaper || !currentPaper.units) return;

    const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
    if (!currentUnitData) return;

    const questions = currentUnitData.questions || [];

    const updatedQuestions = questions.filter((_, idx) => idx !== questionIndex);

    const updatedUnit = {
      ...currentUnitData,
      questions: updatedQuestions
    };

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit ? updatedUnit : unit
    );

    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };

  const showPreview = () => {
    setActiveTab('preview');
  };


  const publishPaper = async () => {
    const totalQuestions = currentPaper.units?.reduce((total, unit) => total + (unit.questions?.length || 0), 0) || 0;
    if (totalQuestions === 0) {
      alert('Please add at least one question before publishing');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/reading-papers/${currentPaper._id}`, {
        ...currentPaper,
        status: 'published'
      });
      setCurrentPaper({ ...currentPaper, status: 'published' });
      await fetchPapers();
      alert('Paper published successfully!');
    } catch (error) {
      console.error('Error publishing paper:', error);
      alert('Error publishing paper');
    }
  };

  if (activeTab === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Reading Papers</h2>
          <button
            onClick={createNewPaper}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Create New Paper
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((paper) => (
            <div key={paper._id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{paper.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  paper.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {paper.status}
                </span>
              </div>

              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {paper.description || 'No description'}
              </p>

              <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                <span>
                  {paper.units
                    ? paper.units.reduce((total, unit) => total + (unit.questions?.length || 0), 0)
                    : (paper.questions?.length || 0)
                  } questions
                </span>
                <span>
                  {paper.estimatedTime || 60} minutes
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => editPaper(paper)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => deletePaper(paper._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {papers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No reading papers created yet.</p>
            <button
              onClick={createNewPaper}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg"
            >
              Create Your First Paper
            </button>
          </div>
        )}
      </div>
    );
  }

  // Preview Component - Professional reading Interface
  if (activeTab === 'preview') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{currentPaper.title}</h1>
              <p className="text-slate-600 text-sm mt-1">{currentPaper.description}</p>
              <p className="text-slate-500 text-sm mt-1">Estimated time: {currentPaper.estimatedTime} minutes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-600">IELTS Reading Test</div>
                <div className="text-lg font-semibold text-slate-800">
                  {currentPaper.units?.reduce((total, unit) => total + (unit.questions?.length || 0), 0) || 0} Questions
                </div>
              </div>
              <button
                onClick={() => setActiveTab('builder')}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Exit Preview
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sections Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
                <h3 className="font-semibold text-slate-800 mb-4">Reading Sections</h3>

                <div className="space-y-2">
                  {currentPaper.units?.map((unit) => (
                    <button
                      key={unit.unitNumber}
                      onClick={() => setCurrentUnit(unit.unitNumber)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentUnit === unit.unitNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {unit.title}
                      <span className="float-right">{unit.questions?.length || 0} questions</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-medium text-slate-800 mb-2">Current Section Questions</h4>
                  <div className="space-y-1">
                    {(() => {
                      const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                      return currentUnitData?.questions?.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentQuestion(idx)}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                            currentQuestion === idx
                              ? 'bg-blue-100 text-blue-800'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Question {idx + 1}: {question.type.replace('type', 'Type ')}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                if (!currentUnitData) return null;

                return (
                  <div className="space-y-6">
                    {/* Section Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">{currentUnitData.title}</h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {currentUnitData.questions?.length || 0} Questions
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          <p className="text-blue-800 font-medium text-sm leading-relaxed">
                            {currentUnitData.instructions}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Questions */}
                    {currentUnitData.questions?.length > 0 && (
                      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Questions</h3>
                        <div className="space-y-4">
                          {currentUnitData.questions.map((question, idx) => {
                            switch (question.type) {
                              case 'type1_word_replacement':
                                return <Type1WordReplacement key={idx} question={question} index={idx} onUpdate={() => {}} onDelete={() => {}} preview={true} />;
                              case 'type2_gap_fill':
                                return <Type2GapFill key={idx} question={question} index={idx} onUpdate={() => {}} onDelete={() => {}} preview={true} />;
                              case 'type3_sentence_completion':
                                return <Type3SentenceCompletion key={idx} question={question} index={idx} onUpdate={() => {}} onDelete={() => {}} preview={true} />;
                              case 'type4_matching_headings':
                                return <Type4MatchingHeadings key={idx} question={question} index={idx} onUpdate={() => {}} onDelete={() => {}} preview={true} />;
                              case 'type5_reading_comprehension':
                                return <Type5ReadingComprehension key={idx} question={question} index={idx} onUpdate={() => {}} onDelete={() => {}} preview={true} />;
                              default:
                                return null;
                            }
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Submit Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Reading Complete</h3>
                  <p className="text-slate-600 text-sm mb-6">
                    You have read all the passages in this section.
                  </p>
                  <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    Continue to Next Section
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if currentPaper is not set
  if (!currentPaper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {currentPaper?._id ? 'Edit Paper' : 'Create New Paper'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg"
          >
            Back to List
          </button>
          {currentPaper?._id && (
            <button
              onClick={showPreview}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Eye size={20} />
              Preview
            </button>
          )}
          <button
            onClick={savePaper}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          {currentPaper?._id && currentPaper?.status === 'draft' && (
            <button
              onClick={publishPaper}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paper Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Paper Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={currentPaper?.title || ''}
                  onChange={(e) => setCurrentPaper({...currentPaper, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter paper title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={currentPaper?.description || ''}
                  onChange={(e) => setCurrentPaper({...currentPaper, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter paper description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  value={currentPaper?.estimatedTime || 60}
                  onChange={(e) => setCurrentPaper({...currentPaper, estimatedTime: parseInt(e.target.value) || 60})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  min="1"
                  max="180"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Created By
                </label>
                <select
                  value={currentPaper?.createdBy || ''}
                  onChange={(e) => setCurrentPaper({...currentPaper, createdBy: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Admin</option>
                  {admins.map((admin) => (
                    <option key={admin._id} value={admin.agent_id}>
                      {admin.name} ({admin.agent_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section Selection and Question Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Section {currentUnit} - Questions
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                Currently editing: <span className="font-medium text-slate-800">Section {currentUnit}</span>
              </p>
              <p className="text-xs text-slate-500">
                Questions added here will be saved to Section {currentUnit} and will appear in Section {currentUnit} when students take the exam.
              </p>
            </div>

            <div className="space-y-2">
              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                return currentUnitData?.questions?.map((question, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      currentQuestion === idx
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <HelpCircle size={16} className="text-slate-500" />
                        <span className="font-medium text-slate-800">Question {idx + 1}</span>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                          {question.type.replace('type', 'Type ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteQuestionFromUnit(idx);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ));
              })()}

              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                return currentUnitData?.questions?.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <HelpCircle size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No questions in Section {currentUnit} yet.</p>
                    <p className="text-sm">Click a "Type" button below to create your first question.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Section Navigation */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Select Section to Edit:</h4>
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                {[1, 2, 3, 4, 5].map((unitNum) => {
                  const unit = currentPaper?.units?.find(u => u.unitNumber === unitNum);
                  return (
                    <button
                      key={unitNum}
                      onClick={() => {
                        setCurrentUnit(unitNum);
                      }}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        currentUnit === unitNum
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Section {unitNum}
                      <span className="ml-1 text-xs">
                        ({unit?.questions?.length || 0} questions)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Section Info */}
            {(() => {
              if (!currentPaper?.units) return null;

              const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
              if (!currentUnitData) return null;

              return (
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {currentUnitData.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        All questions added to this section will be saved here and displayed in this section during the exam.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <input
                      type="text"
                      value={currentUnitData.instructions || ''}
                      onChange={(e) => updateUnit(currentUnit, { instructions: e.target.value })}
                      className="w-full bg-transparent border-none outline-none text-slate-700 font-medium"
                      placeholder="Section instructions"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Questions Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Questions for Section {currentUnit}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => addQuestionToUnit('type1_word_replacement')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    title="Type 1: Word Replacement"
                  >
                    <CheckSquare size={14} />
                    Type 1
                  </button>
                  <button
                    onClick={() => addQuestionToUnit('type2_gap_fill')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    title="Type 2: Gap Fill"
                  >
                    <Type size={14} />
                    Type 2
                  </button>
                  <button
                    onClick={() => addQuestionToUnit('type3_sentence_completion')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    title="Type 3: Sentence Completion"
                  >
                    <FileTextIcon size={14} />
                    Type 3
                  </button>
                  <button
                    onClick={() => addQuestionToUnit('type4_matching_headings')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    title="Type 4: Matching Headings"
                  >
                    <Target size={14} />
                    Type 4
                  </button>
                  <button
                    onClick={() => addQuestionToUnit('type5_reading_comprehension')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    title="Type 5: Reading Comprehension"
                  >
                    <BookOpen size={14} />
                    Type 5
                  </button>
                </div>
              </div>

              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                const questions = currentUnitData?.questions || [];

                if (questions.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <HelpCircle size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No questions added yet.</p>
                      <p className="text-sm">Click one of the "Type" buttons above to create IELTS Reading questions for this section.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {questions.map((question, idx) => {
                      switch (question.type) {
                        case 'type1_word_replacement':
                          return (
                            <Type1WordReplacement
                              key={idx}
                              question={question}
                              index={idx}
                              onUpdate={(updated) => updateQuestionInUnit(idx, updated)}
                              onDelete={() => deleteQuestionFromUnit(idx)}
                            />
                          );
                        case 'type2_gap_fill':
                          return (
                            <Type2GapFill
                              key={idx}
                              question={question}
                              index={idx}
                              onUpdate={(updated) => updateQuestionInUnit(idx, updated)}
                              onDelete={() => deleteQuestionFromUnit(idx)}
                            />
                          );
                        case 'type3_sentence_completion':
                          return (
                            <Type3SentenceCompletion
                              key={idx}
                              question={question}
                              index={idx}
                              onUpdate={(updated) => updateQuestionInUnit(idx, updated)}
                              onDelete={() => deleteQuestionFromUnit(idx)}
                            />
                          );
                        case 'type4_matching_headings':
                          return (
                            <Type4MatchingHeadings
                              key={idx}
                              question={question}
                              index={idx}
                              onUpdate={(updated) => updateQuestionInUnit(idx, updated)}
                              onDelete={() => deleteQuestionFromUnit(idx)}
                            />
                          );
                        case 'type5_reading_comprehension':
                          return (
                            <Type5ReadingComprehension
                              key={idx}
                              question={question}
                              index={idx}
                              onUpdate={(updated) => updateQuestionInUnit(idx, updated)}
                              onDelete={() => deleteQuestionFromUnit(idx)}
                            />
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingPapersBuilder;
