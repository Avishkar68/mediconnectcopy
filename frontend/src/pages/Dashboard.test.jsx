import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import i18n from '../i18n';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'patient', name: 'Test Patient' } }),
}));

vi.mock('../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

describe('patient dashboard sidebar translations', () => {
  it('updates sidebar headings and links when the language changes', async () => {
    render(createElement(MemoryRouter, null, createElement(Dashboard)));

    expect(await screen.findByText('Everyday Health')).toBeInTheDocument();
    expect(screen.getByText('Home Dashboard')).toBeInTheDocument();

    await i18n.changeLanguage('hi');

    await waitFor(() => {
      expect(screen.getByText('रोज़मर्रा का स्वास्थ्य')).toBeInTheDocument();
      expect(screen.getByText('होम डैशबोर्ड')).toBeInTheDocument();
      expect(screen.getByText('आपातकालीन QR स्वास्थ्य कार्ड')).toBeInTheDocument();
    });
  });
});
