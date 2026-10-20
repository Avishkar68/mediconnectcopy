import React, { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axe from 'axe-core';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Login from '../pages/Login';
import Register from '../pages/Register';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderPage(path, page) {
  return render(
    <main>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={page} />
        </Routes>
      </MemoryRouter>
    </main>,
  );
}

describe('Frontend nonfunctional checks', () => {
  it('has no axe accessibility violations on the login page', async () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    renderPage('/login', <Login />);

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    console.log(`[MEASURE] Login page axe violations: ${results.violations.length}.`);
    expect(results.violations).toEqual([]);
  });

  it('has no axe accessibility violations on the registration page', async () => {
    useAuth.mockReturnValue({ register: vi.fn() });
    renderPage('/register', <Register />);

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    console.log(`[MEASURE] Registration page axe violations: ${results.violations.length}.`);
    expect(results.violations).toEqual([]);
  });

  it('renders the login page within a 500ms React render budget', () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    const renderDurations = [];

    render(
      <main>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route
              path="/login"
              element={
                <Profiler
                  id="login-page"
                  onRender={(_id, _phase, actualDuration) => renderDurations.push(actualDuration)}
                >
                  <Login />
                </Profiler>
              }
            />
          </Routes>
        </MemoryRouter>
      </main>,
    );

    expect(screen.getByRole('heading', { name: 'Welcome to MediConnect' })).toBeInTheDocument();
    expect(renderDurations.length).toBeGreaterThan(0);
    console.log(`[MEASURE] Login React render max: ${Math.max(...renderDurations).toFixed(2)}ms.`);
    expect(Math.max(...renderDurations)).toBeLessThan(500);
  });

  it('renders and updates an enabled button without exceeding the render budget', () => {
    const renderDurations = [];
    const onClick = vi.fn();

    render(
      <Profiler
        id="action-button"
        onRender={(_id, _phase, actualDuration) => renderDurations.push(actualDuration)}
      >
        <Button onClick={onClick}>Continue</Button>
      </Profiler>,
    );

    screen.getByRole('button', { name: 'Continue' }).click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(renderDurations.length).toBeGreaterThan(0);
    console.log(`[MEASURE] Button React render max: ${Math.max(...renderDurations).toFixed(2)}ms.`);
    expect(Math.max(...renderDurations)).toBeLessThan(500);
  });
});
