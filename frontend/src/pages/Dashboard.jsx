import ResumeUpload from "../components/ResumeUpload";
import JDAnalyzer from "../components/JDAnalyzer";
import MockInterview from "../components/MockInterview";
import VoiceInterview from "../components/VoiceInterview";

function Dashboard() {
  return (
    <div className="container">
      <header className="page-header">
        <h1>AI Career Assistant</h1>
        <p>Upload your resume, analyze job fit, practice interviews, then use the voice coach at the bottom.</p>
      </header>

      <ResumeUpload />
      <JDAnalyzer />
      <MockInterview />
      <VoiceInterview />
    </div>
  );
}

export default Dashboard;
