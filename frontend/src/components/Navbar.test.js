import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from './Navbar';

let mockLocation;
const mockNavigation = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigation,
  NavLink: ({ to, onClick, className, children, ...props }) => <a {...props} href={to}
    className={typeof className === 'function' ? className({ isActive: mockLocation.pathname === to }) : className}
    onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) mockNavigation(to); event.preventDefault(); }}>{children}</a>,
}), { virtual: true });
beforeEach(() => { mockLocation = { pathname: '/dashboard', search: '', hash: '' }; mockNavigation.mockClear(); });

test('repeated current-page clicks do not navigate and close the account menu', () => {
  render(<Navbar activeItem="Dashboard" />);
  fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
  for (let i = 0; i < 10; i += 1) fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
  expect(mockNavigation).not.toHaveBeenCalled();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Exercises' }));
  expect(mockNavigation).toHaveBeenCalledWith('/exercises');
});

test('parent navigation and modified clicks still work', () => {
  mockLocation.pathname = '/workout-plans/beginner-full-body';
  render(<Navbar activeItem="Workout Plans" />);
  fireEvent.click(screen.getByRole('link', { name: 'Workout Plans' }));
  expect(mockNavigation).toHaveBeenCalledWith('/workout-plans');
  mockLocation.pathname = '/dashboard';
  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }), { ctrlKey: true });
  expect(mockNavigation).toHaveBeenCalledWith('/dashboard');
});
