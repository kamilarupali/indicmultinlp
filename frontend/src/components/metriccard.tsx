export default function MetricCard({label,value,sub}:{label:string;value:string;sub:string}){return <div className="metric-card"><span>{label}</span><b>{value}</b><small>{sub}</small></div>}

