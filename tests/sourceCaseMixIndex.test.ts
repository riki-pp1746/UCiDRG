import {it,expect} from 'vitest';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import SourceCaseMixIndex from '../src/components/costing/SourceCaseMixIndex';
import {MemoryRouter} from 'react-router-dom';
import {inpatientCmiStudyRows} from '../src/lib/analysisFormulas';
const render=(element:ReturnType<typeof createElement>)=>renderToStaticMarkup(createElement(MemoryRouter,null,element));
it('shows original source CMI separately by care rather than the normalized local mean of one',()=>{
 const stats=(average:number,count:number)=>({average,count,min:average,max:average});
 const html=render(createElement(SourceCaseMixIndex,{rows:[{care:1,cases:804,local:stats(1,803),source:stats(.917372,803),sourceBaseCount:0},{care:2,cases:9516,local:stats(1,9513),source:stats(1.255304,9513),sourceBaseCount:0}]}));
 expect(html).toContain('0,92');expect(html).toContain('1,26');expect(html).not.toContain('1,00');expect(html).toContain('803 dari 804');expect(html).toContain('9.513 dari 9.516');
});
it('does not replace unavailable source CW with a local CW or a fabricated zero',()=>{
 const html=render(createElement(SourceCaseMixIndex,{rows:[{care:1,cases:10,local:{average:1,count:10,min:.5,max:1.5},source:null,sourceBaseCount:0}]}));expect(html).toContain('Tidak tersedia');expect(html).not.toContain('1,00');expect(html).not.toContain('0,00');expect(html).toContain('href="/profile"');
});
it('keeps the study comparison specific to class, region, and year',()=>{
 expect(inpatientCmiStudyRows('C',2020)[0]).toEqual({region:1,government:0.944,private:0.974});
 expect(inpatientCmiStudyRows('D',2020)[0]).toEqual({region:1,government:0.794,private:0.912});
 expect(inpatientCmiStudyRows('C',2019)[0]).toEqual({region:1,government:0.955,private:1.019});
 expect(inpatientCmiStudyRows('A',2020)[1].private).toBeNull();
});
