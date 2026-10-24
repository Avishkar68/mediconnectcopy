import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { createElement } from 'react';
import i18n, { supportedLanguages } from './index';

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

const StaticLocalizedChild = () => createElement('p', null, i18n.t('Dashboard'));

const LanguageSubscribedParent = () => {
  useTranslation();
  return createElement(StaticLocalizedChild);
};

describe('application language support', () => {
  it('switches languages, persists the selection, and falls back to English keys', async () => {
    await i18n.changeLanguage('hi');

    expect(i18n.t('Dashboard')).toBe('डैशबोर्ड');
    expect(window.localStorage.getItem('mediconnect-language')).toBe('hi');
    expect(i18n.t('A phrase without a translation')).toBe('A phrase without a translation');

    await i18n.changeLanguage('en');
    expect(i18n.t('Dashboard')).toBe('Dashboard');
  });

  it('exposes all advertised language options', () => {
    expect(supportedLanguages.map(({ code }) => code)).toEqual([
      'en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'pa', 'ml',
    ]);
  });

  it('re-renders static localized page content without a refresh', async () => {
    render(createElement(LanguageSubscribedParent));
    await i18n.changeLanguage('mr');

    expect(screen.getByText('डॅशबोर्ड')).toBeInTheDocument();
  });
});
