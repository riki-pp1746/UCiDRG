// Descriptions supplied by the user; this catalog does not establish tariff verification.
const entries: [string,string][]=[];
function therapy(prefix:string,name:string,doses:string[]){doses.forEach((dose,i)=>{entries.push([`${prefix}${20+i*2}`,`${name} therapy, ${dose} mCi without anesthesia`],[`${prefix}${21+i*2}`,`${name} therapy, ${dose} mCi with anesthesia`]);});}
therapy('KND21','Lutetium Lu 177 VIP-PET/PSMA',['100','150','200']);
therapy('KND22','Lutetium Lu 177 DOTATATE',['100','150','200']);
therapy('KND23','Iodine I 131 sodium iodide',['30 to 49','50 to 79','100 to 124','150 to 199','200','10 to 14','15 to 29']);
therapy('KND24','Iodine I 131 MIBG',['100','150']);
therapy('KND25','Samarium Sm 153 lexidronam (EDTMP)',['50','75']);
entries.push(['KND2610','Selective internal radiation therapy (SIRT) / Yttrium-90 radioembolization']);
function diagnostic(prefix:string,names:string[]){names.forEach((name,i)=>entries.push([`${prefix}${String(i+1).padStart(2,'0')}`,`${name} for nuclear diagnostic (IM)`]));}
diagnostic('KND01',['Tc-99m-Pertechnetate','Tc-99m-DTPA','Tc-99m-MAG3','Tc-99m-DMSA','Tc-99m-SestaMIBI','Tc-99m-Tetrofosmin','Tc-99m-MDP','Tc-99m-RBC','Tc-99m-MAA','Tc-99m-Pyrophosphate','Tc-99m-HMPAO','Tc-99m-ECD','Tc-99m-Ethambutol','Tc-99m-HIDA','Tc-99m-Mebrofenin','Tc-99m-Sulfur Colloid','Tc-99m-Nano Colloid','Tc-99m-Colloid','Tc-99m-Phyton','Tc-99m-Human Serum Albumin','Tc-99m-Ciprofloxacin','Tc-99m-UBI','Tc-99m-WBC','Tc-99m-Trodat','Tc-99m-PSMA','Other Pharmaceuticals']);
diagnostic('KND02',['Na-I-131','I-131-mIBG','Other Pharmaceuticals']);
diagnostic('KND03',['Na-I-123','I-123-mIBG','I-123-ioflupane','Other Pharmaceuticals']);
diagnostic('KND04',['Lu-177-PSMA','Lu-177-DOTATATE','Lu-177-DOTATOC','Lu-177-DOTANOC','Other Pharmaceuticals']);
diagnostic('KND05',['Ga-67-Citrate','Other Pharmaceuticals']);
diagnostic('KND08',['F-18-FDG','F-18-PSMA','F-18-FDOPA','F-18-FMISO','Na-F-18','Other Pharmaceuticals']);
diagnostic('KND09',['Ga-68-PSMA','Ga-68-DOTATATE','Ga-68-DOTATOC','Ga-68-DOTANOC','Ga-68-FAPI','Other Pharmaceuticals']);
entries.push(['KND06','Thallium-201 (Tl-201) for nuclear diagnostic (IM)'],['KND07','Indium-111 (In-111) for nuclear diagnostic (IM)'],['KND10','NH3-Ammonia for nuclear diagnostic (IM)'],['KND11','Rubidium-82 (Rb-82) - Chloride for nuclear diagnostic (IM)']);
export const KND_DESCRIPTIONS:Readonly<Record<string,string>>=Object.freeze(Object.fromEntries(entries));
export function describeKND(code:string|undefined,fallback=''){return KND_DESCRIPTIONS[code?.trim().toUpperCase()||'']??fallback;}
