import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Interview } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ScoreCircle: React.FC<{ score: string; label: string }> = ({ score, label }) => {
  const value = parseInt(score) || 0;
  const data = [{ value }, { value: 100 - value }];
  
  let color = '#28a745'; // success
  if (value < 50) color = '#dc3545';
  else if (value < 75) color = '#ffc107';

  return (
    <div className="flex flex-col items-center">
      <div className="h-32 w-32 relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius={35} outerRadius={50} startAngle={90} endAngle={-270} dataKey="value">
              <Cell fill={color} />
              <Cell fill="#e9ecef" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-700">{score}</span>
        </div>
      </div>
      <span className="mt-2 font-medium text-gray-600">{label}</span>
    </div>
  );
};

const InterviewReport: React.FC = () => {
  const { interviewId } = useParams();
  const [report, setReport] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!interviewId) return;
      const docSnap = await getDoc(doc(db, 'interviews', interviewId));
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() } as Interview);
      }
      setLoading(false);
    };
    fetchReport();
  }, [interviewId]);

  if (loading) return <div className="text-center py-10">Loading report...</div>;
  if (!report) return <div className="text-center py-10">Report not found.</div>;

  // Simple parser for the AI Markdown response to HTML
  const formatFeedback = (text: string) => {
    // Very basic replacement for bold headers and newlines
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .split('\n').map((line, i) => <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />);
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-dark">{report.jobTitle}</h2>
            <p className="text-gray-500">Candidate: {report.candidateName} | Status: <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs uppercase">{report.status}</span></p>
          </div>
          <a href={report.candidateResumeURL} target="_blank" rel="noreferrer" className="mt-4 md:mt-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm flex items-center gap-2">
            <i className="far fa-file-alt"></i> View Resume
          </a>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <ScoreCircle score={report.score} label="Overall Score" />
          <ScoreCircle score={report.resumeScore} label="Resume Match" />
          <ScoreCircle score={report.qnaScore} label="Q&A Quality" />
        </div>

        {/* AI Feedback */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-brain text-purple-600"></i> AI Evaluation
          </h3>
          <div className="prose max-w-none text-gray-700 text-sm">
            {formatFeedback(report.feedback)}
          </div>
        </div>
        
        {/* Integrity Warning */}
        {report.meta && report.meta.tabSwitchCount > 0 && (
           <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
             <div className="flex">
               <div className="flex-shrink-0">
                 <i className="fas fa-exclamation-triangle text-red-500"></i>
               </div>
               <div className="ml-3">
                 <p className="text-sm text-red-700">
                   Integrity Warning: The candidate switched tabs {report.meta.tabSwitchCount} time(s) during the interview.
                 </p>
               </div>
             </div>
           </div>
        )}

        {/* Q&A Transcript */}
        <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Q&A Transcript</h3>
        <div className="space-y-6">
          {report.questions.map((q, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2">Question {i + 1}</h4>
              <p className="mb-4 italic text-gray-800">{q}</p>
              
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 font-mono whitespace-pre-wrap">
                <span className="font-bold text-xs text-gray-400 block mb-1">TRANSCRIPT:</span>
                {report.transcriptTexts[i] || "(No transcription available)"}
              </div>

              {report.videoURLs[i] && (
                <div className="mt-4">
                   <a href={report.videoURLs[i]!} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                     <i className="fas fa-video"></i> Watch Video Response
                   </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center">
        <Link to="/" className="text-gray-500 hover:text-primary">Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default InterviewReport;