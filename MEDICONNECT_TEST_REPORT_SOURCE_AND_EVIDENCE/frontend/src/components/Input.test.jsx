import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input component', () => {
  it.each(['text', 'email', 'password', 'number', 'tel'])(
    'renders an input with type %s',
    (type) => {
      render(<Input label="Test field" type={type} />);

      expect(screen.getByLabelText('Test field')).toHaveAttribute('type', type);
    },
  );

  it('associates a provided id with its visible label', () => {
    render(<Input id="custom-field" label="Custom field" />);

    expect(screen.getByLabelText('Custom field')).toHaveAttribute('id', 'custom-field');
  });

  it('shows the validation error and error border style', () => {
    render(<Input label="Email" error="Email is required" />);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveClass('border-red-500/80');
  });

  it('forwards placeholder, value, and change events', () => {
    const onChange = vi.fn();
    render(
      <Input
        label="Email"
        placeholder="name@example.com"
        value="patient@example.com"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('placeholder', 'name@example.com');
    expect(input).toHaveValue('patient@example.com');
    fireEvent.change(input, { target: { value: 'new@example.com' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
