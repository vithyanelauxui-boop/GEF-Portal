import PhoneInputWithCountry from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface PhoneNumberInputProps {
  value: string;
  onChange: (phone: string) => void;
  placeholder?: string;
  defaultCountry?: "IN" | "US" | "GB" | "AE" | "CA" | "AU" | string;
  className?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  defaultCountry = "IN",
  className,
}: PhoneNumberInputProps) {
  return (
    <div className={cn("phone-input-wrapper", className)}>
      <PhoneInputWithCountry
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry as any}
        value={value as any}
        onChange={(val) => onChange(val || "")}
        placeholder={placeholder}
        withCountryCallingCode
      />
    </div>
  );
}
