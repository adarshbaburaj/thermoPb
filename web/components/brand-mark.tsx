import Image from "next/image";

export default function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/branding/thermopb-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className="brand-image"
    />
  );
}
