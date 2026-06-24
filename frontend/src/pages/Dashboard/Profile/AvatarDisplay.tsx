import { type UserProfile } from "../../../config/auth.ts";
import { AVATARS } from "./constants.ts";

// TYPES

interface AvatarDisplayProps {
  profile: UserProfile | null;
  size?: "sm" | "md" | "lg";
  initials: string;
}

// MAIN COMPONENT

export const AvatarDisplay = ({
  profile,
  size = "md",
  initials,
}: AvatarDisplayProps) => {
  const sizeClass = {
    sm: "h-11 w-11 text-sm",
    md: "h-16 w-16 text-2xl",
    lg: "h-24 w-24 text-3xl",
  }[size];

  if (profile?.avatarType === "google" && profile?.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={`Avatar de ${profile.name}`}
        className={`${sizeClass} rounded-lg object-cover`}
      />
    );
  }

  if (profile?.avatarType === "emoji" && profile?.avatar) {
    const found = AVATARS.find((avatar) => avatar.id === profile.avatar);

    if (found) {
      const emojiSizeMap: Record<string, string> = {
        lg: "text-4xl",
        md: "text-3xl",
        sm: "text-xl",
      };

      const emojiSizeClass = emojiSizeMap[size] || "text-xl";

      return (
        <div
          className={`${sizeClass} flex items-center justify-center rounded-lg border border-white/10 bg-[#1a1d24]`}
        >
          <span className={emojiSizeClass}>{found.emoji}</span>
        </div>
      );
    }
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-lg bg-sky-300 font-bold text-zinc-950 select-none`}
    >
      {initials}
    </div>
  );
};
