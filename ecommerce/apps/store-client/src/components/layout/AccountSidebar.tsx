import { cn } from '@njstore/utils/cn';
import { LogOut } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountNavItems, getAccountTabFromPath, type AccountTabKey } from './accountPanelConfig';

interface AccountSidebarProps {
  activeTab?: AccountTabKey;
  onTabChange?: (tab: AccountTabKey) => void;
  onNavigate?: () => void;
  className?: string;
}

export const AccountSidebar = ({ activeTab, onTabChange, onNavigate, className }: AccountSidebarProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const { logout } = useAuth();
  const resolvedActiveTab = activeTab ?? getAccountTabFromPath(location.pathname);

  const handleLogout = (): void => {
    onNavigate?.();
    void logout();
  };

  return (
    <aside className={cn('glass-card rounded-[24px] p-3.5 sm:rounded-[26px] sm:p-5 lg:h-full', className)}>
      <div className="border-b border-white/10 px-1 pb-4">
        <p className="text-[9px] uppercase tracking-[0.32em] text-gold sm:text-[10px]">Account Panel</p>
        <h2 className="mt-2.5 text-[1.36rem] font-semibold leading-tight text-white sm:mt-3 sm:text-[1.65rem]">Manage your NJ Store account.</h2>
        <p className="mt-2 text-[12px] leading-5 text-gray-400 sm:text-[13px] sm:leading-6">Move between orders, profile details, loyalty, and saved lists without losing your place.</p>
      </div>

      <nav className="mt-3.5 flex flex-col gap-1.5 sm:mt-4">
        {accountNavItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.key}
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.2, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
            >
              {onTabChange ? (
                <button
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={`group flex w-full items-center gap-2.5 rounded-[16px] px-3 py-2.5 text-left text-[13px] font-medium transition-[background-color,color,transform,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 sm:rounded-[18px] sm:px-3.5 sm:text-sm ${
                    resolvedActiveTab === item.key
                      ? 'border border-gold/20 bg-gold/15 text-gold shadow-[0_12px_26px_rgba(212,175,55,0.08)]'
                      : 'border border-transparent text-gray-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => onNavigate?.()}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-[16px] px-3 py-2.5 text-[13px] font-medium transition-[background-color,color,transform,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 sm:rounded-[18px] sm:px-3.5 sm:text-sm ${
                      isActive
                        ? 'border border-gold/20 bg-gold/15 text-gold shadow-[0_12px_26px_rgba(212,175,55,0.08)]'
                        : 'border border-transparent text-gray-300 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )}
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="account-logout-button group flex w-full items-center gap-2.5 rounded-[16px] border border-transparent px-3 py-2.5 text-left text-[13px] font-semibold transition-[background-color,color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 sm:rounded-[18px] sm:px-3.5 sm:text-sm"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
