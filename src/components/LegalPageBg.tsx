/** پس‌زمینهٔ مینیمال هم‌سبک صفحهٔ ورود (بدون ویدیو برای سبکی صفحات حقوقی) */
export default function LegalPageBg() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-soft-light bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1887&auto=format&fit=crop)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMC4zIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')]"
        style={{ backgroundSize: "40px 40px" }}
      />
      <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/25 rounded-full blur-3xl" />
      <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/15 rounded-full blur-3xl" />
    </div>
  );
}
