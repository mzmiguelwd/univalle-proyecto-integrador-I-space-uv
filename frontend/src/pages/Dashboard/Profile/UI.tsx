import { type UpdateUserProfileData } from "../../../config/auth.ts";

// TYPES

interface ProfileInputProps {
  label: string;
  name: keyof UpdateUserProfileData;
  id: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  error?: string;
  type?: string;
}

// COMPONENTS

export const ProfileInput = ({
  label,
  name,
  id,
  value,
  onChange,
  error,
  type = "text",
}: ProfileInputProps) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="block text-xs font-semibold text-sky-300 cursor-pointer"
    >
      {label}
    </label>
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300"
    />
    {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
  </div>
);

export const InfoTile = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-md bg-[#181818] p-4 border border-white/5">
    <p className="text-xs text-sky-300 font-medium">{label}</p>
    <p className="mt-1 text-sm text-zinc-200 truncate" title={value}>
      {value}
    </p>
  </div>
);
