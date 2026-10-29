// See docs/methods.md for equations, assumptions and the exact supported checks.
export function describe(rows){
 const xs=rows.filter(r=>r.value!==null).map(r=>Number(r.value));
 if(xs.some(x=>!Number.isFinite(x)))throw Error('Non-finite measurement');
 if(!xs.length)throw Error('No valid measurements');
 let mean=0,m2=0,n=0;for(const x of xs){n++;const d=x-mean;mean+=d/n;m2+=d*(x-mean);}
 if(!Number.isFinite(mean)||!Number.isFinite(m2))throw Error('Numeric range exceeds safe calculation limits');
 const sorted=[...xs].sort((a,b)=>a-b);
 return {n,missing:rows.length-n,mean,sample_sd:n>1?Math.sqrt(Math.max(0,m2/(n-1))):null,min:sorted[0],max:sorted.at(-1),median:n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2};
}
export function individuals(rows,baseline=null){
 const d=describe(rows);if(d.n<2)throw Error('Individuals analysis needs two valid observations');
 // Missing values break adjacency. Never bridge a missing observation.
 const mrs=rows.slice(1).flatMap((r,i)=>r.value===null||rows[i].value===null?[]:[Math.abs(r.value-rows[i].value)]);
 if(!baseline&&!mrs.length)throw Error('No adjacent valid observations for moving range');
 const mr=baseline?baseline.mr_mean:mrs.reduce((a,b)=>a+b,0)/mrs.length;
 const mean=baseline?baseline.center:d.mean;
 const sigma=mr/1.128;
 if(!Number.isFinite(sigma)||sigma<=0)throw Error('Zero or invalid moving-range variation; limits are not estimable');
 const lower=mean-3*sigma,upper=mean+3*sigma;
 const signals=rows.filter(r=>r.value!==null&&(r.value<lower||r.value>upper)).map(r=>({row:r.row_number,measured_at:r.measured_at,value:r.value,rule:'outside individuals limits'}));
 const mrSignals=rows.slice(1).flatMap((r,i)=>r.value!==null&&rows[i].value!==null&&Math.abs(r.value-rows[i].value)>3.267*mr?[{row:r.row_number,value:Math.abs(r.value-rows[i].value),rule:'outside moving range limit'}]:[]);
 return {n:d.n,missing:d.missing,center:mean,mr_mean:mr,within_sigma:sigma,lower,upper,mr_upper:3.267*mr,signals,mr_signals:mrSignals,baseline:baseline?'fixed saved baseline':'estimated from this series',warnings:[...(d.n<20?['Fewer than 20 valid observations; exploratory limits']:[]),...(d.missing?['Missing values excluded; moving ranges do not bridge gaps']:[]),'Only points outside three-sigma individuals and moving-range limits are tested. No normality or independence test.']};
}
export function capability(rows,spec){
 const d=describe(rows);if(d.n<2||!d.sample_sd)throw Error('Capability needs at least two observations with nonzero sample variation');
 if(!spec||!(spec.lower_limit<spec.upper_limit))throw Error('Capability requires ordered lower and upper specifications');
 const {lower_limit:l,upper_limit:u}=spec;
 return {...d,lower_spec:l,upper_spec:u,pp:(u-l)/(6*d.sample_sd),ppk:Math.min((u-d.mean)/(3*d.sample_sd),(d.mean-l)/(3*d.sample_sd)),outside_spec:rows.filter(r=>r.value!==null&&(r.value<l||r.value>u)).length,
 warnings:[...(d.n<50?['Fewer than 50 valid observations; exploratory performance indices']:[]),'Overall sample standard deviation, no bias correction. Pp/Ppk are not Cp/Cpk. Normality and stability must be reviewed; this result never approves production.']};
}
