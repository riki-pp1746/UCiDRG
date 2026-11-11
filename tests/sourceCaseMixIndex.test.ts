import {it,expect} from 'vitest';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import SourceCaseMixIndex from '../src/components/costing/SourceCaseMixIndex';
import {MemoryRouter} from 'react-router-dom';
import {inpatientCmiStudyRows} from '../src/lib/analysisFormulas';
import {compareCw} from '../src/lib/calculations/cwCompare';
const render=(element:ReturnType<typeof createElement>)=>renderToStaticMarkup(createElement(MemoryRouter,null,element));
const stats=(average:number,count:number)=>({average,count,min:average,max:average});
it('shows original TXT weights as CMI and explains the separate local cost index',()=>{
 const html=render(createElement(SourceCaseMixIndex,{rows:[{care:1,cases:804,local:stats(1.05,803),source:stats(.917372,803),sourceBaseCount:0},{care:2,cases:9516,local:stats(.98,9513),source:stats(1.255304,9513),sourceBaseCount:0}]}));
 expect(html).toContain('CMI iDRG');expect(html).toContain('0,92');expect(html).toContain('1,26');expect(html).toContain('803 dari 804');
 expect(html).toContain('CMI lokal');expect(html).toContain('1,05');expect(html).toContain('0,98');
 expect(html.indexOf('CMI iDRG')).toBeLessThan(html.indexOf('CMI lokal'));expect(html).not.toContain('RS lebih tinggi');expect(html).not.toContain('RS lebih rendah');
});
it('does not substitute RS CW for unavailable TXT CW nor fabricate a zero',()=>{
 const html=render(createElement(SourceCaseMixIndex,{rows:[{care:1,cases:10,local:stats(1,10),source:null,sourceBaseCount:0}]}));expect(html).toContain('Tidak tersedia');expect(html).not.toContain('0,00');
});
it('keeps the study comparison specific to class, region, and year',()=>{
 expect(inpatientCmiStudyRows('C',2020)[0]).toEqual({region:1,government:0.944,private:0.974});
 expect(inpatientCmiStudyRows('D',2020)[0]).toEqual({region:1,government:0.794,private:0.912});
 expect(inpatientCmiStudyRows('C',2019)[0]).toEqual({region:1,government:0.955,private:1.019});
 expect(inpatientCmiStudyRows('A',2020)[1].private).toBeNull();
});
it('computes CW as average cost of one DRG / weighted average of all DRG (example 4.849.719 / 10.649.483 = 0,46)',()=>{
 expect((4849719/10649483).toFixed(2)).toBe('0.46');
 const cases=[10,30],avg=[100,300],all=cases.reduce((a,c,i)=>a+c*avg[i],0)/40;expect(all).toBe(250);expect(avg[0]/all).toBeCloseTo(.4);
});
it('compares RS against TXT with a tolerance and never invents a missing reference',()=>{
 expect(compareCw(1.02,1).status).toBe('sepadan');expect(compareCw(1.2,1).status).toBe('lebih-tinggi');expect(compareCw(.7,1).status).toBe('lebih-rendah');
 expect(compareCw(1,null).status).toBe('tidak-tersedia');expect(compareCw(1,0).percent).toBeNull();
});
