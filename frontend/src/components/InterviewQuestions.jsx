import { useState } from "react";
import API from "../services/api";

function InterviewQuestions() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateQuestions = async () => {
    if (!resume.trim() || !jd.trim()) {
      setError("Provide resume text and job description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await API.post("/generate-questions", {
        resume,
        job_description: jd,
      });
      setQuestions(response.data.questions || []);
    } catch (err) {
      setError(err.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Interview Question Generator</h2>

      <textarea
        placeholder="Paste resume text"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
      />

      <textarea
        placeholder="Paste job description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />

      <button type="button" onClick={generateQuestions} disabled={loading}>
        {loading ? "Generating…" : "Generate Questions"}
      </button>

      {error && <p className="error-text">{error}</p>}

      {questions.length > 0 && (
        <ol className="result-block">
          {questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default InterviewQuestions;
