const protectedFigurePath =
  /^\/admin\/questions\/student-view\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/figure\/[0-9a-f]{64}\?payload_sha256=[0-9a-f]{64}$/;

/** Only the canonical local, sealed private-figure route receives session cookies. */
export function figureFetchPolicy(src: string, origin: string) {
  const localPath = src.startsWith(`${origin}/`) ? src.slice(origin.length) : src;
  const protectedFigure = protectedFigurePath.test(localPath);
  return {
    inlineSvg: protectedFigure || /\.svg(?:[?#]|$)/i.test(src),
    credentials: protectedFigure ? ("same-origin" as const) : ("omit" as const),
  };
}
