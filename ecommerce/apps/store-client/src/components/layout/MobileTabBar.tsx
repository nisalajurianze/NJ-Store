import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, Info, Mail, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { warmStoreRoute } from '../../app/routeWarmup';

export const MobileTabBar = (): JSX.Element => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const totalItems = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? cart?.itemCount ?? 0;
  const accountRoute = user != null ? '/dashboard' : '/auth/login';
  const accountWarmupRoute = user != null ? 'dashboard' : 'auth-login';

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors sm:text-[10px] ${
      isActive ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
    }`;

  const isAccountMenuActive =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/about' ||
    location.pathname === '/contact';
  const accountButtonClassName = `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors sm:text-[10px] ${
    accountMenuOpen || isAccountMenuActive ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
  }`;

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="mobile-tabbar-surface fixed inset-x-0 bottom-0 z-40 flex h-[calc(3rem+env(safe-area-inset-bottom))] border-t border-white/5 bg-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden">
      {accountMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 -z-10 cursor-default bg-transparent"
            aria-label="Close account navigation"
            onClick={() => setAccountMenuOpen(false)}
          />
          <div className="mobile-more-menu absolute bottom-[calc(100%+0.65rem)] right-3 w-[min(13.5rem,calc(100vw-1.5rem))] rounded-[1.25rem] border border-white/10 bg-[rgba(9,15,27,0.98)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
            <Link
              to={accountRoute}
              className="mobile-more-menu-link"
              onPointerDown={() => warmStoreRoute(accountWarmupRoute)}
              onFocus={() => warmStoreRoute(accountWarmupRoute)}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>{user != null ? 'Account' : 'Login'}</span>
            </Link>
            <Link
              to="/about"
              className="mobile-more-menu-link"
              onPointerDown={() => warmStoreRoute('about')}
              onFocus={() => warmStoreRoute('about')}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              <span>About</span>
            </Link>
            <Link
              to="/contact"
              className="mobile-more-menu-link"
              onPointerDown={() => warmStoreRoute('contact')}
              onFocus={() => warmStoreRoute('contact')}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>Contact</span>
            </Link>
          </div>
        </>
      ) : null}
      <NavLink to="/" className={getNavClass} end>
        <Home className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
        <span className="max-w-full truncate px-1">Home</span>
      </NavLink>
      
      <NavLink
        to="/shop"
        className={getNavClass}
        onPointerDown={() => warmStoreRoute('shop')}
        onFocus={() => warmStoreRoute('shop')}
      >
        <Search className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
        <span className="max-w-full truncate px-1">Shop</span>
      </NavLink>
      
      <NavLink
        to="/cart"
        className={getNavClass}
        onPointerDown={() => warmStoreRoute('cart')}
        onFocus={() => warmStoreRoute('cart')}
      >
        <div className="relative">
          <ShoppingBag className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
          {totalItems > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-1 text-[8px] font-bold leading-none text-dark">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </div>
        <span className="max-w-full truncate px-1">Cart</span>
      </NavLink>
      
      <button
        type="button"
        className={accountButtonClassName}
        aria-label="Account navigation"
        aria-expanded={accountMenuOpen}
        aria-haspopup="menu"
        onClick={() => setAccountMenuOpen((current) => !current)}
        onPointerDown={() => {
          warmStoreRoute(accountWarmupRoute);
          warmStoreRoute('about');
          warmStoreRoute('contact');
        }}
      >
        <User className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
        <span className="max-w-full truncate px-1">{user != null ? 'Account' : 'Login'}</span>
      </button>
    </div>
  );
};
