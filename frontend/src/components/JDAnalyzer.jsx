import { useState } from "react";
import API from "../services/api";

function JDAnalyzer() {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!jd.trim()) {
      setError("Paste a job description first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await API.post("/compare-jd", {
        job_description: jd,
      });
      setResult(response.data.comparison || "");
    } catch (err) {
      setError(err.message || "Failed to analyze job description.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Job Description Analyzer</h2>

      <textarea
        placeholder="Paste job description (upload resume first for best results)"
        value={jd}
        onChange={(e) => {
          setJd(e.target.value);
          setError("");
        }}
      />

      <button type="button" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing…" : "Analyze Match"}
      </button>

      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="result-block">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default JDAnalyzer;
