export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <span className="font-body text-[11px] font-medium uppercase tracking-[1.4px] text-[#6b7280]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-display text-[24px] font-bold uppercase leading-none tracking-[1px] text-[#11191f] md:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl font-body text-[13px] text-[#6b7280]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
