import { useState } from "react";
import API from "../services/api";

function MockInterview() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateQuestions = async () => {
    if (!resume.trim() || !jd.trim()) {
      setError("Provide both resume text and job description.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    try {
      const response = await API.post("/generate-questions", {
        resume,
        job_description: jd,
      });

      let generated = response.data.questions || [];

      if (typeof generated === "string") {
        generated = generated.split("\n").filter((q) => q.trim());
      }

      setQuestions(generated);
      setCurrentQuestion(0);
      setAnswers([]);
      setCurrentAnswer("");
    } catch (err) {
      setError(err.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!currentAnswer.trim()) {
      setError("Type an answer before continuing.");
      return;
    }

    setError("");
    const updatedAnswers = [...answers, currentAnswer];
    setAnswers(updatedAnswers);
    setCurrentAnswer("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      return;
    }

    setCurrentQuestion(questions.length);
    await generateReport(updatedAnswers);
  };

  const generateReport = async (allAnswers) => {
    setLoading(true);
    try {
      const response = await API.post("/final-feedback", {
        questions,
        answers: allAnswers,
      });
      setReport(response.data.report || "");
    } catch (err) {
      setError(err.message || "Failed to generate feedback report.");
      setCurrentQuestion(questions.length - 1);
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer("");
    setReport("");
    setError("");
  };

  return (
    <div className="card">
      <h2>Text Mock Interview</h2>

      {loading && <p className="loading-text">Processing…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && questions.length === 0 && (
        <div className="setup-container">
          <textarea
            placeholder="Paste resume text"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={6}
          />
          <textarea
            placeholder="Paste job description"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={6}
          />
          <button type="button" onClick={generateQuestions}>
            Generate Interview
          </button>
        </div>
      )}

      {!loading && questions.length > 0 && currentQuestion < questions.length && (
        <div className="question-container">
          <h3>
            Question {currentQuestion + 1} of {questions.length}
          </h3>
          <p className="question-text">
            <strong>{questions[currentQuestion]}</strong>
          </p>

          <textarea
            placeholder="Type your answer here…"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            rows={4}
          />

          <button type="button" onClick={handleNext}>
            {currentQuestion === questions.length - 1
              ? "Submit & get feedback"
              : "Next question"}
          </button>
        </div>
      )}

      {!loading && report && (
        <div className="result-block">
          <h3>Interview Feedback</h3>
          <pre>{report}</pre>
          <button type="button" onClick={resetInterview}>
            Start new interview
          </button>
        </div>
      )}
    </div>
  );
}

export default MockInterview;
