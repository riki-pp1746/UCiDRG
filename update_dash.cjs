const fs = require('fs');

let r = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

if (!r.includes('import React, { useMemo }')) {
  r = r.replace(/import \{.*?\} from 'react';/, \"import React, { useMemo } from 'react';\");
  if (!r.includes('useMemo')) {
      r = r.replace(/import (.*?) from 'react';/, \"import React, { useMemo } from 'react';\");
  }
}

const beforePie =   // Pie chart data for DRG status
  const pieData = [
    { name: 'Untung', value: summary.jumlahDRGUntung, color: COLORS.UNTUNG },
    { name: 'Impas', value: summary.jumlahDRGImpas, color: COLORS.IMPAS },
    { name: 'Rugi', value: summary.jumlahDRGRugi, color: COLORS.RUGI },
  ].filter(d => d.value > 0);

  // Top DRG for bar chart (top 10 by kasus)
  const top10DRG = drgResults.slice(0, 10).map(d => ({
    name: d.group_code,
    label: d.group_description.slice(0, 30) + '...',
    'Unit Cost RS': Math.round(d.rataUnitCost / 1000),
    'Tarif INA-CBG': Math.round(d.rataINACBG / 1000),
    status: d.statusINACBG,
  }));;

const afterPie =   // Pie chart data for DRG status
  const pieData = useMemo(() => [
    { name: 'Untung', value: summary.jumlahDRGUntung, color: COLORS.UNTUNG },
    { name: 'Impas', value: summary.jumlahDRGImpas, color: COLORS.IMPAS },
    { name: 'Rugi', value: summary.jumlahDRGRugi, color: COLORS.RUGI },
  ].filter(d => d.value > 0), [summary.jumlahDRGUntung, summary.jumlahDRGImpas, summary.jumlahDRGRugi]);

  // Top DRG for bar chart (top 10 by kasus)
  const top10DRG = useMemo(() => drgResults.slice(0, 10).map(d => ({
    name: d.group_code,
    label: d.group_description.slice(0, 30) + '...',
    'Unit Cost RS': Math.round(d.rataUnitCost / 1000),
    'Tarif INA-CBG': Math.round(d.rataINACBG / 1000),
    status: d.statusINACBG,
  })), [drgResults]);;

r = r.replace(beforePie, afterPie);

fs.writeFileSync('src/pages/DashboardPage.tsx', r);
