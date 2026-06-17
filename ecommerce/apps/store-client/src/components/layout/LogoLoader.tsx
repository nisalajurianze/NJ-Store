export const LogoLoader = ({ fullHeight = false }: { fullHeight?: boolean }): JSX.Element => (
  <div className={`flex w-full items-center justify-center ${fullHeight ? 'min-h-[calc(100svh)] bg-[#07111f]' : 'min-h-[400px] py-12'}`}>
    <img
      src="/favicon.svg"
      alt="Loading..."
      className="h-20 w-20 animate-[logo-pulse_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite] drop-shadow-[0_0_16px_rgba(212,175,55,0.3)]"
    />
  </div>
);
