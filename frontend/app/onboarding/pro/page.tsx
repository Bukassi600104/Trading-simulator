"use client";

import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
}

const wizardSteps: WizardStep[] = [
  { id: 1, title: "Asset Class", subtitle: "What do you trade?" },
  { id: 2, title: "Layout Preference", subtitle: "Customize your workspace" },
  { id: 3, title: "Prop Mode Setup", subtitle: "Challenge configuration" },
];

const assetClasses = [
  { id: "crypto", name: "Crypto", icon: "₿", description: "Bitcoin, Ethereum & Altcoins" },
  { id: "forex", name: "Forex", icon: "💱", description: "Currency Pairs (Coming Soon)", disabled: true },
  { id: "stocks", name: "Stocks", icon: "📈", description: "US Equities (Coming Soon)", disabled: true },
  { id: "futures", name: "Futures", icon: "📊", description: "Index & Commodity Futures (Coming Soon)", disabled: true },
];

const layouts = [
  { 
    id: "classic", 
    name: "Classic", 
    description: "Traditional view with chart and order panel",
    preview: "chart-order-positions"
  },
  { 
    id: "advanced", 
    name: "Advanced", 
    description: "Multi-chart with depth and orderbook",
    preview: "multi-chart-depth"
  },
  { 
    id: "minimal", 
    name: "Minimal", 
    description: "Clean, distraction-free trading",
    preview: "minimal-clean"
  },
];

const propModeOptions = [
  { label: "Drawdown Limit", options: ["5%", "10%", "15%"] },
  { label: "Profit Target", options: ["6%", "8%", "10%", "12%"] },
  { label: "Time Limit", options: ["14 Days", "30 Days", "60 Days", "No Limit"] },
];

export default function ProOnboarding() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const { experience, updateSettings, completeOnboarding } = useOnboardingStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [propModeEnabled, setPropModeEnabled] = useState(false);
  const [propSettings, setPropSettings] = useState({
    drawdown: "10%",
    profitTarget: "8%",
    timeLimit: "30 Days",
  });
  const [showBeacons, setShowBeacons] = useState(false);
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
    if (experience !== null && experience !== 'experienced') {
      router.push("/onboarding");
    }
  }, [experience, router]);

  const canProceed = () => {
    if (currentStep === 1) return selectedAsset !== null;
    if (currentStep === 2) return selectedLayout !== null;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      updateSettings({
        assetClass: selectedAsset || undefined,
        layout: selectedLayout || undefined,
        propModeEnabled,
        propSettings: propModeEnabled ? propSettings : undefined,
      });
      completeOnboarding();
      setShowBeacons(true);
      
      // Navigate to dashboard after showing beacons
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
    <div className="pro-onboarding">
      {/* Pulsing Beacons Overlay */}
      {showBeacons && (
        <div className="beacons-overlay">
          <div className="beacon beacon-chart" />
          <div className="beacon beacon-indicators" />
          <div className="beacon beacon-risk" />
          <div className="beacon-message">
            <span>✨ Explore these features to master the platform!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="wizard-header">
        <div className="logo">
          <span className="logo-icon">M</span>
          <span className="logo-text">Midnight Trader</span>
        </div>
        <div className="skip-btn" onClick={() => router.push("/dashboard")}>
          Skip Setup →
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          {wizardSteps.map((step) => (
            <div 
              key={step.id}
              className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep === step.id ? 'current' : ''}`}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-info">
                <span className="step-title">{step.title}</span>
                <span className="step-subtitle">{step.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="wizard-content">
        {/* Step 1: Asset Class */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>What markets do you trade?</h2>
            <p className="step-description">Select your primary asset class. You can change this later in settings.</p>
            
            <div className="asset-grid">
              {assetClasses.map((asset) => (
                <div
                  key={asset.id}
                  className={`asset-card ${selectedAsset === asset.id ? 'selected' : ''} ${asset.disabled ? 'disabled' : ''}`}
                  onClick={() => !asset.disabled && setSelectedAsset(asset.id)}
                >
                  <span className="asset-icon">{asset.icon}</span>
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-desc">{asset.description}</span>
                  {selectedAsset === asset.id && (
                    <div className="check-badge">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Layout */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>Choose your workspace layout</h2>
            <p className="step-description">Pick a layout that fits your trading style. All layouts are fully customizable.</p>
            
            <div className="layout-grid">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`layout-card ${selectedLayout === layout.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLayout(layout.id)}
                >
                  <div className="layout-preview">
                    {layout.id === 'classic' && (
                      <div className="preview-classic">
                        <div className="preview-chart" />
                        <div className="preview-sidebar">
                          <div className="preview-order" />
                          <div className="preview-positions" />
                        </div>
                      </div>
                    )}
                    {layout.id === 'advanced' && (
                      <div className="preview-advanced">
                        <div className="preview-charts">
                          <div className="preview-chart-sm" />
                          <div className="preview-chart-sm" />
                        </div>
                        <div className="preview-depth" />
                      </div>
                    )}
                    {layout.id === 'minimal' && (
                      <div className="preview-minimal">
                        <div className="preview-chart-full" />
                        <div className="preview-controls" />
                      </div>
                    )}
                  </div>
                  <span className="layout-name">{layout.name}</span>
                  <span className="layout-desc">{layout.description}</span>
                  {selectedLayout === layout.id && (
                    <div className="check-badge">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Prop Mode */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2>Prop Trading Challenge Mode</h2>
            <p className="step-description">Simulate a prop firm evaluation with real constraints. Perfect your strategy before going live.</p>
            
            <div className="prop-toggle-container">
              <div 
                className={`prop-toggle ${propModeEnabled ? 'enabled' : ''}`}
                onClick={() => setPropModeEnabled(!propModeEnabled)}
              >
                <span className="toggle-label">Enable Prop Mode</span>
                <div className="toggle-switch">
                  <div className="toggle-thumb" />
                </div>
              </div>
            </div>

            {propModeEnabled && (
              <div className="prop-settings">
                {propModeOptions.map((setting) => (
                  <div key={setting.label} className="setting-group">
                    <label>{setting.label}</label>
                    <div className="setting-options">
                      {setting.options.map((option) => (
                        <button
                          key={option}
                          className={`setting-btn ${
                            (setting.label === "Drawdown Limit" && propSettings.drawdown === option) ||
                            (setting.label === "Profit Target" && propSettings.profitTarget === option) ||
                            (setting.label === "Time Limit" && propSettings.timeLimit === option)
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => {
                            if (setting.label === "Drawdown Limit") setPropSettings({ ...propSettings, drawdown: option });
                            if (setting.label === "Profit Target") setPropSettings({ ...propSettings, profitTarget: option });
                            if (setting.label === "Time Limit") setPropSettings({ ...propSettings, timeLimit: option });
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="prop-preview">
                  <h4>Challenge Preview</h4>
                  <div className="preview-stats">
                    <div className="stat">
                      <span className="stat-label">Starting Balance</span>
                      <span className="stat-value">$10,000</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Max Loss</span>
                      <span className="stat-value negative">-${(10000 * parseInt(propSettings.drawdown) / 100).toFixed(0)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Profit Target</span>
                      <span className="stat-value positive">+${(10000 * parseInt(propSettings.profitTarget) / 100).toFixed(0)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{propSettings.timeLimit}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!propModeEnabled && (
              <div className="prop-info">
                <div className="info-icon">💡</div>
                <p>You can enable Prop Mode anytime from the Settings menu.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
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
          {currentStep === 3 ? 'Complete Setup' : 'Continue →'}
        </button>
      </div>

      <style jsx>{`
        .pro-onboarding {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0d14 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
        }

        /* Beacons */
        .beacons-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          pointer-events: none;
        }

        .beacon {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          animation: beacon-pulse 2s infinite;
        }

        .beacon::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #00d4aa;
          border-radius: 50%;
        }

        @keyframes beacon-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.7);
          }
          50% { 
            box-shadow: 0 0 0 20px rgba(0, 212, 170, 0);
          }
        }

        .beacon-chart { top: 200px; left: 300px; }
        .beacon-indicators { top: 100px; right: 400px; }
        .beacon-risk { bottom: 200px; right: 300px; }

        .beacon-message {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          border: 2px solid #00d4aa;
          border-radius: 12px;
          padding: 16px 32px;
          color: #f8fafc;
          font-size: 18px;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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
          gap: 40px;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0.5;
          transition: opacity 0.3s ease;
        }

        .progress-step.active {
          opacity: 1;
        }

        .step-number {
          width: 36px;
          height: 36px;
          border: 2px solid #334155;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #64748b;
          transition: all 0.3s ease;
        }

        .progress-step.active .step-number {
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border-color: #00d4aa;
          color: #0d0f14;
        }

        .progress-step.current .step-number {
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.4);
        }

        .step-info {
          display: flex;
          flex-direction: column;
        }

        .step-title {
          font-weight: 600;
          color: #f8fafc;
          font-size: 14px;
        }

        .step-subtitle {
          font-size: 12px;
          color: #64748b;
        }

        /* Content */
        .wizard-content {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 0 40px;
        }

        .step-content {
          max-width: 800px;
          width: 100%;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .step-content h2 {
          font-size: 32px;
          color: #f8fafc;
          margin-bottom: 12px;
        }

        .step-description {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 40px;
        }

        /* Asset Grid */
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .asset-card {
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .asset-card:hover:not(.disabled) {
          border-color: #00d4aa;
          transform: translateY(-2px);
        }

        .asset-card.selected {
          border-color: #00d4aa;
          background: rgba(0, 212, 170, 0.1);
        }

        .asset-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .asset-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .asset-name {
          font-size: 20px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .asset-desc {
          font-size: 14px;
          color: #64748b;
        }

        .check-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          background: #00d4aa;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d0f14;
          font-weight: 700;
        }

        /* Layout Grid */
        .layout-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .layout-card {
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .layout-card:hover {
          border-color: #00d4aa;
        }

        .layout-card.selected {
          border-color: #00d4aa;
          background: rgba(0, 212, 170, 0.1);
        }

        .layout-preview {
          background: #0f172a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          height: 140px;
        }

        .preview-classic {
          display: flex;
          gap: 8px;
          height: 100%;
        }

        .preview-chart {
          flex: 1;
          background: #1e293b;
          border-radius: 4px;
        }

        .preview-sidebar {
          width: 40%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-order, .preview-positions {
          flex: 1;
          background: #1e293b;
          border-radius: 4px;
        }

        .preview-advanced {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
        }

        .preview-charts {
          flex: 1;
          display: flex;
          gap: 8px;
        }

        .preview-chart-sm {
          flex: 1;
          background: #1e293b;
          border-radius: 4px;
        }

        .preview-depth {
          height: 40px;
          background: #1e293b;
          border-radius: 4px;
        }

        .preview-minimal {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
        }

        .preview-chart-full {
          flex: 1;
          background: #1e293b;
          border-radius: 4px;
        }

        .preview-controls {
          height: 24px;
          background: #1e293b;
          border-radius: 4px;
        }

        .layout-name {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .layout-desc {
          font-size: 13px;
          color: #64748b;
        }

        /* Prop Mode */
        .prop-toggle-container {
          margin-bottom: 32px;
        }

        .prop-toggle {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .prop-toggle:hover {
          border-color: #00d4aa;
        }

        .prop-toggle.enabled {
          border-color: #00d4aa;
          background: rgba(0, 212, 170, 0.1);
        }

        .toggle-label {
          font-size: 16px;
          font-weight: 600;
          color: #f8fafc;
        }

        .toggle-switch {
          width: 48px;
          height: 26px;
          background: #334155;
          border-radius: 13px;
          position: relative;
          transition: background 0.3s ease;
        }

        .prop-toggle.enabled .toggle-switch {
          background: #00d4aa;
        }

        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #f8fafc;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .prop-toggle.enabled .toggle-thumb {
          transform: translateX(22px);
        }

        .prop-settings {
          animation: fadeIn 0.3s ease;
        }

        .setting-group {
          margin-bottom: 24px;
        }

        .setting-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .setting-options {
          display: flex;
          gap: 12px;
        }

        .setting-btn {
          padding: 12px 20px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: 8px;
          color: #f8fafc;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .setting-btn:hover {
          border-color: #00d4aa;
        }

        .setting-btn.selected {
          background: rgba(0, 212, 170, 0.1);
          border-color: #00d4aa;
          color: #00d4aa;
        }

        .prop-preview {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          margin-top: 32px;
        }

        .prop-preview h4 {
          font-size: 16px;
          color: #f8fafc;
          margin-bottom: 16px;
        }

        .preview-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
        }

        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }

        .prop-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          background: #1e293b;
          border-radius: 12px;
        }

        .info-icon {
          font-size: 24px;
        }

        .prop-info p {
          color: #94a3b8;
          font-size: 15px;
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
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border: none;
          color: #0d0f14;
        }

        .next-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
        }

        .next-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
