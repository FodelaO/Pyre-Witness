/** Shared wordmark for the twin and its evidence page. */
import Image from "next/image";

export function BrandMark() {
  return (
    <span className="pw-brand">
      <Image src="/brand/mark.png" alt="" width={30} height={30} loading="eager" unoptimized />
      <span>Pyre Witness</span>
    </span>
  );
}
