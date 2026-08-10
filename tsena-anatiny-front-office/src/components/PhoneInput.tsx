import { formatPhoneMadagascar } from "../lib/utils";

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = "+261 34 12 345 67",
  autoComplete = "tel"
}: PhoneInputProps) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(formatPhoneMadagascar(e.target.value))}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
    />
  );
}
