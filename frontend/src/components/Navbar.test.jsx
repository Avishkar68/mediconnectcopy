import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import i18n from '../i18n';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
    isAuthenticated: false,
  }),
}));

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

describe('Navbar language selector', () => {
  it('updates visible navigation immediately when a language is selected', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    const languageSelector = screen.getByRole('combobox', { name: 'Language' });
    await user.selectOptions(languageSelector, 'hi');

    expect(screen.getByRole('link', { name: 'लॉग इन' })).toBeInTheDocument();
  });
});
