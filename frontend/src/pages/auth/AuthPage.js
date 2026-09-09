import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { apiUrl } from '../../services/apiConfig';
import backgroundImage from '../../images/auth-background.png';
import frameImg from '../../images/frame.png';
import dashboardImg from '../../images/dashboard.png';
import systemImg from '../../images/system.png';

const ORANGE = '#F97316';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

const formVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -14, transition: { duration: 0.18, ease: 'easeIn' } },
};

const inputStyle = {
  width: '100%',
  height: 46,
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  padding: '0 14px',
  color: TEXT,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  color: '#374151',
  fontSize: 13,
  fontWeight: 700,
};

const buttonStyle = {
  width: '100%',
  height: 48,
  borderRadius: 8,
  border: 'none',
  background: ORANGE,
  color: '#fff',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = location.pathname === '/register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    age: '',
    password: '',
    confirm_password: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const csrfResponse = await axios.get(
        apiUrl('/api/users/csrf/'),
        { withCredentials: true }
      );
      const csrfToken = csrfResponse.data?.csrf_token;
      const res = await axios.post(
        apiUrl('/api/users/login/'),
        loginForm,
        {
          withCredentials: true,
          headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
        }
      );
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.csrf_token) {
        sessionStorage.setItem('posefit-csrf-token', res.data.csrf_token);
      }
      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.response?.data?.error || err.response?.data?.detail || 'Unable to connect to the login service.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);
    try {
      await axios.post(apiUrl('/api/users/register/'), registerForm);
      setRegisterSuccess('Account created! You can now log in.');
      setTimeout(() => switchTab('login'), 1400);
    } catch (err) {
      setRegisterError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setRegisterLoading(false);
    }
  };

  const renderLoginForm = () => (
    <motion.form
      key="login"
      variants={formVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={handleLoginSubmit}
    >
      <h1 style={{ margin: 0, color: TEXT, fontSize: 38, fontWeight: 900, lineHeight: 1.05, textAlign: 'center' }}>
        Welcome Back
      </h1>
      <p style={{ margin: '10px 0 30px', color: MUTED, fontSize: 15, textAlign: 'center' }}>
        Log in to track your form and progress
      </p>

      {loginError && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 700 }}>
          {loginError}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="login-username" style={labelStyle}>Username</label>
        <input
          id="login-username"
          name="username"
          type="text"
          value={loginForm.username}
          onChange={handleLoginChange}
          required
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.14)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}
          placeholder="Enter your username"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label htmlFor="login-password" style={labelStyle}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={loginForm.password}
            onChange={handleLoginChange}
            required
            style={{ ...inputStyle, paddingRight: 46 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.14)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}
          >
            <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        </div>
      </div>

      <button type="submit" disabled={loginLoading} style={{ ...buttonStyle, marginTop: 22, opacity: loginLoading ? 0.7 : 1 }}>
        {loginLoading ? 'Logging In...' : 'Log In'}
      </button>

      <p style={{ margin: '24px 0 0', textAlign: 'center', color: MUTED, fontSize: 14 }}>
        Don't have an account?{' '}
        <button type="button" onClick={() => switchTab('register')} style={{ border: 'none', background: 'transparent', color: ORANGE, fontWeight: 900, cursor: 'pointer' }}>
          Sign up
        </button>
      </p>
    </motion.form>
  );

  const renderRegisterForm = () => (
    <motion.form
      key="register"
      variants={formVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={handleRegisterSubmit}
    >
      <h1 style={{ margin: 0, color: TEXT, fontSize: 38, fontWeight: 900, lineHeight: 1.05, textAlign: 'center' }}>
        Get Started
      </h1>
      <p style={{ margin: '10px 0 30px', color: MUTED, fontSize: 15, textAlign: 'center' }}>
        Create your account to start improving every rep
      </p>

      {registerError && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 700 }}>
          {registerError}
        </div>
      )}
      {registerSuccess && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#ECFDF5', color: '#047857', fontSize: 13, fontWeight: 700 }}>
          {registerSuccess}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="register-username" style={labelStyle}>Username</label>
        <input id="register-username" name="username" type="text" value={registerForm.username} onChange={handleRegisterChange} required style={inputStyle} placeholder="Enter your username" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 16 }}>
        <div>
          <label htmlFor="register-first-name" style={labelStyle}>First Name</label>
          <input id="register-first-name" name="first_name" type="text" value={registerForm.first_name} onChange={handleRegisterChange} required style={inputStyle} placeholder="First name" />
        </div>
        <div>
          <label htmlFor="register-last-name" style={labelStyle}>Last Name</label>
          <input id="register-last-name" name="last_name" type="text" value={registerForm.last_name} onChange={handleRegisterChange} required style={inputStyle} placeholder="Last name" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="register-age" style={labelStyle}>Age</label>
        <input id="register-age" name="age" type="number" min="1" max="120" value={registerForm.age} onChange={handleRegisterChange} required style={inputStyle} placeholder="Enter your age" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 22 }}>
        <div>
          <label htmlFor="register-password" style={labelStyle}>Password</label>
          <input id="register-password" name="password" type="password" value={registerForm.password} onChange={handleRegisterChange} required style={inputStyle} placeholder="Password" />
        </div>
        <div>
          <label htmlFor="register-confirm-password" style={labelStyle}>Confirm Password</label>
          <input id="register-confirm-password" name="confirm_password" type="password" value={registerForm.confirm_password} onChange={handleRegisterChange} required style={inputStyle} placeholder="Confirm" />
        </div>
      </div>

      <button type="submit" disabled={registerLoading} style={{ ...buttonStyle, opacity: registerLoading ? 0.7 : 1 }}>
        {registerLoading ? 'Creating Account...' : 'Sign Up'}
      </button>

      <p style={{ margin: '24px 0 0', textAlign: 'center', color: MUTED, fontSize: 14 }}>
        Already have an account?{' '}
        <button type="button" onClick={() => switchTab('login')} style={{ border: 'none', background: 'transparent', color: ORANGE, fontWeight: 900, cursor: 'pointer' }}>
          Log in
        </button>
      </p>
    </motion.form>
  );

  return (
    <main style={{ background: '#fff', fontFamily: 'Poppins, Inter, sans-serif' }}>
      <section
        className="auth-split"
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(420px, 0.9fr)',
          background: '#fff',
        }}
      >
        <section style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <img
          src={backgroundImage}
          alt="Woman training at home"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </section>

        <section
          style={{
            minHeight: '100vh',
            display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 64px',
          boxSizing: 'border-box',
          background: '#fff',
          }}
        >
          <div style={{ width: '100%', maxWidth: 430 }}>
            <AnimatePresence mode="wait">
              {activeTab === 'login' ? renderLoginForm() : renderRegisterForm()}
            </AnimatePresence>
          </div>
        </section>
      </section>

      <section style={{ background: '#ffffff', padding: '80px 60px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: TEXT,
                fontFamily: 'Impact, Anton, "Archivo Black", "Oswald", sans-serif',
                fontSize: 'clamp(40px, 6vw, 76px)',
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              YOU'RE DOING REPS.
              <span style={{ display: 'block', color: ORANGE }}>
                BUT ARE THEY DOING ANYTHING?
              </span>
            </h2>
            <p style={{ marginTop: 28, maxWidth: 560, color: MUTED, fontSize: 18, lineHeight: 1.7 }}>
              Most people train blind - no camera, no feedback, no idea if their form is helping or hurting them.
            </p>
            <p style={{ marginTop: 18, maxWidth: 560, color: TEXT, fontSize: 18, fontWeight: 700, lineHeight: 1.65 }}>
              PoseFit fixes that with real-time pose analysis, instant corrections, and feedback that actually improves your form.
            </p>
          </div>

          <div>
            <p style={{ margin: '0 0 18px', color: TEXT, fontSize: 14, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              COMMON PROBLEMS:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {['Bad Form', 'No Feedback', 'No Progress Tracking', 'No Real-Time Fixes'].map((problem) => (
                <div
                  key={problem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    minHeight: 86,
                    padding: 24,
                    borderRadius: 12,
                    border: '1px solid rgba(156, 163, 175, 0.35)',
                    background: 'rgba(249, 250, 251, 0.95)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: '2px solid #9CA3AF',
                      color: MUTED,
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </span>
                  <span style={{ color: TEXT, fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{problem}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 24,
                borderRadius: 12,
                border: '1px solid rgba(249, 115, 22, 0.35)',
                background: 'rgba(249, 115, 22, 0.1)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `2px solid ${ORANGE}`,
                    color: ORANGE,
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  <i className="fa-solid fa-check" />
                </span>
                <span style={{ color: ORANGE, fontSize: 16, fontWeight: 900 }}>POSEFIT SOLUTION:</span>
              </div>
              <p style={{ margin: '14px 0 0', color: TEXT, fontSize: 17, fontWeight: 600, lineHeight: 1.65 }}>
                Uses computer vision to track your joints in real time, scores your form instantly, and gives corrective feedback - no wearables, no gym trainer, just your webcam.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: '#ffffff', padding: '64px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2
            style={{
              margin: '0 0 28px',
              color: TEXT,
              fontFamily: 'Impact, Anton, "Archivo Black", "Oswald", sans-serif',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            FORM MEETS <span style={{ color: ORANGE }}>FEEDBACK.</span>
          </h2>

          <div
            className="feedback-features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              alignItems: 'stretch',
            }}
          >
            {/* Column 1: Real-Time Feedback */}
            <div
              className="feature-card"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '32px 24px',
                border: '2px solid rgba(229, 231, 235, 0.8)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  background: '#ffffff',
                  padding: 16,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={frameImg}
                  alt="Real-Time Feedback"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3 style={{ margin: '16px 0 0', color: TEXT, fontSize: 20, fontWeight: 800, textAlign: 'center' }}>
                Real-Time Feedback
              </h3>
              <p style={{ margin: '12px 0 0', color: MUTED, fontSize: 14, lineHeight: 1.65, maxWidth: 300, textAlign: 'center' }}>
                Use your webcam to get instant form corrections as you move. PoseFit tracks your squats, push-ups, and planks rep-by-rep — no wearables, no gym trainer, just your camera and AI-powered pose analysis.
              </p>
            </div>

            {/* Column 2: Session Summary */}
            <div
              className="feature-card"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '32px 24px',
                border: '2px solid rgba(229, 231, 235, 0.8)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  background: '#ffffff',
                  padding: 16,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={dashboardImg}
                  alt="Session Summary"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3 style={{ margin: '16px 0 0', color: TEXT, fontSize: 20, fontWeight: 800, textAlign: 'center' }}>
                Session Summary
              </h3>
              <p style={{ margin: '12px 0 0', color: MUTED, fontSize: 14, lineHeight: 1.65, maxWidth: 300, textAlign: 'center' }}>
                After each workout, PoseFit generates a summary based on your rep count, form accuracy, and the specific errors detected during your session — so you can track your progress and know exactly what to work on next time.
              </p>
            </div>

            {/* Column 3: Grow Smarter */}
            <div
              className="feature-card"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '32px 24px',
                border: '2px solid rgba(229, 231, 235, 0.8)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  background: '#ffffff',
                  padding: 16,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={systemImg}
                  alt="Grow Smarter"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3 style={{ margin: '16px 0 0', color: TEXT, fontSize: 20, fontWeight: 800, textAlign: 'center' }}>
                Grow Smarter
              </h3>
              <p style={{ margin: '12px 0 0', color: MUTED, fontSize: 14, lineHeight: 1.65, maxWidth: 300, textAlign: 'center' }}>
                Fix your form with personalized feedback that adapts to your movement — helping you build strength safely and see real progress, rep after rep.
              </p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .feature-card:hover {
          border-color: #F97316 !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 28px rgba(249, 115, 22, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06) !important;
        }
        @media (max-width: 1023px) {
          .auth-split {
            grid-template-columns: 1fr !important;
          }
          .auth-split > section:first-of-type {
            min-height: 30vh !important;
            height: 30vh !important;
          }
          .auth-split > section:last-of-type {
            min-height: auto !important;
            padding: 40px 24px 48px !important;
          }
        }
        @media (max-width: 768px) {
          .feedback-features-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
        @media (max-width: 560px) {
          form div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
