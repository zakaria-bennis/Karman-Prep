import Image from "next/image";

/** The horizon mark comes from the recovered historical KARMAN logo still. */
export default function LandingLogo() {
  return (
    <span className="inline-flex h-11 items-center gap-2 bg-black px-3 text-white">
      <span className="relative block h-7 w-12 overflow-hidden" aria-hidden="true">
        <Image
          src="/brand/logos/karman-horizon-still.png"
          alt=""
          width={1200}
          height={900}
          className="absolute -left-[30px] -top-[20px] w-[108px] max-w-none"
        />
      </span>
      <span className="font-plex-sans text-sm font-semibold tracking-[0.19em]">KARMAN</span>
    </span>
  );
}
