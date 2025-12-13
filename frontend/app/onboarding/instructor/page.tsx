"use client";

import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SetupStep {
  id: number;
  title: string;
  icon: string;
}

const setupSteps: SetupStep[] = [
  { id: 1, title: "Organization Details", icon: "🏫" },
  { id: 2, title: "Classroom Setup", icon: "👥" },
  { id: 3, title: "Demo Preview", icon: "👁️" },
];

export default function InstructorOnboarding() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const { experience, updateSettings, completeOnboarding } = useOnboardingStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<string | null>(null);
  const [classroomName, setClassroomName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [showingDemo, setShowingDemo] = useState(false);
  const [demoStudents, setDemoStudents] = useState<Array<{id: number; name: string; pnl: number; status: string}>>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Show loading spinner until component is mounted
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsCheckingAuth(false);
    };
    run();
  }, [checkAuth, router]);

  // Only redirect if explicitly wrong experience (not null)
  useEffect(() => {
    if (experience !== null && experience !== 'instructor') {
      router.push("/onboarding");
    }
  }, [experience, router]);

  // Generate invite link when classroom name is set
  useEffect(() => {
    if (classroomName) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setInviteLink(`https://midnighttrader.app/join/${code}`);
    }
  }, [classroomName]);

  // Demo student simulation
  useEffect(() => {
    if (showingDemo) {
      const students = [
        { id: 1, name: "Alex_Trader_01", pnl: 0, status: "idle" },
        { id: 2, name: "Sarah_Charts_99", pnl: 0, status: "idle" },
        { id: 3, name: "Mike_Crypto_Pro", pnl: 0, status: "idle" },
      ];
      setDemoStudents(students);

      // Simulate student activity
      const interval = setInterval(() => {
        setDemoStudents(prev => prev.map(student => ({
          ...student,
          pnl: student.pnl + (Math.random() - 0.5) * 50,
          status: Math.random() > 0.7 ? 'trading' : 'idle'
        })));
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [showingDemo]);

  const canProceed = () => {
    if (currentStep === 1) return orgName.trim() !== "" && orgType !== null;
    if (currentStep === 2) return classroomName.trim() !== "";
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 2) {
        setShowingDemo(true);
      }
    } else {
      // Complete onboarding
      updateSettings({
        organizationName: orgName,
        organizationType: orgType || undefined,
        classroomName,
      });
      completeOnboarding();
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 3) {
        setShowingDemo(false);
      }
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    // Could add toast notification here
  };

  const orgTypes = [
    { id: "university", name: "University / College", icon: "🎓" },
    { id: "bootcamp", name: "Trading Bootcamp", icon: "🚀" },
    { id: "prop-firm", name: "Prop Firm Training", icon: "💼" },
    { id: "independent", name: "Independent Mentor", icon: "👨‍🏫" },
  ];

  // Loading state to prevent FOUC
  if (!isLoaded || isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1e293b',
          borderTopColor: '#00d4aa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="instructor-onboarding">
      {/* Header */}
      <div className="wizard-header">
        <div className="logo">
          <span className="logo-icon">M</span>
          <span className="logo-text">Midnight Trader</span>
          <span className="instructor-badge">Instructor</span>
        </div>
        <div className="skip-btn" onClick={() => router.push("/dashboard")}>
          Skip Setup →
        </div>
      </div>

      {/* Progress */}
      <div className="progress-container">
        <div className="progress-bar">
          {setupSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep === step.id ? 'current' : ''}`}
            >
              <div className="step-icon">{step.icon}</div>
              <span className="step-title">{step.title}</span>
              {index < setupSteps.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="wizard-content">
        {/* Step 1: Organization Details */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Tell us about your organization</h2>
            <p className="step-description">This helps us customize the experience for your students.</p>
            
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                placeholder="e.g., Stanford Trading Club"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Organization Type</label>
              <div className="org-type-grid">
                {orgTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`org-type-card ${orgType === type.id ? 'selected' : ''}`}
                    onClick={() => setOrgType(type.id)}
                  >
                    <span className="type-icon">{type.icon}</span>
                    <span className="type-name">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Classroom Setup */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>Create your first classroom</h2>
            <p className="step-description">A classroom groups your students together for tracking and competitions.</p>
            
            <div className="form-group">
              <label>Classroom Name</label>
              <input
                type="text"
                placeholder="e.g., Spring 2025 Cohort"
                value={classroomName}
                onChange={(e) => setClassroomName(e.target.value)}
                className="form-input"
              />
            </div>

            {classroomName && (
              <div className="invite-section">
                <h3>Invite Link Generated</h3>
                <div className="invite-box">
                  <span className="invite-link">{inviteLink}</span>
                  <button className="copy-btn" onClick={copyInviteLink}>
                    📋 Copy
                  </button>
                </div>
                <p className="invite-hint">Share this link with your students to join the classroom.</p>
              </div>
            )}

            <div className="features-preview">
              <h3>Instructor Features</h3>
              <div className="feature-list">
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <div>
                    <span className="feature-name">Leaderboard Management</span>
                    <span className="feature-desc">Track and rank student performance</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">👁️</span>
                  <div>
                    <span className="feature-name">God View Spectating</span>
                    <span className="feature-desc">Watch student trades in real-time</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔒</span>
                  <div>
                    <span className="feature-name">Account Freezing</span>
                    <span className="feature-desc">Pause student accounts when needed</span>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <div>
                    <span className="feature-name">Performance Analytics</span>
                    <span className="feature-desc">Detailed reports on student progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Demo Preview */}
        {currentStep === 3 && (
          <div className="step-content wide">
            <h2>God View Demo</h2>
            <p className="step-description">Here's a preview of how you'll monitor student activity. These are simulated students.</p>
            
            <div className="god-view-demo">
              {/* Student Cards */}
              <div className="student-grid">
                {demoStudents.map((student) => (
                  <div key={student.id} className={`student-card ${student.status}`}>
                    <div className="student-header">
                      <div className="student-avatar">
                        {student.name.charAt(0)}
                      </div>
                      <div className="student-info">
                        <span className="student-name">{student.name}</span>
                        <span className={`student-status ${student.status}`}>
                          {student.status === 'trading' ? '🟢 Trading' : '⚪ Idle'}
                        </span>
                      </div>
                    </div>
                    <div className="student-stats">
                      <div className="mini-chart">
                        {[...Array(20)].map((_, i) => (
                          <div 
                            key={i}
                            className={`mini-bar ${Math.random() > 0.4 ? 'green' : 'red'}`}
                            style={{ height: `${20 + Math.random() * 60}%` }}
                          />
                        ))}
                      </div>
                      <div className={`student-pnl ${student.pnl >= 0 ? 'positive' : 'negative'}`}>
                        {student.pnl >= 0 ? '+' : ''}${student.pnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="student-actions">
                      <button className="action-btn spectate">👁️ Spectate</button>
                      <button className="action-btn freeze">⏸️ Freeze</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Class Summary */}
              <div className="class-summary">
                <h3>Classroom: {classroomName || 'Demo Class'}</h3>
                <div className="summary-stats">
                  <div className="summary-stat">
                    <span className="stat-value">3</span>
                    <span className="stat-label">Students</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-value positive">
                      ${demoStudents.reduce((acc, s) => acc + Math.max(0, s.pnl), 0).toFixed(0)}
                    </span>
                    <span className="stat-label">Total Profit</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-value">1</span>
                    <span className="stat-label">Active Now</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="demo-notice">
              <span className="notice-icon">💡</span>
              <p>This is a live simulation. In the real dashboard, you'll see your actual students' portfolios updating in real-time.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="wizard-footer">
        <button 
          className="back-btn"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          ← Back
        </button>
        <button 
          className="next-btn"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStep === 3 ? 'Enter Dashboard' : 'Continue →'}
        </button>
      </div>

      <style jsx>{`
        .instructor-onboarding {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0d14 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .wizard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #0d0f14;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
        }

        .instructor-badge {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .skip-btn {
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .skip-btn:hover {
          color: #94a3b8;
        }

        /* Progress */
        .progress-container {
          padding: 0 40px;
          margin-bottom: 40px;
        }

        .progress-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .progress-step.active {
          border-color: #8b5cf6;
        }

        .progress-step.current {
          background: rgba(139, 92, 246, 0.1);
          border-color: #8b5cf6;
        }

        .step-icon {
          font-size: 24px;
        }

        .step-title {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
        }

        .step-connector {
          width: 40px;
          height: 2px;
          background: #334155;
        }

        .progress-step.active + .step-connector,
        .progress-step.current + .step-connector {
          background: #8b5cf6;
        }

        /* Content */
        .wizard-content {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 0 40px;
          overflow-y: auto;
        }

        .step-content {
          max-width: 600px;
          width: 100%;
          animation: fadeIn 0.3s ease;
        }

        .step-content.wide {
          max-width: 1000px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-content h2 {
          font-size: 28px;
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .step-description {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 32px;
        }

        /* Forms */
        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 16px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 12px;
          color: #f8fafc;
          font-size: 16px;
          transition: border-color 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .form-input::placeholder {
          color: #64748b;
        }

        /* Org Type Grid */
        .org-type-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .org-type-card {
          padding: 20px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .org-type-card:hover {
          border-color: #8b5cf6;
        }

        .org-type-card.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        .type-icon {
          font-size: 28px;
        }

        .type-name {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
        }

        /* Invite Section */
        .invite-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .invite-section h3 {
          font-size: 16px;
          color: #f8fafc;
          margin-bottom: 12px;
        }

        .invite-box {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }

        .invite-link {
          flex: 1;
          padding: 12px 16px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #8b5cf6;
          font-family: monospace;
          font-size: 14px;
        }

        .copy-btn {
          padding: 12px 20px;
          background: #8b5cf6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          background: #7c3aed;
        }

        .invite-hint {
          font-size: 13px;
          color: #64748b;
        }

        /* Features Preview */
        .features-preview {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
        }

        .features-preview h3 {
          font-size: 16px;
          color: #f8fafc;
          margin-bottom: 16px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          gap: 12px;
        }

        .feature-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-name {
          display: block;
          font-weight: 600;
          color: #f8fafc;
          font-size: 14px;
        }

        .feature-desc {
          font-size: 13px;
          color: #64748b;
        }

        /* God View Demo */
        .god-view-demo {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .student-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .student-card {
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .student-card.trading {
          border-color: #10b981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        }

        .student-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .student-info {
          display: flex;
          flex-direction: column;
        }

        .student-name {
          font-weight: 600;
          color: #f8fafc;
          font-size: 14px;
        }

        .student-status {
          font-size: 12px;
          color: #64748b;
        }

        .student-status.trading {
          color: #10b981;
        }

        .student-stats {
          margin-bottom: 12px;
        }

        .mini-chart {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 40px;
          margin-bottom: 8px;
        }

        .mini-bar {
          flex: 1;
          border-radius: 1px;
        }

        .mini-bar.green {
          background: #10b981;
        }

        .mini-bar.red {
          background: #ef4444;
        }

        .student-pnl {
          font-size: 20px;
          font-weight: 700;
        }

        .student-pnl.positive {
          color: #10b981;
        }

        .student-pnl.negative {
          color: #ef4444;
        }

        .student-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid #334155;
          border-radius: 6px;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #334155;
          color: #f8fafc;
        }

        .action-btn.spectate:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .action-btn.freeze:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        /* Class Summary */
        .class-summary {
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
        }

        .class-summary h3 {
          font-size: 16px;
          color: #f8fafc;
          margin-bottom: 16px;
        }

        .summary-stats {
          display: flex;
          gap: 24px;
        }

        .summary-stat {
          text-align: center;
        }

        .summary-stat .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #f8fafc;
        }

        .summary-stat .stat-value.positive {
          color: #10b981;
        }

        .summary-stat .stat-label {
          font-size: 13px;
          color: #64748b;
        }

        /* Demo Notice */
        .demo-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid #8b5cf6;
          border-radius: 12px;
        }

        .notice-icon {
          font-size: 20px;
        }

        .demo-notice p {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }

        /* Footer */
        .wizard-footer {
          display: flex;
          justify-content: space-between;
          padding: 24px 40px;
          border-top: 1px solid #1e293b;
        }

        .back-btn, .next-btn {
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-btn {
          background: transparent;
          border: 2px solid #334155;
          color: #94a3b8;
        }

        .back-btn:hover:not(:disabled) {
          border-color: #64748b;
          color: #f8fafc;
        }

        .back-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .next-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          border: none;
          color: white;
        }

        .next-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .next-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
