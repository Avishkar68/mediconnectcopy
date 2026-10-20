import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button component', () => {
  it.each([
    ['primary', 'from-brand-600'],
    ['secondary', 'glass-card'],
    ['danger', 'from-red-600'],
  ])('renders the %s variant styles', (variant, expectedClass) => {
    render(<Button variant={variant}>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass(expectedClass);
  });

  it('disables the button when disabled is true', () => {
    render(<Button disabled>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('shows a loading indicator and disables the button while loading', () => {
    render(<Button loading>Continue</Button>);

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('appends a caller-provided class name', () => {
    render(<Button className="w-full">Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass('w-full');
  });

  it('forwards button type and click handlers', () => {
    const onClick = vi.fn();
    render(<Button type="submit" onClick={onClick}>Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('type', 'submit');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps enabled buttons interactive', () => {
    render(<Button>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
