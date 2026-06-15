// Shared presentational shell for the static legal pages (/terms, /privacy).
// Pure server component — no interactivity. Content is passed in as data so a
// single typographic treatment serves every legal page. Lives under (customer)
// so it inherits the sticky white ShopHeader + desktop-only ShopFooter.
//
// Props:
//   title       — page heading (e.g. "Terms & Conditions")
//   lastUpdated — human date string shown under the title
//   intro       — array of intro paragraphs (above the numbered sections)
//   sections    — [{ heading, paragraphs?: string[], bullets?: string[] }]
//   placeholder — when true, shows a muted "sample content" disclaimer

const condensed = { fontStretch: "75%" };

export default function LegalPage({
  title,
  lastUpdated,
  intro = [],
  sections = [],
  placeholder = false,
}) {
  return (
    <main className="w-full bg-white">
      <div className="mx-auto w-full max-w-[720px] px-4 pt-8 pb-16 sm:px-6 md:pt-14 md:pb-24">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-[#e5e7eb] pb-6 md:pb-8">
          <h1 className="font-display text-[24px] font-bold leading-tight text-[#11191f] md:text-[34px]">
            {title}
          </h1>
          {lastUpdated ? (
            <p
              className="font-body text-[12px] leading-normal text-[rgba(17,25,31,0.5)] md:text-[14px]"
              style={condensed}
            >
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </div>

        {placeholder ? (
          <p
            className="mt-6 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 font-body text-[12px] leading-relaxed text-[#92400e] md:text-[13px]"
            style={condensed}
          >
            This is sample placeholder content for demonstration purposes only.
            It is not legal advice and should be replaced with the store&apos;s
            actual policy before launch.
          </p>
        ) : null}

        {/* Intro */}
        {intro.length > 0 ? (
          <div className="mt-6 flex flex-col gap-4 md:mt-8">
            {intro.map((p, i) => (
              <p
                key={i}
                className="font-body text-[14px] leading-7 text-[rgba(17,25,31,0.7)] md:text-[15px]"
                style={condensed}
              >
                {p}
              </p>
            ))}
          </div>
        ) : null}

        {/* Numbered sections */}
        <div className="mt-8 flex flex-col gap-8 md:mt-10 md:gap-10">
          {sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-3">
              <h2 className="font-display text-[16px] font-bold leading-6 text-[#11191f] md:text-[20px]">
                {i + 1}. {section.heading}
              </h2>
              {(section.paragraphs || []).map((p, j) => (
                <p
                  key={j}
                  className="font-body text-[14px] leading-7 text-[rgba(17,25,31,0.7)] md:text-[15px]"
                  style={condensed}
                >
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="flex flex-col gap-2 pl-1">
                  {section.bullets.map((b, k) => (
                    <li
                      key={k}
                      className="flex gap-2 font-body text-[14px] leading-7 text-[rgba(17,25,31,0.7)] md:text-[15px]"
                      style={condensed}
                    >
                      <span aria-hidden="true" className="text-[#11191f]">
                        &bull;
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {/* Footer contact line */}
        <div className="mt-12 border-t border-[#e5e7eb] pt-6">
          <p
            className="font-body text-[13px] leading-6 text-[rgba(17,25,31,0.6)]"
            style={condensed}
          >
            Questions about this page? Reach our team via the{" "}
            <a href="/contact" className="font-bold text-[#11191f] underline">
              Contact Us
            </a>{" "}
            page.
          </p>
        </div>
      </div>
    </main>
  );
}
