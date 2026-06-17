

export const PageLoader = (): JSX.Element => (
  <div className="flex min-h-[calc(100svh)] items-center justify-center bg-[#07111f]">
    <img
      src="/favicon.svg"
      alt="Loading..."
      className="h-20 w-20 animate-[logo-pulse_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite] drop-shadow-[0_0_16px_rgba(212,175,55,0.3)]"
    />
  </div>
);
