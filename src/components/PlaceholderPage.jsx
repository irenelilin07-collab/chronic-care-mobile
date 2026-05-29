export default function PlaceholderPage({ title, phase, description }) {
  return (
    <section className="app-card p-5">
      <div className="mb-3 inline-block rounded-full bg-[#e8faf4] px-3 py-1 text-xs font-medium text-[#00a87a]">
        {phase}
      </div>
      <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[#666]">{description}</p>
    </section>
  );
}
