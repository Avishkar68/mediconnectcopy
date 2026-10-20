import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Register from './Register';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Register page', () => {
  const register = vi.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({ register });
  });

  it('requires a name, email, and password', () => {
    renderRegister();

    fireEvent.submit(screen.getByRole('button', { name: /create account|sign up|register/i }).closest('form'));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than six characters', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), 'Patient One');
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText(/password/i), '12345');

    fireEvent.submit(screen.getByRole('button', { name: /create account|sign up|register/i }).closest('form'));

    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers valid details and routes to OTP verification', async () => {
    const user = userEvent.setup();
    register.mockResolvedValue({ success: true });
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), 'Patient One');
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account|sign up|register/i }));

    expect(register).toHaveBeenCalledWith(
      'Patient One',
      'patient@example.com',
      'secret123',
      'patient',
    );
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
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), 'Patient One');
    await user.type(screen.getByLabelText('Email Address'), email);
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));

    expect(screen.getByText('Please provide a valid email')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only name', () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'patient@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('requires a password when name and email are valid', () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Patient One' } });
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'patient@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));

    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('clears the name validation message when the name is edited', async () => {
    const user = userEvent.setup();
    renderRegister();
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Full Name'), 'Patient One');

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('shows the backend registration error', async () => {
    const user = userEvent.setup();
    register.mockRejectedValue(new Error('This email is already registered'));
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), 'Patient One');
    await user.type(screen.getByLabelText('Email Address'), 'patient@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('This email is already registered')).toBeInTheDocument();
  });

  it.each([
    ['doctor', 'Doctor One', 'doctor.one@example.com'],
    ['admin', 'Admin One', 'admin.one@example.com'],
  ])('submits the selected %s role', async (role, name, email) => {
    const user = userEvent.setup();
    register.mockResolvedValue({ success: true });
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), name);
    await user.type(screen.getByLabelText('Email Address'), email);
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.selectOptions(screen.getByLabelText('User Role'), role);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(register).toHaveBeenCalledWith(name, email, 'secret123', role);
  });

  it('URL-encodes plus signs in the email when navigating to OTP verification', async () => {
    const user = userEvent.setup();
    register.mockResolvedValue({ success: true });
    renderRegister();
    await user.type(screen.getByLabelText('Full Name'), 'Patient One');
    await user.type(screen.getByLabelText('Email Address'), 'patient+care@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByTestId('current-location')).toHaveTextContent(
      '/verify-otp?email=patient%2Bcare%40example.com',
    );
  });
});
