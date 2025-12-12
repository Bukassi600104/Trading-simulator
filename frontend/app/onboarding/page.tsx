"use client";

import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore, UserExperience } from "@/stores/onboardingStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  useAuthStore();  // Keep store active
  const { setExperience } = useOnboardingStore();
  const [selectedExperience, setSelectedExperience] = useState<UserExperience>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Show loading spinner until component is mounted
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSelect = (exp: UserExperience) => {
    setSelectedExperience(exp);
    setIsAnimating(true);
    
    // Navigate after animation
    setTimeout(() => {
      setExperience(exp);
      switch (exp) {
        case 'beginner':
          router.push("/onboarding/rookie");
          break;
        case 'experienced':
          router.push("/onboarding/pro");
          break;
        case 'instructor':
          router.push("/onboarding/instructor");
          break;
      }
    }, 500);
  };

  // Show loading spinner while page hydrates
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1e293b',
          borderTopColor: '#00d4aa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const experienceOptions = [
    {
      id: 'beginner' as UserExperience,
      icon: '🌱',
      title: "I'm a Beginner",
      description: "New to trading? We'll guide you through your first trade step by step.",
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      id: 'experienced' as UserExperience,
      icon: '📈',
      title: "I'm an Experienced Trader",
      description: "Know the basics? Skip the tutorial and customize your trading environment.",
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    },
    {
      id: 'instructor' as UserExperience,
      icon: '🎓',
      title: "I'm an Instructor/School",
      description: "Manage students, create classrooms, and monitor trading performance.",
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
  ];

  return (
    <div className="onboarding-page">
      <div className={`content ${isAnimating ? 'fade-out' : ''}`}>
        <div className="logo">
          <span className="logo-icon">M</span>
          <span className="logo-text">Midnight Trader</span>
        </div>

        <h1>What is your trading experience?</h1>
        <p className="subtitle">This helps us personalize your experience</p>

        <div className="cards">
          {experienceOptions.map((option) => (
            <button
              key={option.id}
              className={`experience-card ${selectedExperience === option.id ? 'selected' : ''}`}
              onClick={() => handleSelect(option.id)}
              style={{ '--accent-color': option.color, '--accent-gradient': option.gradient } as React.CSSProperties}
            >
              <div className="card-icon">{option.icon}</div>
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <div className="card-glow" />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0d14 0%, #0f1520 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .content {
          text-align: center;
          max-width: 1000px;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .content.fade-out {
          opacity: 0;
          transform: scale(0.95);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 48px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: #0d0f14;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: #f8fafc;
        }

        h1 {
          font-size: 40px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 12px;
        }

        .subtitle {
          font-size: 18px;
          color: #94a3b8;
          margin-bottom: 48px;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .experience-card {
          position: relative;
          background: #0f172a;
          border: 2px solid #1e293b;
          border-radius: 20px;
          padding: 40px 32px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          overflow: hidden;
        }

        .experience-card:hover {
          border-color: var(--accent-color);
          transform: translateY(-8px);
        }

        .experience-card.selected {
          border-color: var(--accent-color);
          background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(var(--accent-color), 0.1) 100%);
        }

        .card-icon {
          font-size: 56px;
          margin-bottom: 20px;
        }

        .experience-card h3 {
          font-size: 22px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 12px;
        }

        .experience-card p {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
        }

        .card-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100px;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          mask-image: linear-gradient(transparent, black);
          -webkit-mask-image: linear-gradient(transparent, black);
        }

        .experience-card:hover .card-glow,
        .experience-card.selected .card-glow {
          opacity: 0.15;
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }

          h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}
