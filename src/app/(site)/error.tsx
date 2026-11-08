"use client";

// A marketing page that failed to draw: the site's frame stays, with one sentence, a way to try again and
// the way home. Nothing about the failure itself is shown to the visitor.
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import SitePage from "@/components/site/SitePage";
import { TextLink } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { SITE } from "@/lib/marketing/site-copy";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error("[site] page failed:", error.digest ?? error.message);
  }, [error]);
  return (
    <SitePage kind="inner">
      <section className="i-hero i-faqhero i-lost" data-light>
        <div className="in">
          <div className="i-words">
            <h1>{SITE["error title"]}</h1>
            <p className="lede">{SITE["error text"]}</p>
            <div className="i-more i-lostlinks">
              <button
                type="button"
                className="lk"
                onClick={() =>
                  startTransition(() => {
                    router.refresh();
                    reset();
                  })
                }
              >
                {SITE["error retry"]}
              </button>
              <TextLink label={SITE["not found home"]} href={ROUTES.home} />
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
