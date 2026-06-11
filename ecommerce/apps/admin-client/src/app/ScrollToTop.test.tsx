import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ScrollToTop } from './ScrollToTop';

const NavigateOnMount = ({ to }: { to: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to);
  }, [navigate, to]);

  return null;
};

describe('ScrollToTop', () => {
  it('scrolls to the top when the pathname changes', async () => {
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation((() => undefined) as typeof window.scrollTo);

    render(
      <MemoryRouter initialEntries={['/first']}>
        <ScrollToTop />
        <Routes>
          <Route path="/first" element={<NavigateOnMount to="/second" />} />
          <Route path="/second" element={<div>Second route</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledTimes(2);
    });
    expect(scrollToSpy).toHaveBeenNthCalledWith(1, 0, 0);
    expect(scrollToSpy).toHaveBeenNthCalledWith(2, 0, 0);
  });
});
