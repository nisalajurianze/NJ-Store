import favicon from '../../../public/favicon.svg';

export const LogoLoader = ({ fullHeight = false }: { fullHeight?: boolean }): JSX.Element => (
  <div className={`flex w-full items-center justify-center ${fullHeight ? 'min-h-[calc(100svh)] bg-[#07111f]' : 'min-h-[400px] py-12'}`}>
    <img
      src={favicon}
      alt="Loading..."
      className="h-20 w-20 animate-logo-pulse"
    />
  </div>
);
