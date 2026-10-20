import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
}

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<CurrentLocation />} />
        <Route path="/verify-otp" element={<CurrentLocation />} />
        <Route path="/records" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  const login = vi.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({ login });
  });

  it('renders the email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows required-field errors without calling the login action', () => {
    renderLogin();

    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows a validation error for malformed email addresses', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'secret123');

    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));

    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in and redirects to the dashboard after valid submission', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ success: true });
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).toHaveBeenCalledWith('patient@example.com', 'secret123');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
  });

  it('offers OTP verification when the backend rejects an unverified account', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByText('Your account is not verified yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /enter otp verification code/i }));
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      '/verify-otp?email=patient%40example.com',
    );
  });

  it.each([
    'invalid',
    'missing-at.example.com',
    'user@',
    '@example.com',
    'user@example',
  ])('rejects malformed email address %s', async (email) => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), email);
    await user.type(screen.getByLabelText('Password'), 'secret123');
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));

    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('treats whitespace-only email as missing', () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('requires a password when the email is valid', () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'patient@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));

    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('clears the email validation message when the email is edited', async () => {
    const user = userEvent.setup();
    renderLogin();
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form'));
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('shows the backend error message when login fails for another reason', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new Error('Invalid email or password'));
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('shows the verified confirmation banner from the query string', () => {
    renderLogin('/login?verified=true');

    expect(screen.getByText('Email verified! Please sign in.')).toBeInTheDocument();
  });

  it('returns to the originally requested route after login', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ success: true });
    renderLogin({ pathname: '/login', state: { from: { pathname: '/records' } } });
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByTestId('current-location')).toHaveTextContent('/records');
  });

  it('submits email addresses containing plus tags unchanged', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ success: true });
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'patient+care@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).toHaveBeenCalledWith('patient+care@example.com', 'secret123');
  });
});
