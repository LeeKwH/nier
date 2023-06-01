import { createContext, useState } from 'react';

const StateContext = createContext({
  region:'',
  ProcData:'',
  ProcChart:'',
  isApplyDB:'',
  setisApplyDB: () => {},
  isApplyP:'',
  setisApplyP: () => {},
  changeVal: () => {},
  changeProcData:()=>{},
  makeChartfromProc:()=>{},
});


const StateProvider = ({ children }) => {
  const [region, setregion] = useState([]);
  const [ProcData, setProcData] = useState([]);
  const [ProcChart, setProcChart] = useState([]);
  const [isApplyDB, setisApplyDB] = useState(false);
  const [isApplyP, setisApplyP] = useState(false);
  
  const makeChartfromProc = (data)=>{
    if (data.length===0) setProcChart([]);
    else {  
      const result = {};
      const vals = [];
      const date = data.map(d=>{const tmp = new Date(d['date']); const m = tmp.getMonth()+1; const y = tmp.getFullYear(); return  `${y}-${m}`;})
      result['date'] = date;
      // const vals = Object.keys(data[0]).splice(2);
      data.map(daydata=>{
        const tmpval = Object.keys(daydata).splice(2);
        tmpval.map(v=>{if(!vals.includes(v))vals.push(v)})
      })
      result['vals'] = vals;
      vals.map(v=>{
        if(v!=='id'&&v!=='date'){
          result[v] = data.map(d=>d[v]);
        }
      });
      setProcChart(result);
    }
  }

  
  const changeVal = (reg,mode) =>{
    let tmp = reg.filter((d,i)=>{return reg.indexOf(d)===i;})
    // if(mode === 0) tmp = reg.filter((v)=>v.split('-').length === 4);
    if(mode === 0) tmp = tmp.map(function(v){return v.split('__').length>=5?v.slice(3):null});
    tmp = tmp.filter((v)=>v!==null).map((t)=>t.split('__'))
    tmp = tmp.map(t =>{if(t.length === 5) return [t[0],t[1],t[2],t[3]+t[4]]; else return t;})
    tmp = tmp.sort(function(a,b){return a[0]<b[0]?-1:a[0]>b[0]?1:0});
    setregion(tmp);
  }

  const changeProcData = (data) =>{
    const tmp = [...ProcData];
    const idx =data.id;
    tmp[idx] = data;
    setProcData(tmp);
    makeChartfromProc(tmp);
  }

  return (
    <StateContext.Provider
      value={{
        region,
        ProcData,
        ProcChart,
        isApplyDB,
        setisApplyDB,
        isApplyP,
        setisApplyP,
        changeVal,
        changeProcData,
        makeChartfromProc,
      }}>
      {children}
    </StateContext.Provider>
  );
};

export { StateContext, StateProvider };