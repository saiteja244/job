import { useState } from "react";
import API from "../services/api";

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const uploadResume = async () => {
    if (!file) {
      setError("Please select a PDF resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");
    setQuestions([]);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await API.post("/upload-resume", formData);

      setAnalysis(response.data.analysis || "");
      setQuestions(response.data.questions || []);
    } catch (err) {
      setError(err.message || "Failed to upload resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Upload Resume</h2>

      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          setError("");
        }}
      />

      <button type="button" onClick={uploadResume} disabled={loading || !file}>
        {loading ? "Analyzing…" : "Analyze Resume"}
      </button>

      {error && <p className="error-text">{error}</p>}

      {analysis && (
        <div className="result-block">
          <h3>Resume Analysis</h3>
          <pre>{analysis}</pre>
        </div>
      )}

      {questions.length > 0 && (
        <div className="result-block">
          <h3>Generated Interview Questions</h3>
          <ol>
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;
