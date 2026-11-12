import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import HelpTip from '../ui/HelpTip';

export default function CostTariffChart({cost,tariff}:{cost:number;tariff:number}) {
  const rows=[{label:'Biaya JKN',value:cost,fill:'#087D76'},{label:'Tarif iDRG',value:tariff,fill:'#57713F'}];
  const largest=Math.max(cost,tariff);
  const scale=largest>=1e9?{factor:1e9,label:'miliar rupiah'}:largest>=1e6?{factor:1e6,label:'juta rupiah'}:largest>=1e3?{factor:1e3,label:'ribu rupiah'}:{factor:1,label:'rupiah'};
  return <figure className="uc-cost-chart">
    <ResponsiveContainer width="100%" height={208} minWidth={0}>
      <BarChart data={rows} margin={{top:12,right:16,left:0,bottom:8}} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="#DBE7E5"/>
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#45605E',fontSize:12}}/>
        <YAxis width={54} axisLine={false} tickLine={false} tick={{fill:'#45605E',fontSize:12}} tickFormatter={value=>formatNumber(Number(value)/scale.factor,1)}/>
        <Tooltip formatter={value=>[formatRupiah(Number(value)),'Nilai']} cursor={{fill:'#DBE7E5',opacity:.55}}/>
        <Bar dataKey="value" maxBarSize={76} radius={[5,5,0,0]} isAnimationActive={false}>
          {rows.map(row=><Cell key={row.label} fill={row.fill}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <figcaption><HelpTip term="chartCurrency">Sumbu vertikal dalam {scale.label}</HelpTip>. {rows.map(row=>`${row.label} ${formatRupiah(row.value)}`).join(' · ')}.</figcaption>
  </figure>;
}
