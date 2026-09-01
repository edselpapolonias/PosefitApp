import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Exercises', path: '/exercises' },
  { label: 'Workout Plans' },
  { label: 'History' },
  { label: 'Progress' },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

export default function Navbar() {
  const user = getStoredUser();
  const displayName = user.first_name || user.username || 'User';
  const initials = `${user.first_name?.[0] || user.username?.[0] || 'U'}${user.last_name?.[0] || ''}`.toUpperCase();

  return (
    <header className="top-navbar">
      <div className="top-navbar__inner">
        <NavLink className="top-navbar__brand" to="/dashboard" aria-label="PoseFit dashboard">
          <span className="top-navbar__brand-icon" aria-hidden="true">
            <i className="fa-solid fa-person-running" />
          </span>
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
                className={({ isActive }) => `top-navbar__link${isActive ? ' top-navbar__link--active' : ''}`}
              >
                {item.label}
              </NavLink>
            ) : (
              <span key={item.label} className="top-navbar__link" aria-disabled="true">
                {item.label}
              </span>
            )
          ))}
        </nav>

        <div className="top-navbar__actions">
          <button className="top-navbar__icon-button" type="button" aria-label="Notifications">
            <i className="fa-regular fa-bell" aria-hidden="true" />
          </button>

          <div className="top-navbar__account" aria-label={`Signed in as ${displayName}`}>
            <span className="top-navbar__avatar" aria-hidden="true">{initials}</span>
            <span className="top-navbar__user-name">{displayName}</span>
            <i className="fa-solid fa-chevron-down top-navbar__chevron" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
