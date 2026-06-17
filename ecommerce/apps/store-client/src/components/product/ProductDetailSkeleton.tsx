import { LogoLoader } from '../layout/LogoLoader';

export const ProductDetailSkeleton = (): JSX.Element => (
  <div className="page-shell page-nav-gap pb-0" aria-busy="true">
    <LogoLoader fullHeight />
  </div>
);
