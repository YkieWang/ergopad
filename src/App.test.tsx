import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Two.js to avoid canvas errors in jsdom
vi.mock('twojs-ts', () => {
  return {
    default: class {
      constructor() {
        return {
          appendTo: vi.fn(),
          makeCircle: vi.fn(() => ({ linewidth: 0, fill: '', opacity: 0 })),
          makeLine: vi.fn(() => ({ stroke: '', opacity: 0 })),
          makeRectangle: vi.fn(() => ({ stroke: '', linewidth: 0, fill: '' })),
          makeGroup: vi.fn(() => ({
            translation: { set: vi.fn() },
            rotation: 0,
          })),
          update: vi.fn(),
          clear: vi.fn(),
        };
      }
    },
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('<App>', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders without crashing and shows initial UI', async () => {
    render(<App storedPpm={{ _tag: 'None' }} />); // Pass None for Option<number>

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading')).toBeNull();
    });

    // Check for "Reset column" button
    expect(screen.getByText(/Reset column/i)).toBeTruthy();

    // Check for "Reset all" button
    expect(screen.getByText(/Reset all/i)).toBeTruthy();

    // Check for "Tune scale" button
    expect(screen.getByText(/Tune scale/i)).toBeTruthy();

    // Check for "Aux lines" checkbox label
    expect(screen.getByText(/Aux lines/i)).toBeTruthy();

    // Check if the canvas container exists
    // The component renders a div with className="boo" inside a div with className="touchytouchy"
    // We can query by class name or verify structure implicitly
    // Since testing-library prefers accessible queries, we'll look for buttons first (done above)
  });
});
