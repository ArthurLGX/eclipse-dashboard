'use client';

import { getUserDisplayName, getUserInitials, getProfilePictureUrl, type UserLike } from '@/lib/user-utils';
import { IconUser } from '@tabler/icons-react';

const AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

type UserDisplayProps = {
  user: UserLike | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
};

/** Avatar + nom : affiche profile_picture ou initiales, et username||email */
export function UserDisplay({ user, size = 'md', showName = true, className = '' }: UserDisplayProps) {
  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`rounded-full bg-muted flex items-center justify-center ${getSizeClasses(size).avatar}`}>
          <IconUser className="w-3 h-3 !text-muted" />
        </div>
        {showName && <span className="!text-muted">—</span>}
      </div>
    );
  }

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const pictureUrl = getProfilePictureUrl(user);
  const colorIndex = (user.username || user.firstname || user.email || '').charCodeAt(0) % AVATAR_COLORS.length;
  const { avatar } = getSizeClasses(size);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-full flex items-center justify-center overflow-hidden ${pictureUrl ? '' : AVATAR_COLORS[colorIndex]} ${avatar}`}
        title={displayName}
      >
        {pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pictureUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="!text-white font-medium">{initials}</span>
        )}
      </div>
      {showName && (
        <span className="!text-primary !text-sm font-medium truncate">{displayName}</span>
      )}
    </div>
  );
}

function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: { avatar: 'w-5 h-5 !text-[10px]' },
    md: { avatar: 'w-7 h-7 !text-xs' },
    lg: { avatar: 'w-9 h-9 !text-sm' },
  };
  return sizes[size];
}

/** Avatar seul (pour réutilisation dans des listes compactes) */
export function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: UserLike | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (!user) {
    return (
      <div className={`rounded-full bg-muted flex items-center justify-center ${getSizeClasses(size).avatar} ${className}`}>
        <IconUser className="w-3 h-3 !text-muted" />
      </div>
    );
  }

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const pictureUrl = getProfilePictureUrl(user);
  const colorIndex = (user.username || user.firstname || user.email || '').charCodeAt(0) % AVATAR_COLORS.length;
  const { avatar } = getSizeClasses(size);

  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden ${pictureUrl ? '' : AVATAR_COLORS[colorIndex]} ${avatar} ${className}`}
      title={displayName}
    >
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="!text-white font-medium">{initials}</span>
      )}
    </div>
  );
}

export { getUserDisplayName, getUserInitials, getProfilePictureUrl };
