import {it,expect} from 'vitest';
import {KND_DESCRIPTIONS,describeKND} from '../src/lib/kndDescriptions';
import {claimFromRow} from '../src/v4/imports';
it('catalog contains all 91 supplied KND codes without shortening descriptions',()=>{
  expect(Object.keys(KND_DESCRIPTIONS)).toHaveLength(91);
  expect(describeKND('KND2120')).toBe('Lutetium Lu 177 VIP-PET/PSMA therapy, 100 mCi without anesthesia');
  expect(describeKND('KND2333')).toBe('Iodine I 131 sodium iodide therapy, 15 to 29 mCi with anesthesia');
  expect(describeKND('KND2610')).toBe('Selective internal radiation therapy (SIRT) / Yttrium-90 radioembolization');
  expect(describeKND(' knd0101 ','old')).toBe('Tc-99m-Pertechnetate for nuclear diagnostic (IM)');
  expect(describeKND('KND11')).toBe('Rubidium-82 (Rb-82) - Chloride for nuclear diagnostic (IM)');
  expect(describeKND('OTHER','Original')).toBe('Original');
  expect(Object.entries(KND_DESCRIPTIONS).filter(([code])=>!/^KND2/.test(code))).toHaveLength(56);
  expect(Object.entries(KND_DESCRIPTIONS).filter(([code])=>!/^KND2/.test(code)).every(([,description])=>description.endsWith('(IM)'))).toBe(true);
});
it('replaces short descriptions in imported claims while preserving code and tariff',()=>{
  const cols=Array(94).fill('');cols[4]='1';cols[19]='INA';cols[50]='SYNTHETIC';cols[82]='KND0101';cols[83]='Tc-99m';cols[90]='1250';
  const claim=claimFromRow(cols,'synthetic.txt',1);
  expect(claim.description).toBe('Tc-99m-Pertechnetate for nuclear diagnostic (IM)');expect(claim.code).toBe('KND0101');expect(claim.tariffIDRG).toBe('1250');
});
