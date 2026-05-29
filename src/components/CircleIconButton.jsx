import { forwardRef } from "react";

const SIZE_CLASS = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-14 w-14",
};

const VARIANT_CLASS = {
  soft: "bg-[#e8faf4] text-[#00a87a]",
  action: "bg-[#d4f5eb] text-[#00a87a] ring-1 ring-[#b7eb8f]",
  primary: "bg-[#00c896] text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]",
};

export function CircleIconWrap({ children, size = "md", variant = "soft", className = "" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    >
      {children}
    </span>
  );
}

const CircleIconButton = forwardRef(function CircleIconButton(
  { children, size = "md", variant = "action", label, onClick, className = "" },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 active:scale-95 ${className}`}
    >
      <CircleIconWrap size={size} variant={variant}>
        {children}
      </CircleIconWrap>
    </button>
  );
});

export default CircleIconButton;
