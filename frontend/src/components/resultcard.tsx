export default function ResultCard({label,value,detail}:{label:string;value:string;detail:string}){return <article className="result-card"><div className="eyebrow">{label}</div><strong>{value}</strong><span>{detail}</span></article>}

