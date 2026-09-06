export function LogoMark({ className = "h-14 w-14" }) {
  return (
    <img
      src="/icon.png"
      alt="AssessIQ icon"
      className={className}
      draggable={false}
    />
  );
}

export function FullLogo({ className = "" }) {
  return (
    <img
      src="/assessIQ%20logo.jpg"
      alt="AssessIQ Interview Intelligence"
      className={`h-28 w-auto mix-blend-multiply ${className}`}
      draggable={false}
    />
  );
}
