import { UserCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface ProfileDropdownProps {
  user: {
    name?: string | null;
    email?: string | null;
    avatar?: {
      url?: string | null;
      alt?: string | null;
    } | null;
  };
}

export const ProfileDropdown = ({ user }: ProfileDropdownProps): JSX.Element => {
  const location = useLocation();
  const displayName = user.name?.trim() || 'Salani';
  const profileLabel = displayName.split(/\s+/)[0] ?? 'Salani';
  const isActive = location.pathname === '/dashboard' || location.pathname === '/dashboard/' || location.pathname.startsWith('/dashboard/profile');

  return (
    <Link
      to="/dashboard/profile"
      className={`inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-1.5 text-[0.92rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/16 hover:bg-white/[0.075] sm:h-10 sm:min-w-[6.5rem] sm:gap-2 sm:px-3.5 sm:text-sm ${
        isActive
          ? 'border-white/18 border-gold/35 bg-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(212,175,55,0.14))] shadow-[0_14px_34px_rgba(212,175,55,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : ''
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border sm:h-7 sm:w-7 ${
          isActive ? 'border-gold/30 bg-gold/15 text-gold-light' : 'border-white/10 bg-white/[0.08] text-gold'
        }`}
      >
        {user.avatar?.url ? (
          <img
            src={user.avatar.url}
            alt={user.avatar.alt ?? displayName}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            width={28}
            height={28}
          />
        ) : (
          <UserCircle2 className="h-4 w-4" />
        )}
      </span>
      <span className="sr-only sm:not-sr-only sm:max-w-[5.75rem] sm:truncate">{profileLabel}</span>
    </Link>
  );
};
