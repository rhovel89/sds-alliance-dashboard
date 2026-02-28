type AnyObj = Record<string, any>;

// Eager-load all translation.json files under ./locales/<lng>/translation.json
const modules = import.meta.glob("./locales/*/translation.json", { eager: true }) as Record<string, any>;

export function buildResources(): AnyObj {
  const res: AnyObj = {};
  for (const [path, mod] of Object.entries(modules)) {
    const m = path.match(/\.\/locales\/([^/]+)\/translation\.json$/);
    if (!m) continue;
    const lng = m[1];
    const data = (mod && (mod.default || mod)) as AnyObj;
    res[lng] = { translation: data };
  }
  return res;
}
