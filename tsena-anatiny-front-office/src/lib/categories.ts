export function categoryEmoji(name?: string): string {
  if (!name) return "🛒";
  const n = name.toLowerCase();
  if (/l[ée]gume|fruit|mara/.test(n)) return "🥬";
  if (/riz/.test(n)) return "🍚";
  if (/viande|poulet|volaille/.test(n)) return "🥩";
  if (/poisson|crevette|fruit de mer/.test(n)) return "🐟";
  if (/lait|fromage|produit laitier/.test(n)) return "🥛";
  if (/boisson|jus|soda|eau/.test(n)) return "🧃";
  if (/c[éè]r[éè]ale|farine|bl[ée]/.test(n)) return "🌾";
  if (/[éè]pice|poivre|sel/.test(n)) return "🌶️";
  if (/huile/.test(n)) return "🌻";
  if (/sucre|chocolat|bonbon/.test(n)) return "🍬";
  if (/oeuf|œuf/.test(n)) return "🥚";
  if (/pain|boulangerie/.test(n)) return "🥖";
  if (/caf[éè]|th[éè]/.test(n)) return "☕";
  if (/bio|miel|sant/.test(n)) return "🌱";
  // Nouveau catalogue (non alimentaire)
  if (/chaussure/.test(n)) return n.includes("femme") ? "👠" : "👟";
  if (/v[êe]tement|t[- ]?shirt|chemise|pantalon/.test(n)) return "👕";
  if (/voiture|auto/.test(n)) return "🚗";
  if (/lamp/.test(n)) return "💡";
  if (/housse|coque|t[ée]l[ée]phone|smartphone/.test(n)) return "📱";
  if (/c[âa]ble|chargeur|charge/.test(n)) return "🔌";
  if (/lecteur.?carte/.test(n)) return "💳";
  if (/porte.?carte|portefeuille|porte.?monnaie/.test(n)) return "👛";
  return "🛒";
}

export function categoryGradient(name?: string): string {
  const n = (name ?? "").toLowerCase();
  if (/l[ée]gume|fruit|mara/.test(n)) return "from-emerald-100 to-lime-200";
  if (/riz/.test(n)) return "from-amber-100 to-yellow-200";
  if (/viande|poulet|volaille/.test(n)) return "from-rose-100 to-red-200";
  if (/poisson|crevette|fruit de mer/.test(n)) return "from-sky-100 to-cyan-200";
  if (/lait|fromage|produit laitier/.test(n)) return "from-violet-100 to-purple-200";
  if (/boisson|jus|soda|eau/.test(n)) return "from-blue-100 to-indigo-200";
  if (/c[éè]r[éè]ale|farine|bl[ée]/.test(n)) return "from-yellow-100 to-amber-200";
  if (/[éè]pice|poivre|sel/.test(n)) return "from-red-100 to-orange-200";
  if (/huile/.test(n)) return "from-lime-100 to-emerald-200";
  if (/sucre|chocolat|bonbon/.test(n)) return "from-pink-100 to-rose-200";
  if (/oeuf|œuf/.test(n)) return "from-orange-100 to-yellow-200";
  if (/pain|boulangerie/.test(n)) return "from-amber-100 to-orange-200";
  if (/caf[éè]|th[éè]/.test(n)) return "from-stone-200 to-amber-200";
  if (/bio|miel|sant/.test(n)) return "from-emerald-100 to-green-200";
  // Nouveau catalogue (non alimentaire)
  if (/chaussure/.test(n))
    return n.includes("femme")
      ? "from-pink-100 to-rose-200"
      : "from-indigo-100 to-blue-200";
  if (/v[êe]tement|t[- ]?shirt|chemise|pantalon/.test(n))
    return "from-sky-100 to-cyan-200";
  if (/voiture|auto|lamp/.test(n)) return "from-slate-200 to-zinc-300";
  if (/housse|coque|t[ée]l[ée]phone|smartphone/.test(n))
    return "from-teal-100 to-emerald-200";
  if (/c[âa]ble|chargeur|charge/.test(n)) return "from-violet-100 to-purple-200";
  if (/lecteur.?carte/.test(n)) return "from-gray-100 to-zinc-200";
  if (/porte.?carte|portefeuille|porte.?monnaie/.test(n))
    return "from-orange-100 to-amber-200";
  return "from-brand-soft to-emerald-100";
}
