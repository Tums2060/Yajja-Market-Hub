import React from "react";

type Props = {
  className?: string;
  size?: number;
  alt?: string;
};

export function Logo({ className = "", size = 64, alt = "Yajja" }: Props) {
  return (
    <img
      src="/yajja-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
