import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiUrl } from '../services/apiConfig';
import poseFitLogo from '../images/PoseFit Logo.png';
import './Navbar.css';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Exercises', path: '/exercises' },
  { label: 'Workout Plans', path: '/workout-plans' },
  { label: 'History', path: '/history' },
  { label: 'Progress', path: '/progress' },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

export default function Navbar({ activeItem }) {
  const navigate = useNavigate();
  const location = useLocation();
  const handleNavigation = (event, path) => {
    // Keep modified clicks (new tab/window) and parent-page navigation intact.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (location.pathname === path && !location.search && !location.hash) event.preventDefault();
    setAccountMenuOpen(false);
    setLogoutError('');
  };
  const accountMenuRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const user = getStoredUser();
  const displayName = user.first_name || user.username || 'User';
  const initials = `${user.first_name?.[0] || user.username?.[0] || 'U'}${user.last_name?.[0] || ''}`.toUpperCase();

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
        setLogoutError('');
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setLogoutError('');
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setLogoutError('');

    try {
      const csrfResponse = await axios.get(apiUrl('/api/users/csrf/'), {
        withCredentials: true,
        timeout: 10000,
      });
      const csrfToken = csrfResponse.data?.csrf_token;

      await axios.post(
        apiUrl('/api/users/logout/'),
        {},
        {
          withCredentials: true,
          headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
          timeout: 10000,
        }
      );

      localStorage.removeItem('user');
      localStorage.removeItem('posefitSessionFeedbackById');
      sessionStorage.removeItem('posefit-csrf-token');
      sessionStorage.removeItem('posefitSquatWorkoutConfig');
      sessionStorage.removeItem('posefitLatestSessionResult');
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.response?.data?.error || 'Unable to log out. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <header className="top-navbar">
      <div className="top-navbar__inner">
        <NavLink className="top-navbar__brand" to="/dashboard" onClick={(event) => handleNavigation(event, '/dashboard')} aria-label="PoseFit dashboard">
          <img className="top-navbar__brand-logo" src={poseFitLogo} alt="" aria-hidden="true" />
          <span className="top-navbar__brand-copy">
            <span className="top-navbar__brand-name">
              POSE<span>FIT</span>
            </span>
            <span className="top-navbar__tagline">Train Smart. Move Better.</span>
          </span>
        </NavLink>

        <nav className="top-navbar__links" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            item.path ? (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={(event) => handleNavigation(event, item.path)}
              className={({ isActive }) => `top-navbar__link${isActive || activeItem === item.label ? ' top-navbar__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
            ) : (
              <span key={item.label} className={`top-navbar__link${activeItem === item.label ? ' top-navbar__link--active' : ''}`} aria-disabled="true">
                {item.label}
              </span>
            )
          ))}
        </nav>

        <div className="top-navbar__actions">
          <div className="top-navbar__account-menu" ref={accountMenuRef}>
            <button
              className="top-navbar__account"
              type="button"
              aria-label={`Account menu for ${displayName}`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => {
                setAccountMenuOpen((open) => !open);
                setLogoutError('');
              }}
            >
              <span className="top-navbar__avatar" aria-hidden="true">{initials}</span>
              <span className="top-navbar__user-name">{displayName}</span>
              <i className={`fa-solid fa-chevron-down top-navbar__chevron${accountMenuOpen ? ' top-navbar__chevron--open' : ''}`} aria-hidden="true" />
            </button>

            {accountMenuOpen && (
              <div className="top-navbar__dropdown" role="menu">
                <NavLink
                  className="top-navbar__menu-item"
                  to="/user"
                  role="menuitem"
                  onClick={(event) => handleNavigation(event, '/user')}
                >
                  <i className="fa-regular fa-user" aria-hidden="true" />
                  <span>User</span>
                </NavLink>
                <button
                  className="top-navbar__logout"
                  type="button"
                  role="menuitem"
                  disabled={logoutLoading}
                  onClick={handleLogout}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                  <span>{logoutLoading ? 'Logging out...' : 'Log out'}</span>
                </button>
                {logoutError && <p className="top-navbar__logout-error" role="alert">{logoutError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
