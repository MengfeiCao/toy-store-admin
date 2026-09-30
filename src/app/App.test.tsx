import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders_toy_store_title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '玩具销售后台' })).toBeInTheDocument();
  });
});
