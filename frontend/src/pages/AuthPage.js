import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// ─── Animation variants ──────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const formVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  }),
};

const fieldVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = location.pathname === '/register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [direction, setDirection] = useState(1);

  // Login state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
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

  // ─── Handlers ────────────────────────────────────────────────────────────
  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setDirection(tab === 'register' ? 1 : -1);
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
      const res = await axios.post(
        'http://127.0.0.1:8000/api/users/login/',
        loginForm,
        { withCredentials: true }
      );
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/exercises');
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed');
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
      await axios.post('http://127.0.0.1:8000/api/users/register/', registerForm);
      setRegisterSuccess('Account created! Switching to Sign In…');
      setTimeout(() => {
        switchTab('login');
        setRegisterSuccess('');
      }, 2000);
    } catch (err) {
      setRegisterError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setRegisterLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-bg p-4 font-poppins">
      {/* Decorative blurred circles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-brand/8 blur-3xl" />
      </div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-xl rounded-3xl bg-card-white shadow-2xl shadow-black/8 overflow-hidden"
      >
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="pt-10 pb-2 text-center">
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div
                key="login-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-orange-brand uppercase">
                  Welcome Back
                </h1>
                <p className="mt-1 text-lg md:text-xl font-semibold text-orange-brand/80">
                  Train Smarter, Move Better
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="register-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-orange-brand uppercase">
                  Create Your Account
                </h1>
                <p className="mt-1 text-lg md:text-xl font-semibold text-orange-brand/80">
                  Start training today
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Tab Toggle ─────────────────────────────────────────── */}
        <div className="mx-auto mt-5 flex w-72 rounded-full bg-gray-200 p-1 relative">
          {/* Sliding highlight */}
          <motion.div
            layout
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-orange-brand"
            animate={{ left: activeTab === 'login' ? '4px' : 'calc(50%)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button
            id="tab-sign-in"
            onClick={() => switchTab('login')}
            className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer ${
              activeTab === 'login' ? 'text-white' : 'text-gray-500'
            }`}
          >
            Sign In
          </button>
          <button
            id="tab-create-account"
            onClick={() => switchTab('register')}
            className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer ${
              activeTab === 'register' ? 'text-white' : 'text-gray-500'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* ─── Form Area ──────────────────────────────────────────── */}
        <div className="px-8 md:px-14 pt-8 pb-10 min-h-[360px]">
          <AnimatePresence mode="wait" custom={direction}>
            {activeTab === 'login' ? (
              <motion.form
                key="login-form"
                custom={direction}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleLoginSubmit}
              >
                {/* Error */}
                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm text-red-600"
                    >
                      <i className="fa-solid fa-circle-exclamation mr-2" />
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username */}
                <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" className="mb-5">
                  <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fa-solid fa-user" />
                    </span>
                    <input
                      id="login-username"
                      name="username"
                      type="text"
                      value={loginForm.username}
                      onChange={handleLoginChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="Enter your username"
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" className="mb-4">
                  <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 pl-11 pr-11 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`} />
                    </button>
                  </div>
                </motion.div>

                {/* Remember Me */}
                <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" className="mb-8 flex items-center gap-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 rounded border-gray-300 accent-orange-brand cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="text-sm text-gray-500 cursor-pointer select-none">
                    Remember Me
                  </label>
                </motion.div>

                {/* Submit */}
                <motion.button
                  custom={3}
                  variants={fieldVariants}
                  initial="hidden"
                  animate="visible"
                  id="login-submit"
                  type="submit"
                  disabled={loginLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-full bg-orange-brand py-4 text-base font-bold text-white shadow-lg shadow-orange-brand/30 hover:bg-orange-hover transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {loginLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin" /> Signing In…
                    </span>
                  ) : (
                    'Sign In to Posefit'
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                custom={direction}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleRegisterSubmit}
              >
                {/* Error */}
                <AnimatePresence>
                  {registerError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm text-red-600"
                    >
                      <i className="fa-solid fa-circle-exclamation mr-2" />
                      {registerError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {registerSuccess && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-center text-sm text-green-600"
                    >
                      <i className="fa-solid fa-circle-check mr-2" />
                      {registerSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username */}
                <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" className="mb-4">
                  <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                    Username
                  </label>
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                    required
                    className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                    placeholder="Choose a username"
                  />
                </motion.div>

                {/* First / Last Name row */}
                <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                      First Name
                    </label>
                    <input
                      id="register-first-name"
                      name="first_name"
                      type="text"
                      value={registerForm.first_name}
                      onChange={handleRegisterChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                      Last Name
                    </label>
                    <input
                      id="register-last-name"
                      name="last_name"
                      type="text"
                      value={registerForm.last_name}
                      onChange={handleRegisterChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="Last name"
                    />
                  </div>
                </motion.div>

                {/* Age */}
                <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" className="mb-4">
                  <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                    Age
                  </label>
                  <input
                    id="register-age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    value={registerForm.age}
                    onChange={handleRegisterChange}
                    required
                    className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                    placeholder="Enter your age"
                  />
                </motion.div>

                {/* Password / Confirm Password row */}
                <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" className="mb-8 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                      Password
                    </label>
                    <input
                      id="register-password"
                      name="password"
                      type="password"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold tracking-widest text-label-gray uppercase">
                      Confirm Password
                    </label>
                    <input
                      id="register-confirm-password"
                      name="confirm_password"
                      type="password"
                      value={registerForm.confirm_password}
                      onChange={handleRegisterChange}
                      required
                      className="w-full rounded-xl bg-input-bg py-3.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-brand/40 transition-all placeholder:text-gray-400"
                      placeholder="Confirm password"
                    />
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.button
                  custom={4}
                  variants={fieldVariants}
                  initial="hidden"
                  animate="visible"
                  id="register-submit"
                  type="submit"
                  disabled={registerLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-full bg-orange-brand py-4 text-base font-bold text-white shadow-lg shadow-orange-brand/30 hover:bg-orange-hover transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {registerLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin" /> Creating Account…
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
