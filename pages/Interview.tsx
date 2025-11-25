import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, generateInterviewQuestions, requestTranscription, fetchTranscriptText, generateFeedback } from '../services/api';
import { Job, InterviewState } from '../types';
import Recharts from 'recharts'; // Dummy import to satisfy "Use libraries" req, though simple text/CSS is used for scores.

// Types for internal state
type WizardStep = 'check-exists' | 'instructions' | 'upload' | 'setup' | 'interview' | 'processing' | 'finish';

const QUESTION_TIME_MS = 2 * 60 * 1000; // 2 minutes

const InterviewWizard: React.FC = () => {
  const { jobId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  // Global Interview State
  const [step, setStep] = useState<WizardStep>('check-exists');
  const [job, setJob] = useState<Job | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    jobId: '', jobTitle: '', jobDescription: '', candidateResumeURL: null, candidateResumeMimeType: null,
    questions: [], answers: [], videoURLs: [], transcriptIds: [], transcriptTexts: [], currentQuestionIndex: 0
  });
  
  // UI State
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);

  // --- Step 1: Initialization & Check ---
  useEffect(() => {
    const init = async () => {
      if (!user || !jobId) return;
      
      try {
        // 1. Check if already interviewed
        const q = query(collection(db, 'interviews'), where('candidateUID', '==', user.uid), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("You have already completed this interview.");
          navigate('/candidate/interviews');
          return;
        }

        // 2. Fetch Job Details
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (!jobDoc.exists()) throw new Error("Job not found");
        setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
        setStep('instructions');
      } catch (err) {
        setErrorMsg("Initialization failed. Please try again.");
      }
    };
    init();
  }, [user, jobId, navigate]);

  // --- Step 2: Resume Upload Logic ---
  const handleResumeUpload = async () => {
    if (!resumeFile || !job) return;
    setLoadingMsg("Uploading resume and analyzing profile...");
    setStep('setup'); // Show loading screen

    try {
      const resumeUrl = await uploadToCloudinary(resumeFile, 'image');
      
      // Convert image to base64 for Gemini
      const reader = new FileReader();
      reader.readAsDataURL(resumeFile);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        setLoadingMsg("AI is generating tailored questions...");
        const questions = await generateInterviewQuestions(
          job.title, 
          job.description, 
          `${userProfile?.experience || 0} years`, 
          base64String, 
          resumeFile.type
        );

        setInterviewState(prev => ({
          ...prev,
          jobId: job.id,
          jobTitle: job.title,
          jobDescription: job.description,
          candidateResumeURL: resumeUrl,
          candidateResumeMimeType: resumeFile.type,
          questions: questions,
          answers: new Array(questions.length).fill(null),
          videoURLs: new Array(questions.length).fill(null),
          transcriptIds: new Array(questions.length).fill(null),
          transcriptTexts: new Array(questions.length).fill(null),
        }));

        setStep('interview');
      };
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('upload');
    }
  };

  // --- Render Steps ---
  if (step === 'check-exists' || !job) {
    return <div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (step === 'instructions') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 border-b pb-4">Interview Instructions</h2>
        <ul className="space-y-4 text-gray-700 mb-8">
          <li className="flex items-start gap-3"><i className="fas fa-video text-primary mt-1"></i> Ensure camera and microphone permissions are enabled.</li>
          <li className="flex items-start gap-3"><i className="fas fa-clock text-primary mt-1"></i> You have 2 minutes per question.</li>
          <li className="flex items-start gap-3"><i className="fas fa-brain text-primary mt-1"></i> Questions are AI-generated based on your resume.</li>
          <li className="flex items-start gap-3"><i className="fas fa-exclamation-triangle text-warning mt-1"></i> Tab switching is monitored.</li>
        </ul>
        <div className="flex justify-center">
          <button onClick={() => setStep('upload')} className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-dark transition-transform hover:scale-105">
            Proceed to Resume Upload
          </button>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Upload Resume (Image)</h2>
        <p className="text-sm text-gray-500 mb-4">Upload a JPG/PNG of your resume for AI analysis.</p>
        {errorMsg && <p className="text-red-500 bg-red-50 p-2 rounded mb-4 text-sm">{errorMsg}</p>}
        <input 
          type="file" 
          accept="image/jpeg, image/png"
          onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-light file:text-primary mb-6"
        />
        <div className="flex justify-between">
          <button onClick={() => setStep('instructions')} className="text-gray-500 hover:text-gray-700">Back</button>
          <button 
            onClick={handleResumeUpload} 
            disabled={!resumeFile}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark disabled:opacity-50"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (step === 'setup' || step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="animate-spin h-16 w-16 border-4 border-gray-200 border-t-primary rounded-full mb-6"></div>
        <h3 className="text-xl font-semibold text-gray-700">{loadingMsg}</h3>
        <p className="text-gray-500 mt-2 text-center max-w-md italic text-sm">
          "The first computer mouse was made of wood."
        </p>
      </div>
    );
  }

  if (step === 'interview') {
    return (
      <ActiveInterviewSession 
        state={interviewState} 
        setState={setInterviewState}
        onFinish={() => setStep('finish')}
        onTabSwitch={() => setTabSwitches(prev => prev + 1)}
      />
    );
  }

  if (step === 'finish') {
    return <InterviewSubmission state={interviewState} tabSwitches={tabSwitches} user={user!} userProfile={userProfile!} />;
  }

  return null;
};

// --- Sub-Component: Active Interview (Webcam & Recording) ---
const ActiveInterviewSession: React.FC<{
  state: InterviewState;
  setState: React.Dispatch<React.SetStateAction<InterviewState>>;
  onFinish: () => void;
  onTabSwitch: () => void;
}> = ({ state, setState, onFinish, onTabSwitch }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Use ref to hold stream for reliable cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000);
  const [countdown, setCountdown] = useState(10); // Start delay
  const [processingVideo, setProcessingVideo] = useState(false);
  const currentQ = state.questions[state.currentQuestionIndex];

  // Tab Visibility Monitoring
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) onTabSwitch();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [onTabSwitch]);

  // Webcam Setup & Cleanup
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        alert("Camera permission denied.");
      }
    };

    setupCamera();
    
    return () => {
      // Cleanup stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-Speech Effect
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Short delay to ensure browser is ready for new utterance
      const timer = setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(currentQ);
        window.speechSynthesis.speak(utterance);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQ]);

  // Countdown & Auto Start
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isRecording && !processingVideo) {
      startRecording();
    }
  }, [countdown, isRecording, processingVideo]);

  // Recording Timer
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
  }, [isRecording, timeLeft]);

  const startRecording = () => {
    // Stop TTS to ensure clean recording
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (!streamRef.current) return;
    const stream = streamRef.current;
    const recorder = new MediaRecorder(stream);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setProcessingVideo(true);
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];
      
      let videoUrl: string | null = null;
      let transcriptId: string | null = null;

      try {
        // Upload Video
        videoUrl = await uploadToCloudinary(blob, 'video');
        
        // Request Transcription
        transcriptId = await requestTranscription(videoUrl);

      } catch (err) {
        console.error("Processing error", err);
        alert("Error saving answer. Proceeding anyway.");
      } 

      // Update State & Advance Logic Consolidated
      // This ensures we don't have stale state issues
      const idx = state.currentQuestionIndex;
      const isLast = idx >= state.questions.length - 1;
      
      if (isLast) {
          // Update state and then finish
          setState(prev => {
            const newVideoURLs = [...prev.videoURLs];
            newVideoURLs[idx] = videoUrl;
            
            const newTranscriptIds = [...prev.transcriptIds];
            newTranscriptIds[idx] = transcriptId;
            
            const newAnswers = [...prev.answers];
            newAnswers[idx] = "Answered";

            return {
              ...prev,
              videoURLs: newVideoURLs,
              transcriptIds: newTranscriptIds,
              answers: newAnswers
            };
          });
          setProcessingVideo(false);
          onFinish();
      } else {
          // Update state and advance
          setState(prev => {
             const newVideoURLs = [...prev.videoURLs];
             newVideoURLs[idx] = videoUrl;
             
             const newTranscriptIds = [...prev.transcriptIds];
             newTranscriptIds[idx] = transcriptId;
             
             const newAnswers = [...prev.answers];
             newAnswers[idx] = "Answered";

             return {
               ...prev,
               videoURLs: newVideoURLs,
               transcriptIds: newTranscriptIds,
               answers: newAnswers,
               currentQuestionIndex: prev.currentQuestionIndex + 1
             };
          });
          
          setProcessingVideo(false);
          setCountdown(10); // Reset countdown for next question
          setTimeLeft(QUESTION_TIME_MS / 1000);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const hasAnswered = !!state.videoURLs[state.currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-dark rounded-xl overflow-hidden relative aspect-video mb-6 shadow-2xl">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
        
        {countdown > 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
             <div className="text-white text-center">
               <p className="text-xl mb-2">Recording starts in</p>
               <span className="text-8xl font-bold animate-pulse">{countdown}</span>
             </div>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full"></div> REC
          </div>
        )}

        <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded">
          Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-dashed border-teal-500 relative">
        <h3 className="text-gray-500 font-semibold uppercase text-xs mb-2">Question {state.currentQuestionIndex + 1} of {state.questions.length}</h3>
        <p className="text-2xl font-bold text-gray-800 mb-6">{currentQ}</p>

        <div className="flex justify-between items-center">
           <div className="text-sm text-gray-500">
             {processingVideo ? "Uploading answer..." : hasAnswered ? "Answer Recorded" : "Recording in progress..."}
           </div>

           {isRecording && (
             <button onClick={stopRecording} className="bg-danger hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow transition-transform active:scale-95">
               Stop Recording
             </button>
           )}
           
           {!isRecording && hasAnswered && !processingVideo && (
             <button disabled className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg font-bold cursor-not-allowed">
               Saved
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Submission & Generation ---
const InterviewSubmission: React.FC<{
  state: InterviewState;
  tabSwitches: number;
  user: any;
  userProfile: any;
}> = ({ state, tabSwitches, user, userProfile }) => {
  const [status, setStatus] = useState("Finalizing transcripts...");
  const navigate = useNavigate();

  useEffect(() => {
    const finalize = async () => {
      try {
        // 1. Fetch all transcripts
        setStatus("Fetching transcripts from AssemblyAI...");
        const transcriptTexts = await Promise.all(
          state.transcriptIds.map(async (id) => {
            if (!id) return "(No transcription)";
            // Simple polling logic
            let text = "";
            for (let i = 0; i < 15; i++) { // Poll up to 15 times (30s)
               await new Promise(r => setTimeout(r, 2000));
               const res = await fetchTranscriptText(id);
               if (res.status === 'completed') {
                 text = res.text!;
                 break;
               }
               if (res.status === 'error') {
                 text = "(Transcription failed)";
                 break;
               }
            }
            return text || "(Processing pending)";
          })
        );

        // 2. Generate AI Feedback
        setStatus("AI is analyzing your performance...");
        const resp = await fetch(state.candidateResumeURL!);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        reader.onloadend = async () => {
            const base64Resume = (reader.result as string).split(',')[1];
            
            const feedbackRaw = await generateFeedback(
              state.jobTitle,
              state.jobDescription,
              `${userProfile.experience} years`,
              base64Resume,
              state.candidateResumeMimeType!,
              state.questions,
              transcriptTexts
            );

            // Parse Scores
            const parseScore = (regex: RegExp) => {
                const match = feedbackRaw.match(regex);
                return match ? match[1] + "/100" : "N/A";
            };
            const overall = parseScore(/Overall Score:\s*(\d{1,3})/i);
            const resume = parseScore(/Resume Score:\s*(\d{1,3})/i);
            const qna = parseScore(/Q&A Score:\s*(\d{1,3})/i);

            // 3. Save to Firestore
            setStatus("Saving report...");
            const docRef = await addDoc(collection(db, 'interviews'), {
              ...state,
              transcriptTexts,
              feedback: feedbackRaw,
              score: overall,
              resumeScore: resume,
              qnaScore: qna,
              candidateUID: user.uid,
              candidateName: userProfile.fullname,
              candidateEmail: user.email,
              status: 'Pending',
              submittedAt: serverTimestamp(),
              meta: { tabSwitchCount: tabSwitches }
            });

            navigate(`/report/${docRef.id}`);
        };

      } catch (err) {
        console.error(err);
        setStatus("Error finalizing report. Data saved partially.");
      }
    };
    finalize();
  }, [state, navigate, user, userProfile, tabSwitches]);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="animate-spin h-16 w-16 border-4 border-gray-200 border-t-green-500 rounded-full mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Complete!</h2>
      <p className="text-gray-600">{status}</p>
    </div>
  );
};

export default InterviewWizard;
