import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ReadingPlayground() {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(0);
  const [answers, setAnswers] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};

  // Fetch paper
  useEffect(() => {
    let cancelled = false;
    const fetchPaper = async () => {
      try {
        if (!test?.exam_paper) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reading/${test.exam_paper}`);
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setPaper(data.paper);
          } else {
            console.error("Failed fetching paper:", res.status);
          }
        }
      } catch (err) {
        console.error("Error fetching paper:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPaper();
    return () => {
      cancelled = true;
    };
  }, [test]);

  const currentQuestions = paper?.questions?.filter(q => q.unitNumber === currentPart + 1) || [];

  const renderQuestion = (q) => {
    switch (q.type) {
      case 'type1_word_replacement':
        return renderType1(q);
      case 'type2_gap_fill':
        return renderType2(q);
      case 'type3_sentence_completion':
        return renderType3(q);
      case 'type4_matching_headings':
        return renderType4(q);
      case 'type5':
      case 'type5_reading_comprehension':
        return renderType5(q);
      default:
        return <div>Unknown question type</div>;
    }
  };


 
  
  

  const renderType1 = (q) => {
    const questionKey = q.questionNumber || q._id;
    return (
      <div className="p-4">


        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            const selected = answers[questionKey] === opt.letter;
            return (
              <label
                key={`${questionKey}-${opt.letter}`}
                onClick={() => setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))}
                className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                  selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b]" : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input type="radio" name={`question-${questionKey}`} value={opt.letter} checked={selected} readOnly className="sr-only" />
                <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                  {opt.letter}
                </div>
                <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderType2 = (q) => {
    console.log("Rendering Type 2 question:", q);
    const questionKey = q.questionNumber || q._id;
    return (
      <div className="p-4">

        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            const selected = answers[questionKey] === opt.letter;
            return (
              <label
                key={`${questionKey}-${opt.letter}`}
                onClick={() => setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))}
                className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                  selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b] " : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input type="radio" name={`question-${questionKey}`} value={opt.letter} checked={selected} readOnly className="sr-only" />
                <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                  {opt.letter}
                </div>
                <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderType3 = (q) => {
    const passage = paper?.passages?.find(p => p.globalIndex === q.passageIndex);
    const content = passage?.content || '';
    const parts = content.split(/(\{gap\d+\})/g);
    return (
      <div className="p-4 flex gap-6">
        <div className="flex-1 mb-4 bg-[#EEEEEE] p-4 border max-h-96 overflow-y-auto">
          {parts.map((part, i) => {
            if (part.match(/\{gap\d+\}/)) {
              const gapNum = part.match(/\{gap(\d+)\}/)[1];
              const assigned = answers[`gap-${gapNum}`];
              const sentence = q.sentences?.find(s => s.letter === assigned);
              return (
                <span
                  key={i}
                  className="inline-block border-2 border-dashed border-gray-400 px-2 py-1 mx-1 min-w-32 text-center relative"
                  onDrop={(e) => {
                    e.preventDefault();
                    const sentenceLetter = e.dataTransfer.getData('text');
                    setAnswers((prev) => ({ ...prev, [`gap-${gapNum}`]: sentenceLetter }));
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {assigned ? (
                    <div className="flex items-center justify-between">
                      <span>{sentence?.text || `Sentence ${assigned}`}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnswers((prev) => {
                            const newAnswers = { ...prev };
                            delete newAnswers[`gap-${gapNum}`];
                            return newAnswers;
                          });
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ) : 'Drop sentence here'}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <div className="flex-1 space-y-2">
          {q.sentences?.map((sent) => {
            const isUsed = Object.values(answers).includes(sent.letter);
            return (
              <div
                key={sent.letter}
                draggable={!isUsed}
                onDragStart={(e) => e.dataTransfer.setData('text', sent.letter)}
                className={`p-2 border cursor-move ${
                  isUsed
                    ? "border-gray-300 bg-gray-200 text-gray-500"
                    : "border-[#ff3200] bg-[#f8b592] hover:bg-[#FFDFCA]"
                }`}
              >
                <strong>{sent.letter}.</strong> {sent.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderType4 = (q) => {
    return (
      <div className="p-4 flex gap-6">
        <div className="flex-1 space-y-4 max-h-96 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Texts:
          </h2>
          {q.texts?.map((text) => {
            const isUsed = Object.values(answers).includes(text.letter);
            return (
              <div
                key={text.letter}
                draggable={!isUsed}
                onDragStart={(e) => e.dataTransfer.setData('text', text.letter)}
                className={`p-4 rounded-lg  border cursor-move ${
                  isUsed
                    ? "bg-gray-200 border-gray-300 text-gray-500"
                    : "bg-orange-100 border-orange-300 hover:bg-orange-200"
                }`}
              >
                <div className="font-bold text-lg mb-2">{text.letter}.</div>
                <div className="text-gray-800 text-[10px] leading-relaxed">{text.content}</div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Questions:
          </h2>
          {q.matchingQuestions?.map((mq) => (
            <div
              key={mq.questionNumber}
              className="p-3 border border-gray-300 rounded-lg bg-gray-50 "
            >
              <p className="text-gray-700 text-[13px]  mb-2 leading-relaxed">
                {mq.questionNumber}. {mq.question}
              </p>

              <div
                className="border-2 text-[13px] border-dashed border-gray-400 px-3 py-2 min-h-10 text-center flex items-center justify-center relative"
                onDrop={(e) => {
                  e.preventDefault();
                  const textLetter = e.dataTransfer.getData('text');
                  setAnswers((prev) => ({ ...prev, [mq.questionNumber]: textLetter }));
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {answers[mq.questionNumber] ? (
                  <div className="flex text-[13px] items-center justify-between w-full">
                    <span>Text {answers[mq.questionNumber]}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswers((prev) => {
                          const newAnswers = { ...prev };
                          delete newAnswers[mq.questionNumber];
                          return newAnswers;
                        });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : 'Drop text here'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderType5 = (q) => {
    const questionKey = q.questionNumber || q._id;
    switch (q.questionType) {
      case 'multiple_choice':
        return (
          <div className="p-4">
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                      selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b] shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))}
                      className="sr-only"
                    />
                    <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                      {opt.letter}
                    </div>
                    <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case 'true_false':
        return (
          <div className="p-4">
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                      selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b] shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))}
                      className="sr-only"
                    />
                    <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                      {opt.letter}
                    </div>
                    <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case 'short_answer':
        return (
          <div className="p-4">
            <input
              type="text"
              value={answers[questionKey] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [questionKey]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Answer (max ${q.maxWords} words)`}
            />
          </div>
        );
      case 'gap_fill':
        return (
          <div className="p-4">
            <input
              type="text"
              value={answers[questionKey] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [questionKey]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Fill the gap"
            />
          </div>
        );
      default:
        // Default to multiple choice if questionType is not specified
        return (
          <div className="p-4">
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                      selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b] shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))}
                      className="sr-only"
                    />
                    <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                      {opt.letter}
                    </div>
                    <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
                  </label>
                );
              })}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto" />
          <p className="text-gray-600 mt-3">Loading reading paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">No reading paper available</p>
          <button onClick={() => navigate(-1)}>back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-orange-500 flex-shrink-0" role="img" aria-labelledby="peopleCertTitle">
                <title id="peopleCertTitle">PeopleCert logo</title>
                <path d="M16.3,21.9c-4.1-1.6-5.5-5-4.4-8.6.6-2,1.9-3.5,3.6-4.3,2.7-1.3,5.7.4,6.1,3.3.3,2.3-.4,4.8-1.4,6.4-.7,1.1-1.5,2-2.4,2.9-.4.4-1.1.5-1.6.3M5.7,14.6c-.2-4.7,2.9-8.7,7.2-9.9,1.2-.3,2.4-.2,3.5.4h0-.2c-3.9.3-7.1,3-8.2,6.6,0,0,0,0,0,0,0,.1,0,.2-.1.4-1.4,4.5,1.4,9.1,6.1,10.9.5.2,1,.3,1.5.4h0c-.9.5-2,.6-2.9.3-3.8-1.2-6.7-4.7-6.9-8.9M27.4,17.6c.1-.9.2-1.8.3-2.8,0-7.4-6-13.4-13.4-13.4-2.7,0-5.4.8-7.6,2.3-.6.4-1.2.9-1.7,1.4s-1,1.1-1.5,1.7c-.5.6-.8,1.2-1.2,1.9-.4.8-.7,1.6-.9,2.4s-.4,1.7-.4,2.6c0,1.5.2,3.1.7,4.6.5,1.5,1.4,3,2.5,4.1.2.2.3.3.5.5,2,2,4.7,3.3,7.5,3.7.7.1,1.5.1,2.3.1,3.7-.2,6.9-1.9,9.2-4.5,1,2.4,3.1,4.4,7.4,3.9-.6-.2-4.9-.2-3.5-8.6" fill="currentColor" />
              </svg>

              <div className="text-2xl font-bold">
                <span className="text-orange-500">People</span>
                <span className="text-gray-800">Cert</span>
              </div>
            </div>

            <div className="text-gray-500 text-sm">PASSPORT WEB A.T.E.S.</div>
          </div>

          <div>
            <button onClick={() => navigate(-1)}>back</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* left sidebar */}
        <aside className="w-48 pr-10">
          <div className="text-gray-600 font-semibold mb-2">Reading</div>

          <div className="flex flex-col gap-1 pl-6">
            {paper.passages?.map((s, idx) => {
              const isActive = idx === currentPart;
              return (
                <button
                  key={`part-${idx}`}
                  onClick={() => setCurrentPart(idx)}
                  className={`relative w-full text-left px-3 py-2 border transition-all duration-150 ${isActive ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                >
                  {isActive && <span className="absolute top-0 right-[-12px] h-full w-3 bg-gray-900" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />}
                  <span className="text-sm font-semibold">Reading Part {idx + 1}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* main content */}
        <main className="flex-1">
          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-4 mb-6">
            Read the text and answer the questions.
          </div>

          {/* Passage and Questions for Type 2 and Type 5 */}
          {currentQuestions.some(q => q.type === 'type2_gap_fill' || q.type === 'type5_reading_comprehension') ? (
            <div className="flex w-full gap-6">
              {/* Passage Content */}
              {(() => {
  const currentPassage = paper.passages?.find(
    p => p.unitNumber === currentPart + 1
  );

  const type2Questions = currentQuestions
    .filter(q => q.type === "type2_gap_fill")
    .sort((a, b) => a.order - b.order);

  const hasType5 = currentQuestions.some(q => q.type === 'type5_reading_comprehension');

  let processedContent = currentPassage?.content;

  if (processedContent && !hasType5) {
    processedContent = processedContent.replace(/\[GAP(\d+)\]/g, (match, num) => {
      const index = parseInt(num) - 1;
      const question = type2Questions[index];
      return question
        ? `<strong>(${question.order + 1})……………</strong>`
        : match;
    });
  }

  return processedContent ? (
    <div className="flex-1 bg-white border border-gray-200 p-4 rounded max-h-96 overflow-y-auto">
      <p
        className="text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      ></p>
    </div>
  ) : null;
})()}


              {/* questions area */}
              <div className="flex-1 space-y-6 max-h-96 overflow-y-auto">
                {currentQuestions.map((q) => (
                  <>
                  {console.log('Rendering question:', q)}
                  <article key={q._id} className="bg-white">
                    <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
                      <div className="text-2xl font-semibold">{q.order + 1}.</div>
                      <div className="ml-6 flex items-center">{q.type !== 'type3_sentence_completion' && q.question && <p className="text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: q.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>}</div>
                    </div>

                    {renderQuestion(q)}
                  </article>
                  </>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {currentQuestions.length === 0 ? (
                <div className="p-8 bg-white border rounded text-gray-500">No questions available for this section</div>
              ) : (
                currentQuestions.map((q) => (
                  <>
                  {console.log('Rendering question:', q)}
                  <article key={q._id} className="bg-white">
                    <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
                      <div className="text-2xl font-semibold">{q.order + 1}.</div>
                      <div className="ml-6 flex items-center">{q.type !== 'type3_sentence_completion' && q.question && <p className="text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: q.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>}</div>
                    </div>

                    {renderQuestion(q)}
                  </article>
                  </>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

