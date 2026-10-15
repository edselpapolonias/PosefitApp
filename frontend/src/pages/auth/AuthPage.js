import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { apiUrl } from '../../services/apiConfig';
import backgroundImage from '../../images/auth-background.png';
import poseFitLogo from '../../images/PoseFit Logo.png';
import './AuthPage.css';

const formVariants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.14, ease: 'easeIn' } },
};

function StatusMessage({ type, children }) {
  if (!children) return null;

  return (
    <div className={`auth-status auth-status--${type}`} role="alert" aria-live="polite">
      <i
        className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}

function PasswordInput({ id, name, value, onChange, placeholder, autoComplete, visible, onToggle }) {
  return (
    <div className="auth-password-field">
      <input
        id={id}
        className="auth-input auth-input--password"
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        className="auth-password-toggle"
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        <i className={`fa-regular ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/register' ? 'register' : 'login';

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [showRegisterPasswords, setShowRegisterPasswords] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const switchTab = (tab, options = {}) => {
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
    navigate(tab === 'register' ? '/register' : '/login', options);
  };

  const handleLoginChange = (event) => {
    setLoginForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRegisterChange = (event) => {
    setRegisterForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const csrfResponse = await axios.get(apiUrl('/api/users/csrf/'), { withCredentials: true });
      const csrfToken = csrfResponse.data?.csrf_token;
      const response = await axios.post(
        apiUrl('/api/users/login/'),
        loginForm,
        {
          withCredentials: true,
          headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
        },
      );

      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.csrf_token) {
        sessionStorage.setItem('posefit-csrf-token', response.data.csrf_token);
      }
      navigate('/dashboard');
    } catch (error) {
      setLoginError(
        error.response?.data?.error
        || error.response?.data?.detail
        || 'Unable to connect to the login service.',
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);

    try {
      await axios.post(apiUrl('/api/users/register/'), registerForm);
      setRegisterSuccess('Account created. Taking you to log in…');
      window.setTimeout(() => switchTab('login', { replace: true }), 1200);
    } catch (error) {
      setRegisterError(error.response?.data?.error || 'We could not create your account. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const renderLoginForm = () => (
    <motion.form
      className="auth-form"
      key="login"
      variants={formVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={handleLoginSubmit}
    >
      <div className="auth-form-heading">
        <p className="auth-eyebrow">Welcome back</p>
        <h1>Log in to PoseFit</h1>
        <p>Pick up where you left off and keep building better movement.</p>
      </div>

      <StatusMessage type="error">{loginError}</StatusMessage>

      <div className="auth-field">
        <label htmlFor="login-username">Username</label>
        <input
          id="login-username"
          className="auth-input"
          name="username"
          type="text"
          value={loginForm.username}
          onChange={handleLoginChange}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Your username"
          autoFocus
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <PasswordInput
          id="login-password"
          name="password"
          value={loginForm.password}
          onChange={handleLoginChange}
          placeholder="Your password"
          autoComplete="current-password"
          visible={showLoginPassword}
          onToggle={() => setShowLoginPassword((visible) => !visible)}
        />
      </div>

      <button className="auth-submit" type="submit" disabled={loginLoading}>
        {loginLoading ? 'Logging in…' : 'Log in'}
      </button>

      <p className="auth-form-switch">
        New to PoseFit?{' '}
        <button type="button" onClick={() => switchTab('register')}>Create an account</button>
      </p>
    </motion.form>
  );

  const renderRegisterForm = () => (
    <motion.form
      className="auth-form"
      key="register"
      variants={formVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={handleRegisterSubmit}
    >
      <div className="auth-form-heading">
        <p className="auth-eyebrow">Get started</p>
        <h1>Create your account</h1>
        <p>A few details and you’ll be ready for your first session.</p>
      </div>

      <StatusMessage type="error">{registerError}</StatusMessage>
      <StatusMessage type="success">{registerSuccess}</StatusMessage>

      <div className="auth-field">
        <label htmlFor="register-username">Username</label>
        <input
          id="register-username"
          className="auth-input"
          name="username"
          type="text"
          value={registerForm.username}
          onChange={handleRegisterChange}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Choose a username"
          autoFocus
        />
      </div>

      <div className="auth-field-row">
        <div className="auth-field">
          <label htmlFor="register-first-name">First name</label>
          <input
            id="register-first-name"
            className="auth-input"
            name="first_name"
            type="text"
            value={registerForm.first_name}
            onChange={handleRegisterChange}
            required
            autoComplete="given-name"
            placeholder="First name"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="register-last-name">Last name</label>
          <input
            id="register-last-name"
            className="auth-input"
            name="last_name"
            type="text"
            value={registerForm.last_name}
            onChange={handleRegisterChange}
            required
            autoComplete="family-name"
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="register-age">Age</label>
        <input
          id="register-age"
          className="auth-input"
          name="age"
          type="number"
          min="1"
          max="120"
          inputMode="numeric"
          value={registerForm.age}
          onChange={handleRegisterChange}
          required
          placeholder="Your age"
        />
      </div>

      <div className="auth-field-row">
        <div className="auth-field">
          <label htmlFor="register-password">Password</label>
          <PasswordInput
            id="register-password"
            name="password"
            value={registerForm.password}
            onChange={handleRegisterChange}
            placeholder="Create a password"
            autoComplete="new-password"
            visible={showRegisterPasswords}
            onToggle={() => setShowRegisterPasswords((visible) => !visible)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="register-confirm-password">Confirm password</label>
          <PasswordInput
            id="register-confirm-password"
            name="confirm_password"
            value={registerForm.confirm_password}
            onChange={handleRegisterChange}
            placeholder="Repeat password"
            autoComplete="new-password"
            visible={showRegisterPasswords}
            onToggle={() => setShowRegisterPasswords((visible) => !visible)}
          />
        </div>
      </div>

      <button className="auth-submit" type="submit" disabled={registerLoading || Boolean(registerSuccess)}>
        {registerLoading ? 'Creating account…' : 'Create account'}
      </button>

      <p className="auth-form-switch">
        Already have an account?{' '}
        <button type="button" onClick={() => switchTab('login')}>Log in</button>
      </p>
    </motion.form>
  );

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="PoseFit guided home workout">
        <img src={backgroundImage} alt="A woman practicing a squat during a home workout" />
        <div className="auth-visual-shade" />
        <div className="auth-visual-brand" aria-label="PoseFit">
          <img src={poseFitLogo} alt="" />
          <span>Pose<span>Fit</span></span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <button className="auth-mobile-brand" type="button" onClick={() => switchTab('login')} aria-label="Go to PoseFit login">
            <img src={poseFitLogo} alt="" />
            <span>Pose<span>Fit</span></span>
          </button>

          <nav className="auth-tabs" aria-label="Account access">
            <button
              className={activeTab === 'login' ? 'is-active' : ''}
              type="button"
              onClick={() => switchTab('login')}
              aria-current={activeTab === 'login' ? 'page' : undefined}
            >
              Log in
            </button>
            <button
              className={activeTab === 'register' ? 'is-active' : ''}
              type="button"
              onClick={() => switchTab('register')}
              aria-current={activeTab === 'register' ? 'page' : undefined}
            >
              Sign up
            </button>
          </nav>

          <div className="auth-form-stage">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'login' ? renderLoginForm() : renderRegisterForm()}
            </AnimatePresence>
          </div>

          <p className="auth-footnote">Your workout data stays tied to your account.</p>
        </div>
      </section>
    </main>
  );
}
