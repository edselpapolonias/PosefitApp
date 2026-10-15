import { fireEvent, render, screen } from '@testing-library/react';
import AuthPage from './AuthPage';

const mockNavigate = jest.fn();
let mockPath = '/login';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPath }),
}), { virtual: true });

function renderAuth(path = '/login') {
  mockPath = path;
  return render(<AuthPage />);
}

describe('AuthPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPath = '/login';
  });

  test('shows the PoseFit brand and login form by default', () => {
    renderAuth();

    expect(screen.getByLabelText('PoseFit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log in to PoseFit' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('switches to signup and updates the form content', async () => {
    const page = renderAuth();

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(mockNavigate).toHaveBeenCalledWith('/register', {});

    mockPath = '/register';
    page.rerender(<AuthPage />);
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  test('allows the login password to be shown and hidden', () => {
    renderAuth();
    const password = screen.getByLabelText('Password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
