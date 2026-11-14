import weights from './inaCbgRelativeWeights.json' with {type:'json'};

const maximumGroups = 10_000;

export function calculateInaCbgTotals(cohorts) {
  if (!Array.isArray(cohorts) || cohorts.length > 1000) throw new Error('Invalid cohort list');
  let groupCount = 0;
  return cohorts.map(cohort => {
    const {care, groups} = cohort ?? {};
    if ((care !== 1 && care !== 2) || !Array.isArray(groups)) throw new Error('Invalid cohort');
    groupCount += groups.length;
    if (groupCount > maximumGroups) throw new Error('Too many groups');
    let mapped = 0, casemix = 0;
    const seen = new Set();
    for (const group of groups) {
      if (!Array.isArray(group) || group.length !== 2) throw new Error('Invalid group');
      const [code,count] = group;
      if (typeof code !== 'string' || !/^[A-Z]-[0-9]-[0-9]{2}-(?:I{1,3}|0)$/.test(code) || seen.has(code)
          || !Number.isSafeInteger(count) || count < 1 || count > 10_000_000) throw new Error('Invalid group');
      seen.add(code);
      const entry = Object.hasOwn(weights,code) ? weights[code] : undefined;
      if (entry?.service !== (care === 1 ? 'RI' : 'RJ') || !Number.isFinite(entry.weight) || entry.weight <= 0) continue;
      mapped += count;
      casemix += count * entry.weight;
    }
    return {mapped,casemix};
  });
}
