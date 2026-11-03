export default function ModelCard({name,available}:{name:string;available:boolean}){return <div className="model-row"><span>{name}</span><span className={available?'available':'unavailable'}>{available?'Ready':'Needs training / weights'}</span></div>}

