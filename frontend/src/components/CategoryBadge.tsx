const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-500/20 text-orange-300',
  Rent: 'bg-blue-500/20 text-blue-300',
  Utilities: 'bg-yellow-500/20 text-yellow-300',
  Salary: 'bg-emerald-500/20 text-emerald-300',
  Equipment: 'bg-cyan-500/20 text-cyan-300',
  Marketing: 'bg-pink-500/20 text-pink-300',
  Transport: 'bg-purple-500/20 text-purple-300',
  Finance: 'bg-indigo-500/20 text-indigo-300',
  Other: 'bg-slate-600/40 text-slate-300',
  Income: 'bg-emerald-500/20 text-emerald-300',
}

export default function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {category}
    </span>
  )
}
