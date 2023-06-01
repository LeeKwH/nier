// Using Express
const { application } = require('express');
const express = require('express');
const path = require('path');
const app = express();
const iconv = require('iconv-lite');
const spawn = require('child_process').spawn
const fs = require('fs');
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secretKey = 'neir_secret_key';
const refsecretKey = 'neir_refsecret_keysss_yj';
const cookieParser = require('cookie-parser');
const { PythonShell } = require("python-shell");

app.use(express.urlencoded({
    extended: true
}))
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(cookieParser());

// User 경로 사용
app.use('/api/menual',express.static(path.join(__dirname,'.file')));
app.use('/api/tile',express.static(path.join(__dirname,'map/tile')))


// NIER변경
const pythonpath = 'C:\\Users\\choiyj\\Anaconda3\\envs\\nier_env\\python';
const pythonpathforattn = 'C:\\Users\\choiyj\\Anaconda3\\envs\\nier_attn\\python';


/**
 * 
 * @param {Array} data tree로 작성할 Data
 * @param {boolean} ismulti Data가 Multi형식의 data인지   
 */
const makeTree = (data,name)=>{
    var nm="";
    var id =0;
    switch(name){
        case "kma": nm="기상"; break;
        case "nierwek": id=1; nm="수질(주간)"; break;
        case "nierday": id=2; nm="수질(일간)"; break;
        case "cyano": id =3; nm="조류"; break;
        case "mywater": id=4; nm="수문"; break;
    }
    const tmp = [];
    if(id===0){
        var myidx = 0;
        data.forEach((tmpdata,idx)=>{
            if (idx !== 0) myidx = tmp.length;
            const key = Object.keys(tmpdata[0]);
            // child 1
            key.forEach((reg,ridx)=>{
                tmp.push({
                    id:`0-${nm}-${reg}`,
                    name:reg,
                    children:[],
                })
            })

            tmpdata.forEach((d,vidx)=>{
                key.forEach((reg,ridx)=>{
                    // if(!d[reg].includes("일시")&&!d[reg].includes("지점명")&&!d[reg].includes("조사일")&&!d[reg].includes("일자")&&!d[reg].includes("NULL")){
                    if(!['일시','지점명','조사일','일자','NULL'].includes(d[reg].trim())){
                        tmp[myidx+ridx].children.push({
                            parent:reg,
                            id:`0-${nm}-${reg}-${d[reg].trim()}`,
                            name:d[reg].trim(),
                        })
                    }
                })
            })
        })
    } else{
        const key = Object.keys(data[0]);
        // child 1
        key.forEach((reg,ridx)=>{
            tmp.push({
                id:`0-${nm}-${reg}`,
                name:reg,
                children:[],
            })
        })
        

        data.forEach((d,vidx)=>{
            key.forEach((reg,ridx)=>{
                // if(d[reg]!==null&&!d[reg].includes("일시")&&!d[reg].includes("조사회차")&&!d[reg].includes("지점명")&&!d[reg].includes("조사일")&&!d[reg].includes("NULL")&&!d[reg].includes("측정소명")&&!d[reg].includes("채수위치")&&!d[reg].includes("연도")&&!d[reg].includes("월")&&!d[reg].includes("수계명")&&!d[reg].includes("중권역명")){
                if(d[reg]!==null&&!['일시','조사회차','지점명','조사일','조사일1','NULL','측정소명','채수위치','연도','월','수계명','중권역명','분류'].includes(d[reg].trim())){
                    tmp[ridx].children.push({
                        parent:reg,
                        id:`0-${nm}-${reg}-${d[reg].trim()}`,
                        name:d[reg].trim(),
                    })
                }
            })
        })
    }
    const result = {
        id:`0-${nm}`,
        name:nm,
        children:tmp
    }
    return result;
}

const makeTree2 = (data)=>{
    const regions = Object.keys(data);
    const result = {};
    regions.forEach((region)=>{
        const tmpregion = region.split("__");
        if(!result.hasOwnProperty(tmpregion[0])) result[tmpregion[0]]={
            id:`0-${tmpregion[0]}`,
            name:tmpregion[0],
            children:[]
        };
        if(!result[tmpregion[0]].children.some(s=>s.name===tmpregion[1])) result[tmpregion[0]].children.push({
            id:`0-${tmpregion[0]}-${tmpregion[1]}`,
            name:tmpregion[1],
            children:[]
        });
        
        const tmpdata = data[region];
        tmpdata.forEach((d)=>{
            const key = Object.keys(d);
            key.forEach((k)=>{
                if(!result[tmpregion[0]].children.filter(s=>s.name===tmpregion[1]).at(0).children.some(s=>s.name===k)) result[tmpregion[0]].children.filter(s=>s.name===tmpregion[1]).at(0).children.push({
                    id:`0-${tmpregion[0]}-${tmpregion[1]}-${k}`,
                    name:k,
                    children:[]
                });
                if(!result[tmpregion[0]].children.filter(s=>s.name===tmpregion[1]).at(0).children.filter(s=>s.name===k).at(0).children.some(s=>s.name===d[k].trim())&&!d[k]!==null&&!['일시','조사회차','지점명','조사일','조사일1','조사일.1','No','NULL','NaN','측정소명','채수위치','연도','월','수계명','중권역명','분류'].includes(d[k].trim())) result[tmpregion[0]].children.filter(s=>s.name===tmpregion[1]).at(0).children.filter(s=>s.name===k).at(0).children.push({
                    parent:k,
                    id:`0-${tmpregion[0]}-${tmpregion[1]}-${k}-${d[k].trim()}`,
                    name:d[k].trim(),
                });
            })
        })

    })
    return result;
}

const makeTree3 = (data,isselect)=>{
    const regions = Object.keys(data);
    const result = {};
    regions.forEach((region)=>{
        const tmpregion = region.split("__");
        if(!result.hasOwnProperty(tmpregion[0])) result[tmpregion[0]]={
            value:`0__${tmpregion[0]}`,
            label:tmpregion[0],
            showCheckbox:false,
            children:[]
        };
        if(!result[tmpregion[0]].children.some(s=>s.label===tmpregion[1])) result[tmpregion[0]].children.push({
            value:`0__${tmpregion[0]}__${tmpregion[1]}`,
            label:tmpregion[1],
            showCheckbox:false,
            children:[]
        });
        
        const tmpdata = data[region];
        if(isselect){
            tmpdata.forEach((d)=>{
                const key = Object.keys(d);
                key.forEach((k)=>{
                    if(!result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.some(s=>s.label===k)) result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.push({
                        value:`0__${tmpregion[0]}__${tmpregion[1]}__${k}`,
                        label:k,
                        showCheckbox:false,
                        children:[]
                    });
                    if(!result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.filter(s=>s.label===k).at(0).children.some(s=>s.label===d[k].trim())&&!d[k]!==null&&!['일시','조사회차','지점명','조사일','조사일1','조사일.1','No','NULL','NaN','측정소명','채수위치','연도','월','수계명','중권역명','분류'].includes(d[k].trim())) result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.filter(s=>s.label===k).at(0).children.push({
                        parent:k,
                        showCheckbox:false,
                        value:`0__${tmpregion[0]}__${tmpregion[1]}__${k}__${d[k].trim()}`,
                        label:d[k].trim(),
                    });
                })
            }
        )} else{
            tmpdata.forEach((d)=>{
                const key = Object.keys(d);
                key.forEach((k)=>{
                    if(!result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.some(s=>s.label===k)) result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.push({
                        value:`0__${tmpregion[0]}__${tmpregion[1]}__${k}`,
                        label:k,
                        children:[]
                    });
                    if(!result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.filter(s=>s.label===k).at(0).children.some(s=>s.label===d[k].trim())&&!d[k]!==null&&!['일시','조사회차','지점명','조사일','조사일1','조사일.1','No','NULL','NaN','측정소명','채수위치','연도','월','수계명','중권역명','분류'].includes(d[k].trim())) result[tmpregion[0]].children.filter(s=>s.label===tmpregion[1]).at(0).children.filter(s=>s.label===k).at(0).children.push({
                        parent:k,
                        value:`0__${tmpregion[0]}__${tmpregion[1]}__${k}__${d[k].trim()}`,
                        label:d[k].trim(),
                    });
                })
            }
        )}
    })
    return result;
}



/**
 * make Query for many data 
 * @param {Array} data Region object from frontend, `data` is Region data and `stdate` is start date, `eddate` is end date.
 * @example input data array example follow
 * {
  data: [
    [ '영산강', '조류', '강정고령보', '채수위치' ],
    ...
  ],
  stdate: '2022-10-19T00:00:00+09:00',
  eddate: '2023-01-19T00:00:00+09:00'
}
 * @returns Query str Array
 */
const makedfQuery = (data) =>{
    allvars = [];
    regname = [];
    querys = [];
    tmpobj = {};
    //change 완료
    data.data.map((d)=>{
        allvars.push(`${d[1]}_${d[2]}_${d[3]}`)
        if(!tmpobj.hasOwnProperty(`${d[2]}`)) {tmpobj[`${d[2]}`]=[d[3]]; regname.push(`${d[1]}_${d[2]}`);}
        else tmpobj[`${d[2]}`].push(d[3]);
    });
    for (let key in tmpobj){
        const vals = '"일시","'+tmpobj[key].join('","')+'"';
        querys.push(`SELECT ${vals} FROM "${key}" as t(일시) WHERE 일시::TIMESTAMP BETWEEN '${data.stdate}'::TIMESTAMP AND '${data.eddate}'::TIMESTAMP;`)
    }
    return [regname,querys,allvars];
}

const maketreeQuery = (data)=>{
    const query = {};
    data.map(d=>{
        const tmpd = d.split('__');
        if(tmpd.length !==4) query[tmpd[1]+"__"+tmpd[2]]=`SELECT * FROM ${d}`;
        else if(tmpd[3]==="0"){
            const subs = data.filter(d=>d.includes(tmpd[1]+"__"+tmpd[2])); 
            var tmpquery = subs.join('; SELECT * FROM ');
            tmpquery = 'SELECT * FROM '+tmpquery+';';
            query[tmpd[1]+"__"+tmpd[2]] = tmpquery;
        }
    })
    return query;
}

const getDates=(std,end) =>{
  
	const dateArray = [];
	let startDate = new Date(std);
    startDate = new Date(startDate.setDate(startDate.getDate() + 1));
  	let endDate = new Date(end);
    endDate = new Date(endDate.setDate(endDate.getDate() + 1));
  
	while(startDate <= endDate) {
		dateArray.push(startDate.toISOString().split('T')[0]);
		startDate.setDate(startDate.getDate() + 1);
	}
	return dateArray;
}


/**
 * make Object from Region data
 * @param {Object} data from Query Result 
 * @example
 * data example follow 
 * {
  vals: [ '수질_강정고령보', '수질_강천보' ],
  '수질_강정고령보': [
    {
      '일시': '2022-10-24',
      '채수위치': '다사                                                                                                  ',
      '수온': '18.1',
      ph: '7.8'
    },
    {
      '일시': '2022-10-31',
      '채수위치': '다사                                                                                                  ',
      '수온': '17.2',
      ph: '7.6'
    },
  ],
  '수질_강천보': [
    { '일시': '2022-10-24', '수온': '15.9', ph: '8.3' },
    { '일시': '2022-10-31', '수온': '15.4', ph: '8.5' },

  ]
}
 * @returns Object for Preprocessing Data (mui datagrid)
 */
const dataframes = (data) =>{
    const result = {};
    const realresult = [];
    const regs = data.vals
    const std = data.dates.start;
    const edd = data.dates.end;
    const alldates = getDates(std,edd);
    const allvars = data.allvars;
    const nulls = [];
    regs.map((r)=>{
        if(data[r].length===0){
            nulls.push(r);
        }
        data[r].map((d)=>{
            tmpvals = Object.keys(d);
            tmpdata = {};
            tmpvals.map((v)=>{
                if(v!=='일시') {
                    d[v] = !isNaN(d[v])?Number(d[v]):d[v].trim()==="NaN"?null:d[v].trim();
                    tmpdata[`${r}_${v}`] = d[v];
                }
            });
            if(!result.hasOwnProperty(d['일시'])){
                result[d['일시']] = tmpdata;
            } else{
                result[d['일시']] = {...result[d['일시']], ...tmpdata};
            }
        })
    });

    alldates.map((d)=>{
        if(!result.hasOwnProperty(d)){
            result[d] = {};
            allvars.map(v=>{
                result[d][v] = null;
            })
        }
        else{
            allvars.map(v=>{
                if(!result[d].hasOwnProperty(v)) result[d][v] = null;
            })
        }
    })
    
    const resultdays = Object.keys(result);
    resultdays.map((d,idx)=>{
        tmp = {id:idx,date:d};
        realresult.push({...tmp,...result[d]});
    })

    const passR = realresult.sort((a,b)=>new Date(a.date)-new Date(b.date));

    return passR;
}

/**
 * make dataframeinfo
 * @param {Object} data from dataframe
 * @param {list} allvars all variables name 
 * @example
 * data example follow 
 * [
  {
    id: 0,
    date: '2022-12-23',
    '댐_일간_대청_댐_유입량_DAY': 19.418,
    '댐_일간_대청_댐_저수량_DAY': 900.993,
    '수질_일간_금강_갑천_수온': null,
    '수질_일간_금강_갑천_전기전도도': null
  },
  {
    id: 1,
    date: '2022-12-24',
    '댐_일간_대청_댐_유입량_DAY': 21.309,
    '댐_일간_대청_댐_저수량_DAY': 900.106,
    '수질_일간_금강_갑천_수온': null,
    '수질_일간_금강_갑천_전기전도도': null
  },
  ...
 * @returns info for Preprocessing Data
 */
const dataframes_info = (data,allvars)=>{
    const result = [{id:"obs"},{id:"nan"},{id:"zero"}];
    
    allvars.map((r)=>{
        const targetData = data.map(d=>d[r]);

        obslen = targetData.filter(t=>t).length;
        nanlen = targetData.filter(t=>t===null||t===undefined).length;
        zerolen = targetData.filter(t=>t===0).length;
        tmp = {};
        tmp[r] = obslen;
        result[0] = {...result[0], ...tmp}
        tmp[r] = nanlen;
        result[1] = {...result[1], ...tmp}
        tmp[r] = zerolen;
        result[2] = {...result[2], ...tmp}
        
    });
    return result;
}

const dataframes_info_for_process = (data)=>{ // obs : 관측 데이터, nan : 값이 없는 데이터, zero : 값이 0인 데이터
    const result = [{id:"obs"},{id:"nan"},{id:"zero"}];
    const tmpdata = [...data];
    const lenmax = tmpdata.sort((a,b)=>Object.keys(b).length-Object.keys(a).length)[0];
    const regs = Object.keys(lenmax).filter(d=>!d.includes('date')&&!d.includes('id')&&!d.includes('len'));
    regs.map((r)=>{
        obslen = data.filter(t=>t[r]).length;
        nanlen = data.filter(t=>t[r]===null).length;
        zerolen = data.filter(t=>t[r]===0).length;
        tmp = {};
        tmp[r] = obslen;
        result[0] = {...result[0], ...tmp}
        tmp[r] = nanlen;
        result[1] = {...result[1], ...tmp}
        tmp[r] = zerolen;
        result[2] = {...result[2], ...tmp}
    });
    return result;
}

/**
 * to pass to python script, make data
 * @param {Object} data from client 
 * @returns object data
 */
const processEncode= (data) =>{
    let val = [...data.request];
    val.shift();
    val.shift();
    const passdata ={};
    passdata['date'] = data.data.map(d=>d.date);
    val.map(v=>{
        let valdata = [];
        // if(!passdata.hasOwnProperty(v)) passdata[v] = data.data.map(d=>d[v]);
        if(!passdata.hasOwnProperty(v)){
            data.data.map(d=>{
                if(d[v]===null||d[v]===undefined) valdata.push(null);
                else valdata.push(d[v]);
            })
            passdata[v] = valdata;
        }
    })
    return passdata;
}

const convertToCSV=(arr) =>{ // in Dataprocessing, or forecast, export mui datagrid to csv
    const titles = Object.keys(arr[0]);
    let result = '';
    titles.forEach((title,index)=>{
        result += (index !== titles.length-1 ? `${title},` : `${title}\r\n`);
    })

    arr.forEach((cont,index)=>{
        let row = '';
        titles.forEach((title,ind)=>{
            row += (ind !== titles.length-1 ? `${cont[title]},` : `${cont[title]}`);
        })
        result += (index !== arr.length-1 ? `${row}\r\n` : `${row}`);
    })

    return result;

    // const lenmax = arr.sort((a,b)=>Object.keys(b).length-Object.keys(a).length)[0];
    // const array = [Object.keys(lenmax)].concat(arr)
    // return array.map(it => {
    //   return Object.values(it).toString()
    // }).join('\n')
}

/**
 * Using python Script and return data, return Graph and Table data
 * @param {Object} data python script return data 
 * @returns {Object} Graph and Table data
 */
const forecastData = (data)=>{
    let Tresult = [];
    let tmpTresult = {};
    let Gresult = [];
    let Dates = [];

    data.map(d=>{
        const model = d.model;
        const vars = Object.keys(d.data['forecast_yhat']);
        vars.map(v=>{
            const dates = Object.keys(d.data['forecast_yhat'][v]);
            Dates = [...dates];
            const tmpvar = v.split('_').at(-1);
            dates.map(date=>{
                if(!tmpTresult[date]) tmpTresult[date] = {};
                if(!tmpTresult[date][`${model}_${tmpvar}`]) tmpTresult[date][`${model}_${tmpvar}`] = d.data['forecast_yhat'][v][date];
            })
            Gresult.push([{
                label:`${model}_${tmpvar}_predict`,
                data:Object.values(d.data['forecast_yhat'][v]),
                type: 'line',
                borderColor: 'rgb(250, 0, 0)',
            backgroundColor: 'rgba(250, 0, 0, 0.5)',
                borderWidth: 1,
                pointRadius: 0.2,
            },
            {
                label:`${model}_y`,
                data:Object.values(d.data['forecast_y'][v.split('(')[0]]),
                type: 'line',
                borderColor: 'rgb(0, 0, 0)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                pointRadius: 0.2,
            }])
        })
    })
    Dates.map((d,i)=>{
        Tresult.push({id:i,...tmpTresult[d], date:d});
    })
    Tresult.sort((a,b)=>a.date-b.date);
    const result ={
        date:Dates,
        table:Tresult,
        graph:Gresult
    }
    return result;
}

const forecastDataForRef =(data, std, end) =>{ // 가이던스 모델 사용 시
    let Tresult = [];
    let tmpTresult = {};
    let Gresult = [];
    let Dates = [];
    const regions = Object.keys(data);

    regions.map(r=>{
        const usedata = data[r]["prediction"];
        const ydata = data[r]["유해남조류세포수_Y"]
        Dates = Object.keys(usedata);
        Dates = Dates.filter(d=>d>=std&&d<=end);
        let predData = [];
        let yData = [];
        Dates.map(date=>{
            if(!tmpTresult[date]) tmpTresult[date] = {};
            if(!tmpTresult[date][r]) tmpTresult[date][r] = usedata[date];
            predData.push(usedata[date]);
            yData.push(ydata[date]);
        })
        Gresult.push([{
            label:`${r}_유해남조류세포수_predict`,
            data:predData,
            type: 'line',
            borderColor: 'rgb(250, 0, 0)',
            backgroundColor: 'rgba(250, 0, 0, 0.5)',
            borderWidth: 1,
            pointRadius: 0.2,
        },{
            label:`${r}_유해남조류세포수_y`,
            data:Object.values(ydata),
            type: 'line',
            borderColor: 'rgb(0, 0, 0)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            pointRadius: 0.2,
        },])
    })
    Dates.map((d,i)=>{
        Tresult.push({id:i,...tmpTresult[d], date:d});
    })
    Tresult.sort((a,b)=>a.date-b.date);
    const result ={
        date:Dates,
        table:Tresult,
        graph:Gresult
    }
    return result;
}

const SeachData = (data,select,search)=>{ // frontend의 Database 화면, 데이터 검색 기능
    let cpData = [...data];
    if (select ==="지역명"){
        data.map((one,oneidx)=>{
            one.children.map((two,twoidx)=>{    
                two.children.map((region,ridx)=>{
                    if(!region.label.includes(search))
                        delete cpData[oneidx].children[twoidx].children[ridx];
                })
                cpData[oneidx].children[twoidx].children = cpData[oneidx].children[twoidx].children.filter(d=>d!==undefined&&d!==null);
                if(cpData[oneidx].children[twoidx].children.length===0) delete cpData[oneidx].children[twoidx];
            })
            cpData[oneidx].children = cpData[oneidx].children.filter(d=>d!==undefined&&d!==null);
            if(cpData[oneidx].children.length===0) delete cpData[oneidx];
        })
        cpData = cpData.filter(d=>d!==undefined&&d!==null);
        return cpData;
    }
    else if(select==="변수명"){
        data.map((one,oneidx)=>{
            one.children.map((two,twoidx)=>{
                two.children.map((region,ridx)=>{
                    region.children.map((varname,vidx)=>{
                        if(!varname.label.includes(search))
                            delete cpData[oneidx].children[twoidx].children[ridx].children[vidx];
                    })
                    cpData[oneidx].children[twoidx].children[ridx].children = cpData[oneidx].children[twoidx].children[ridx].children.filter(d=>d!==undefined&&d!==null);
                    if(cpData[oneidx].children[twoidx].children[ridx].children.length===0) delete cpData[oneidx].children[twoidx].children[ridx];
                })
                cpData[oneidx].children[twoidx].children = cpData[oneidx].children[twoidx].children.filter(d=>d!==undefined&&d!==null);
                if(cpData[oneidx].children[twoidx].children.length===0) delete cpData[oneidx].children[twoidx];
            })
            cpData[oneidx].children = cpData[oneidx].children.filter(d=>d!==undefined&&d!==null);
            if(cpData[oneidx].children.length===0) delete cpData[oneidx];
        })
        cpData = cpData.filter(d=>d!==undefined&&d!==null);
        return cpData;
    }
}

const PassYresult = (d)=>{ // Train result format - react-chart.js
    let datasets = {};
    ['test_yhat','test_y'].map(da=>{
        const regions = Object.keys(d[da]);
        regions.map(k=>{
            if(!datasets[k]) datasets[k] = [];
            switch(da){
                case 'test_yhat':
                    datasets[k].push({
                        label : `${k}_yhat`,
                        data : Object.values(d[da][k]),
                        type: 'line',
                        borderColor: 'rgb(20, 100, 205)',
                        backgroundColor: 'rgba(20, 100, 205, 0.5)',
                        borderWidth: 1,
                        pointRadius: 0.2,
                    });
                    break;
                case 'test_y':
                    datasets[k].push({
                        label : `${k}_y`,
                        data : Object.values(d[da][k]),
                        type: 'line',
                        borderColor: 'rgb(0, 0, 0)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        borderWidth: 1,
                        pointRadius: 0.2,
                    })
                    break;
                }
            })
        })
    const labels = Object.keys(d['test_yhat'][Object.keys(d['test_yhat'])[0]]);
    return {labels:labels, datasets:datasets};
}

// Using PostgreSQL
const { Client } = require('pg');
const { exec } = require('child_process');

app.listen(8888, function () {
  console.log('listening on 8888')
}); 

// Connect DB
var client = new Client({
    user : 'nier',
    // NIER변경
    host : "localhost",
    database : 'NIERDB',
    // database : 'NIERSYS',
    password : "dkdk123",
    port : 5432,
})

client.connect(err=>{
    if (err){
        console.error('connect DB ERROR', err.stack)
    }else{
        console.log('Success DB connect')
    }
});

// API 작성 --> 각 기능을 frontend에서 호출하여 사용

app.get('/api/list/alldata', (req,res)=>{

    /* 수계별 데이터 정보 return*/

    client.query("select tablename from PG_TABLES WHERE tablename like 'info__%'",(err,rows)=>{ // DB info__ 로 시작하는 Table 데이터 정보 get
        if (err){
            res.json({error:err});
        } else{
            const data = rows.rows.map(r=>r.tablename);
            const result = maketreeQuery(data);
            const regions = Object.keys(result);
            const myresult = {};
            regions.map(r=>{
                client.query(result[r],(err,rows)=>{
                    if (err){
                        res.json({error:err});
                    } else{
                        if(rows.length) {
                            const tmprows = rows.map(row=>row.rows);
                            const pushrows = tmprows.reduce((acc,cur)=>acc.concat(cur));
                            myresult[r] = pushrows;
                        }
                        else myresult[r] = rows.rows;
                        if(Object.keys(myresult).length===regions.length){
                            // res.json(myresult);
                            // res.json(myresult['낙동강__수질_주간']);                  
                            // res.json(Object.keys(myresult));   
                            
                            const passResult = {};
                            const keys = Object.keys(myresult);
                            keys.map(k=>{
                                const target = k.includes('금강')?'금강':k.includes('한강')?'한강':k.includes('낙동강')?'낙동강':'영산강';
                                if(!passResult.hasOwnProperty(target)) passResult[target] = {'regionNum':0,'valueNum':0}; // 수계별 지역 수, 변수 수 저장
                                const subKeys = Object.keys(myresult[k][0]);
                                passResult[target]['regionNum'] += subKeys.length;
                                let tmplen = 0;
                                subKeys.map(sk=>{
                                    let lens = myresult[k].filter(d=>d[sk]!==null||d[sk]!==undefined||!d[sk].includes("NaN")||!d[sk].includes('NULL')).length;
                                    tmplen += lens;
                                })
                                passResult[target]['valueNum'] += tmplen;
                            });
                            res.json(passResult);
                        }
                    }
                })
            })
            // res.json(myresult);
        }
    })
})

/**
 * tree 형식의 val data return 
 * @param need 필요한 데이터 - nier, kma, cyano, mywater
 * @returns tree 형식의 Data
 */
app.get('/api/treelist/:need', (req,res)=>{
    var sql = "";
    switch(req.params.need){
        case "kma":
            sql = "SELECT * FROM info_kma_aso; " + "SELECT * FROM info_kma_aws;";
            break;
        case "nierwek":
            // sql = "SELECT * FROM info_nier_wq_wek"
            sql = "SELECT * FROM info_nier_wq_day"
            break;
        case "nierday":
            sql = "SELECT * FROM info_nier_wq_day"
            break;
        default:
            sql = `SELECT * FROM info_${req.params.need}`;
    }
    client.query(sql,(err,rows)=>{
        if (err){
            res.json({error:err});
        } else{
            if (req.params.need==="kma"){
                res.json(makeTree(rows.map(row=>row.rows),req.params.need));
            }
            else res.json(makeTree(rows.rows,req.params.need));
        }
    })
})


/**
 * tree 형식의 val data return 
 * @returns tree 형식의 Data
 * /api/treelist --> 업데이트 버전, /api/tree/test 로 사용함
 */
app.get('/api/tree/test',(req,res)=>{
    client.query("select tablename from PG_TABLES WHERE tablename like 'info__%'",(err,rows)=>{
        if (err){
            res.json({error:err});
        } else{
            const data = rows.rows.map(r=>r.tablename);
            const result = maketreeQuery(data);
            const regions = Object.keys(result);
            const myresult = {};
            regions.map(r=>{
                client.query(result[r],(err,rows)=>{
                    if (err){
                        res.json({error:err});
                    } else{
                        if(rows.length) {
                            const tmprows = rows.map(row=>row.rows);
                            const pushrows = tmprows.reduce((acc,cur)=>acc.concat(cur));
                            myresult[r] = pushrows;
                        }
                        else myresult[r] = rows.rows;
                        if(Object.keys(myresult).length===regions.length){
                            // res.json(makeTree2(myresult));
                            res.json({origin:Object.values(makeTree3(myresult,false)),select:Object.values(makeTree3(myresult,true))});
                            // res.json(myresult);
                        }
                    }
                })
            })
            // res.json(myresult);
        }
    })
})

app.post('/api/search',(req,res)=>{ // 데이터 검색
    const data = req.body;
    const select = data.select;
    const search = data.search;
    const dbdata = data.db;
    const result = SeachData(dbdata,select,search);
    if(result.length===0) res.json({error:"검색 결과가 없습니다."});
    else res.json(result);
    
})

app.get('/api/chartdata/:val/:region/:st/:ed',(req,res)=>{
    /*
        return data for draw chart
        data type for chart library - chart.js
    */
    const v = decodeURI(req.params.val); // api 한글이 포함되어 decode 사용
    const r = decodeURI(req.params.region);
    const s = decodeURI(req.params.st);
    const e = decodeURI(req.params.ed);
//    res.json({q:`SELECT ${v} FROM ${r} WHERE 일시::TIMESTAMP BETWEEN '${s}'::TIMESTAMP AND '${e}'::TIMESTAMP`});
    client.query(`SELECT 일시,${v} FROM ${r} as t(일시) WHERE 일시::TIMESTAMP BETWEEN '${s}'::TIMESTAMP AND '${e}'::TIMESTAMP`, (err,rows)=>{ // 모든 데이터 테이블 첫 데이터 -> 날짜 데이터, '일시'이름으로 get
        if (err){
            res.json({error:err});
        } else {
            rows.rows.sort((a,b)=>a['일시']-b['일시']);
            rows.rows.map(raw=>{
                raw[v] = raw[v]==="NaN"?null:Number(raw[v]);
                if(typeof raw['일시']==='string')
                    raw['일시'] = new Date(raw['일시'].trim()); 
                offset = raw['일시'].getTimezoneOffset();
                tmp = new Date(raw['일시'].getTime()-(offset*60*1000))
                m = tmp.getMonth()+1;
                y = tmp.getFullYear();
                raw['일시'] = `${y}-${m}`;
            });
            const numall = rows.rows.length; 
            const numok = rows.rows.filter(raw=>raw[v]).length;
            const numnan = numall-numok;
            const numzero = rows.rows.filter(raw=>raw[v]===0).length;
            const data = rows.rows.map(d=>d[v]);
            const days = rows.rows.map(d=>d['일시']);
            res.json({nall: numall, nok: numok, nnan: numnan, nzero: numzero, data:data, days:days});

            
        }
    })
})


// Using post, get region data => res dataframe
app.post('/api/dataframe', (req,res)=>{
    const data = req.body;
    const querys = makedfQuery(data);
    const regionName = querys[0];
    const query = querys[1].join(' ');
    const result = {};
    client.query(query,(err,rows)=>{
        if (err){
            console.log(err)
            res.json({error:err});
        } else{
            result['vals'] = regionName;
            result['dates'] = {'start':data.stdate, 'end':data.eddate};
            result['allvars'] = querys[2];
            if(querys[1].length === 1){
                rows.rows.sort((a,b)=>a['일시']-b['일시']);
                rows.rows.map((v)=>{
                    if(typeof v['일시']==='string') v['일시'] = new Date(v['일시'].trim()); 
                    offset = v['일시'].getTimezoneOffset();
                    tmp = new Date(v['일시'].getTime()-(offset*60*1000))
                    v['일시'] = tmp.toISOString().split('T')[0];
                })
                result[`${regionName[0]}`] = rows.rows;
            }else{
                rows.map((r,idx)=>{
                    r.rows.sort((a,b)=>a['일시']-b['일시']);
                    r.rows.map((v)=>{
                        if(typeof v['일시']==='string') v['일시'] = new Date(v['일시'].trim()); 
                        offset = v['일시'].getTimezoneOffset();
                        tmp = new Date(v['일시'].getTime()-(offset*60*1000))
                        v['일시'] = tmp.toISOString().split('T')[0];
                    })
                    result[`${regionName[idx]}`] = r.rows;
                });
            }
            // var info = dataframes_info(result);
            var realresult = dataframes(result);
            
            var info = dataframes_info(realresult,querys[2]);
            if (!Array.isArray(info)) res.json({error:`Data Error, 선택한 변수의 기간에 데이터가 없습니다. 기간 및 변수를 변경해주세요. Error Var : ${info.error}`})
            // var graph = datagraph(result);
            res.json({info:info, data:realresult, vals:regionName});
        }
    })
})

app.post('/api/dataframe/info', (req,res)=>{ // Data info return
    const data = req.body.data;
    const result = dataframes_info_for_process(data);
    res.json({info:result});
})


app.post('/api/python/preprocessing/one',(req,res)=>{
    const data = req.body;
    const passdata = processEncode(data);
    // console.log(data.data.map(v => v['date']))
    const func = data.request[0].split('-')[0];
    const method = data.request[0].split('-')[1];
    const att = data.request[1];
    const vals = data.request.filter((v,i)=>i>1);
    const id = data.id;
    const key = data.key;
    
    // console.log(passdata);

    if(method === 'any'){ // dropnan any, all의 경우 python 작업 없이 작동
        let result = data.data;
        vals.map((v,i)=>{
            let tmpresult = result.filter(d=>d[v]!==null&&d[v]!==undefined);
            result = tmpresult;
        })
        res.json({result:result, info:dataframes_info_for_process(result)});
    }else if(method === 'all'){
        let result = data.data;
        vals.map((v,i)=>{
            let tmpresult = result.filter(d=>d[v]===null||d[v]===undefined);
            result = tmpresult;
        })
        let realresult = data.data.filter(d=>!result.includes(d));

        res.json({result:realresult, info:dataframes_info_for_process(realresult)});
    }else{
        // method, passdata 던져주기
        // const result = spawn(pythonpath,[`./script/processing.py`,`${func}`,`${method}`,`${att}`,[JSON.stringify(passdata)],`${id}`,`${key}`]);
        let options = {
            pythonPath: pythonpath,
            scriptPath: `./script/`,
            args: [`${func}`,`${method}`,`${att}`,`${id}`,`${key}`]
        }

        var pyshell = new PythonShell('processing.py',options);

        pyshell.send(JSON.stringify(passdata));

        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            message = message.replaceAll('None','null');
            message = message.replaceAll('nan','null');
            message = message.replaceAll('NaN','null');
            message = message.replaceAll('Infinity','999999');
            message = JSON.parse(message);
            message = message['result'];
            // console.log(message);
            const returndata = message.map((obj,idx)=>{
                return Object.assign(data.data[idx],obj);
            });
            res.json({result:returndata, info:dataframes_info_for_process(returndata)});
        });

        // end the input stream and allow the process to exit
        pyshell.end(function (err) {
            if (err){
                console.log(err);
                res.json({error:err});
            };
        }
        );
    }
})

app.post ('/api/datasave/:name/:isf',(req,res)=>{ // Dataset 저장 api
    const data = req.body;
    const username = data.id;
    const savedata = data.data;
    const info = data.datainfo;
    const pre = data.pre;
    const key = data.key;
    const isf = Boolean(Number(req.params.isf));
    
    // if(!isf&&fs.existsSync(`./.user/${username}/.data/${req.params.name}.csv`)){
    if(!isf&&fs.existsSync(`./.user/${username}/.data/${req.params.name}`)){
        res.json({error:'exist'});
    }else{
        // 폴더 삭제
        if(fs.existsSync(`./.user/${username}/.data/${req.params.name}`)){
            fs.rmSync(`./.user/${username}/.data/${req.params.name}`,{recursive:true},(err)=>{
                if(err) console.log(err);
            })
        }
        fs.mkdir(`./.user/${username}/.data/${req.params.name}`,(err)=>{
            // if(err) res.json({error:err});
            if(err) console.log(err);
            else{
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}info.json`,info, (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                });
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}_pre.json`,JSON.stringify(pre), (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                });
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}.csv`,'\uFEFF' +convertToCSV(savedata),'utf8', (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                    else {console.log('saved.'); res.json({result:'success'})
                    }
                });
                fs.readdir(`./.user/${username}/.data/.tmp`,(err,files)=>{
                    if(err) res.json({error:err});
                    else{
                        files.map((v,i)=>{
                            if(v.split('_')[0]===key){
                                fs.rename(`./.user/${username}/.data/.tmp/${v}`,`./.user/${username}/.data/${req.params.name}/${v.replace(`${key}_`,'')}`,(err)=>{
                                    if(err) res.json({error:err});
                                }
                                )
                            }
                        })
                    }
                })
            }
        })
    }

})

app.get('/api/region/:regions',(req,res)=>{ // frontend Data>Database 지도 내 위치 표출 위한 위경도 데이터
    const regionId = decodeURI(req.params.regions).split('__');
    const data = regionId.at(2);
    const region = regionId.at(3);
    // 조류 데이터 없음
    const queryT = data.includes('수질')?"nier":data==='기상'?"aws":data==="수문"?"dam":"tmp";

    client.query(`select ${region} from points_${queryT} `, (err, result) => {
        if (err) {
            res.json({error:'no data'})
        } else {
            console.log(result.rows[0][region],result.rows[1][region])
            res.json({lat:Number(result.rows[0][region]), lon:Number(result.rows[1][region])});
        }
    }) 
})

    
// Make Pytorch model
app.post('/api/python/models/:isf',(req,res)=>{
    const data = req.body;
    const projectName = data.prjname;
    const username = data.id;
    const isf = Boolean(Number(req.params.isf)); // 중복되는 이름의 모델이 존재할 때, 강제로 저장할지 여부
    
    if(!isf&&fs.existsSync(`./.user/${username}/.model/${projectName}`)){
        res.json({error:'exist'});
    }else{
        // 폴더 삭제
        if(fs.existsSync(`./.user/${username}/.model/${projectName}`)){
            fs.rmSync(`./.user/${username}/.model/${projectName}`,{recursive:true},(err)=>{
                if(err) console.log(err);
            })
        }
        fs.mkdir(`./.user/${username}/.model/${projectName}`,(err)=>{
            if(err) res.json({error:err});
            else{
                fs.mkdir(`./.user/${username}/.model/${projectName}/.input`,(err)=>{
                    if(err) res.json({error:err});
                });
            }
        });
        const mergeinfo = data.merge;
        data.model.map(d=>{
            if(d.type === 'Merge'){
                d.merge = mergeinfo[d.merge[0]];
            }
        })
        
        fs.writeFile(`./.user/${username}/.model/${projectName}/modelinfo.json`,JSON.stringify(data),(err) => {
            if (err) res.json({error:err});
            else {console.log('saved.');}
        })
        fs.writeFile(`./.user/${username}/.model/${projectName}/status.config`,' ',(err) => {
            if (err) res.json({error:err});
        })

        // ref (가이던스 모델)
        if(data.hasOwnProperty('isref')){
            fs.writeFile(`./.user/${username}/.model/${projectName}/isref.config`,' ',(err) => {
                if (err) res.json({error:err});
                else res.json({result:'success'});
            })
        }else{
            // non-ref
            //data 파이썬 넘겨주기
            const result = spawn(pythonpath,['./script/make_model.py',[username],[projectName]]);
            result.stdout.on('data', function(d) {
                d = iconv.decode(d,'euc-kr');
                console.log(d.toString());
                res.json({result:'success'});
            });
            result.stderr.on('data', function(d) {
                d = iconv.decode(d,'euc-kr');
                console.log(d.toString());
                fs.rmSync(`./.user/${username}/.model/${projectName}`,{recursive:true});
                res.json({error:d.toString()});
            });

        }



    }

})

// user list
app.get('/api/user/list',(req,res)=>{
    fs.readdir('./.user',(error,filelist)=>{
        if(error) res.json({error:error});
        else {
            res.json({result:filelist});
        }
    })
})

// 현재 user 파일 내 모델 정보 get
app.get('/api/user/modellist/:username',(req,res)=>{
    const name = req.params.username;
    fs.readdir(`./.user/${name}/.model`,(error,filelist)=>{
        if(error) res.json({error:error});
        else {
            let result = {};
            filelist.map(d=>{
                fs.readFile(`./.user/${name}/.model/${d}/status.config`,'utf8',(error,data)=>{
                    if(error) res.json({error:error});
                    else {
                        result = {...result,[d]:data};
                        if(Object.keys(result).length === filelist.length){

                            res.json(result);
                        }
                    }
                })
               
            })
        };
    })
})

// 현재 user 파일 내 datalist 정보 get
app.get('/api/user/datalist/:user',(req,res)=>{
    const username = req.params.user;
    fs.readdir(`./.user/${username}/.data`,(error,filelist)=>{
        if(error) res.json({error:error});
        else {
            filelist = filelist.filter(d=>!d.startsWith('.'));
            res.json({data:filelist})
        };
    })
})

// 현재 user 파일 내 datainfo 정보 get
app.get('/api/user/datainfo/:data/:user',(req,res)=>{
    const username = req.params.user;
    const dataname = req.params.data;
    fs.readFile(`./.user/${username}/.data/${dataname}/${dataname}info.json`,(err,data)=>{
        if(err) res.json({error:err});
        else {
            data = JSON.parse(data)
            res.json({data:data});
        }
    })
});

// model train
app.post('/api/python/train', (req,res)=>{
    const data = req.body;
    const user = data.userid;
    const models = data.model;

    models.map((d,idx)=>{
        fs.writeFile(`./.user/${user}/.model/${d}/status.config`,'running',(err) => {
            if (err) console.log(err);
            else {console.log('saved.');}
        })
        
        // ref (가이던스 모델)
        if(fs.existsSync(`./.user/${user}/.model/${d}/isref.config`)){
            fs.writeFile(`./.user/${user}/.model/${d}/log.txt`,' ',(err) => {
                if (err) console.log(err);
            })
            let options = {
                pythonPath:pythonpathforattn,
                scriptPath:'./script/attn/',
                args:[user,d],
                encoding:'utf8',
            }
            let pyshell = new PythonShell('attn.py',options);
            pyshell.on('message',function(message){
                console.log(message);
            })
            pyshell.end(function(err){
                if(err) {
                    console.log(err);
                    // if(!err.includes('Warning')&&!err.includes('warning'))
                    // {
                    fs.writeFile(`./.user/${user}/.model/${d}/status.config`,'error',(err) => {
                        if (err) console.log(err);
                        else {console.log('err.');}
                    })
                    // }
                }
            })
        }

        // non-ref
        else{
            const result = spawn(pythonpath,['./script/training.py',[user],[d]]);
            result.stdout.on('data', function(d) {
                d = iconv.decode(d,'euc-kr');
                console.log(d.toString());

            });
            result.stderr.on('data', function(data) {
                console.log(data.toString());
                fs.writeFile(`./.user/${user}/.model/${d}/status.config`,'error',(err) => {
                    if (err) console.log(err);
                    else {console.log('saved.');}
                })
            });
        }
    })
})

app.post('/api/python/plot',(req,res)=>{ // log 저장
    const data = req.body;
    const user = data.userid;
    const model = data.model;
    if(fs.existsSync(`./.user/${user}/.model/${model}/log.txt`)){
        fs.readFile(`./.user/${user}/.model/${model}/log.txt`,'utf8',(err,data)=>{
            if(err) console.log(err);
            // if(err) res.json({error:err});
            else {
                
                let loss = [];
                let valloss = [];
                let forrefData ='';
                const splitData = data.split('\r\n')
                splitData.pop()
                splitData.shift()
                splitData.map((d,idx)=>{
                    let ds = d.split(',');
                    const pushloss =fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)?Number(ds[2]):Number(ds[1].split(':').at(-1)); 
                    const pushvalloss = fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)?Number(ds[6]):Number(ds[2].split(':').at(-1));
                    loss.push(pushloss);
                    valloss.push(pushvalloss);
                    forrefData = forrefData + `Epoch : ${idx}, Train loss : ${pushloss}, Val loss : ${pushvalloss}\r\n`;

                });
                fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)?res.json({data:forrefData, loss:loss, valloss:valloss}):res.json({data:data, loss:loss, valloss:valloss});
                // res.json({data:data});
            }
        })
    } else {
        res.json({error:'no log file'})
    }
})

app.post('/api/python/yresult',(req,res)=>{ // 학습 결과 return
    const data = req.body;
    const user = data.userid;
    const model = data.model;

    // ref (가이던스 모델의 경우, 학습 시 결과 파일까지 도출함. 파일 읽고 전달만)
    if(fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)){
        if(fs.existsSync(`./.user/${user}/.model/${model}/calresult.json`)){
            fs.readFile(`./.user/${user}/.model/${model}/calresult.json`,'utf8',(err,data)=>{
                if(err) res.json({error:err});
                else {
                    data = data.replaceAll('None','null');
                    data = data.replaceAll('nan','null');
                    data = data.replaceAll('NaN','null');
                    data = data.replaceAll('Infinity','999999');
                    data = JSON.parse(data);
                    if(fs.existsSync(`./.user/${user}/.model/${model}/testresult.json`)){
                        fs.readFile(`./.user/${user}/.model/${model}/testresult.json`,'utf8',(err,d)=>{
                            if(err) res.json({error:err});
                            else {
                                d = d.replaceAll('None','null');
                                d = d.replaceAll('nan','null');
                                d = d.replaceAll('NaN','null');
                                d = d.replaceAll('Infinity','999999');
                                d = JSON.parse(d);
                                const passdatas = PassYresult(d);
                                console.log(passdatas);
                                res.json(passdatas)
                            }
                        })
                    }
                }
            })
        }
        
    }

    // non-ref
    else{
        let options = {
            pythonPath: pythonpath,
            scriptPath: `./script/`,
            args: [`${user}`,`${model}`],
            encoding: 'utf8'
        }

        var pyshell = new PythonShell('test_result.py', options);

        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            message = message.replaceAll('None','null');
            message = message.replaceAll('nan','null');
            message = message.replaceAll('NaN','null');
            message = message.replaceAll('infinity','999999');
            const d = JSON.parse(message);
            const passdatas = PassYresult(d);
            if(!fs.existsSync(`./.user/${user}/.model/${model}/calresult.json`)){
                fs.writeFileSync(`./.user/${user}/.model/${model}/calresult.json`,JSON.stringify({MAPE:d['MAPE'], RMSLE:d['RMSLE'], Cos_sim:d['Cos_sim']}));
            }else{
                fs.readFile(`./.user/${user}/.model/${model}/calresult.json`,'utf8',(err,data)=>{
                    if(err) console.log(err);
                    else {
                        const calresult = JSON.parse(data);
                        if(calresult['MAPE'] != d['MAPE'] || calresult['RMSLE'] != d['RMSLE'] || calresult['Cos_sim'] != d['Cos_sim']){
                            fs.writeFileSync(`./.user/${user}/.model/${model}/calresult.json`,JSON.stringify({MAPE:d['MAPE'], RMSLE:d['RMSLE'], Cos_sim:d['Cos_sim']}));
                        }
                    }
                })
            }
            console.log(passdatas)
            res.json({...passdatas,...{MAPE:d['MAPE'], RMSLE:d['RMSLE'], Cos_sim:d['Cos_sim']}});

        });

        pyshell.end(function (err) {
            if (err){
                console.log(err);
                res.json({error:err});
            };
        });
    }
})

app.post('/api/python/forecast',(req,res)=>{ // 모델 예측
    const data = req.body;
    const user = data.user;
    const models = data.models.map(m=>m.model);
    const creaters = data.models.map(m=>m.creator);
    const std = data.std;
    const end = data.end;
    let results = [];
    models.map((model,idx)=>{
        // ref(가이던스모델)
        if(fs.existsSync(`./.user/${creaters[idx]}/.model/${model}/isref.config`)){
            if(models.length !==1) res.json({error:'ref model은 하나만 선택해주세요.'});
            else if(fs.existsSync(`./.user/${creaters[idx]}/.model/${model}/predictresult.json`)){
                // fs.readFile(`./.user/${user}/.model/${model}/predictresult.json`,'utf8',(err,data)=>{
                fs.readFile(`./.user/${creaters[idx]}/.model/${model}/predictresult.json`,(err,data)=>{
                    if(err) console.log(err);
                    else{
                        const d = JSON.parse(data);
                        const returns = forecastDataForRef(d,std,end);
                        // console.log(returns)
                        res.json(returns);
                    }
                })
            }
        }

        // non-ref
        else{
            let options = {
                pythonPath: pythonpath,
                scriptPath: `./script/`,
                // args: [`${model.creator}`,`${model.model}`,`${std}`,`${end}`],
                args: [`${creaters[idx]}`,`${model}`,`${std}`,`${end}`],
                encoding: 'utf8'
            }

            var pyshell = new PythonShell('forecast.py', options);

            pyshell.on('message', function (message) {
                // received a message sent from the Python script (a simple "print" statement)
                message = message.replaceAll('None','null');
                message = message.replaceAll('nan','null');
                message = message.replaceAll('NaN','null');
                message = message.replaceAll('infinity','999999');
                const d = JSON.parse(message);
                if(Object.values(d).length===0) res.json({error:'no data'})
                else{
                    results.push({model:model, data:d});
                    if(results.length == models.length){
                        const returns = forecastData(results);
                        res.json(returns);
                    }
                }
            });

            pyshell.end(function (err) {
                if (err){
                    console.log(err);
                    res.json({error:err});
                };
            });

        }
    })
})

// model delete
app.delete('/api/user/model',(req,res)=>{
    const data = req.body;
    const user = data.userid;
    const modelnames = data.models;
    modelnames.map(d=>{       
        fs.rmSync(`./.user/${user}/.model/${d}`, { recursive: true }, (err) => {
            if (err) res.json({error:err});
        });
    })
    res.json({result:'success'});
})

app.post('/api/user/config',(req,res)=>{ //모델 train config 저장
    const data = req.body;
    const user = data.userid;
    const model = data.model;
    const config = data.config;
    fs.writeFile(`./.user/${user}/.model/${model}/trainconfig.json`,JSON.stringify(config),(err) => {
        if (err) res.json({error:err});
        else res.json({result:'success'});
    })
})

app.get('/api/user/configlist/:user',(req,res)=>{ // 해당 user 계정에 저장된 model train config file list return
    const user = req.params.user;
    fs.readdir(`./.user/${user}/.model`,(error,filelist)=>{
        if(error) res.json({error:error});
        else {
            filelist = filelist.map(d=>{
                if(fs.existsSync(`./.user/${user}/.model/${d}/trainconfig.json`)){
                    return d;
                }
            }).filter(d=>d);
            let result = {};
            filelist.map(d=>{
                fs.readFile(`./.user/${user}/.model/${d}/trainconfig.json`,'utf8',(err,data)=>{
                    if(err) res.json({error:err});
                    else {
                        data = JSON.parse(data);
                        result[d] = data;
                        if(Object.keys(result).length === filelist.length){
                            res.json(result);
                        }
                    }
                })
            })
        };
    })
})

app.get('/api/user/calresult/:user',(req,res)=>{ // 모델 학습 결과 도출 시 저장딘 모델 성능 파일 load
    const user = req.params.user;
    fs.readdir(`./.user/${user}/.model`,(error,filelist)=>{
        if(error) res.json({error:error});
        else {
            filelist = filelist.map(d=>{
                if(fs.existsSync(`./.user/${user}/.model/${d}/calresult.json`)){
                    return d;
                }
            }).filter(d=>d);
            let result = {};
            filelist.map(d=>{
                fs.readFile(`./.user/${user}/.model/${d}/calresult.json`,'utf8',(err,data)=>{
                    if(err) res.json({error:err});
                    else {
                        data = data.replaceAll('None','null');
                        data = data.replaceAll('nan','null');
                        data = data.replaceAll('NaN','null');
                        data = data.replaceAll('Infinity','999999');
                        data = JSON.parse(data);
                        result[d] = data;
                        if(Object.keys(result).length === filelist.length){
                            res.json(result);
                        }
                    }
                })
            })
        };
    })
})

app.post('/api/share/save',(req,res)=>{ // forecast에 사용할 모델 (Model 화면에서 publish한 모델) 저장
    const data = req.body;
    const user = data.userid;
    const model = data.model;
    fs.readFile('./.share/.savemodel.json','utf8',(err,data)=>{
        // if(err) res.json({error:err});
        if(err) console.log(err);
        else {
            data = JSON.parse(data);
            let result = {};
            model.map(d=>{
                let loss = [];
                let valloss = [];
                fs.readFile(`./.user/${user}/.model/${d}/log.txt`,'utf8',(err,config)=>{
                    if(err) res.json({error:err});
                    else {
                        const splitData = config.split('\r\n')
                        splitData.pop()
                        splitData.shift()
                        splitData.map(d=>{
                            let ds = d.split(',');
                            const pushloss =fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)?Number(ds[2]):Number(ds[1].split(':').at(-1)); 
                            const pushvalloss = fs.existsSync(`./.user/${user}/.model/${model}/isref.config`)?Number(ds[6]):Number(ds[2].split(':').at(-1));
                            loss.push(pushloss);
                            valloss.push(pushvalloss);
                        });
                        fs.readFile(`./.user/${user}/.model/${d}/modelinfo.json`,'utf8',(err,conf)=>{
                            if(err) res.json({error:err});
                            else {
                                conf = JSON.parse(conf);
                                result[d] = {creator:user, loss:loss, valloss:valloss, yval:conf['variable']['out'][0],Date:new Date()};
                            }
                        })
                        if(fs.existsSync(`./.user/${user}/.model/${d}/calresult.json`)){
                            fs.readFile(`./.user/${user}/.model/${d}/calresult.json`,'utf8',(err,conf)=>{
                                if(err) res.json({error:err});
                                else {
                                    conf = JSON.parse(conf);
                                    result[d] = {...result[d],...conf};
                                    if(Object.keys(result).length === model.length){
                                        data = {...data,...result};
                                        fs.writeFile('./.share/.savemodel.json',JSON.stringify(data),(err) => {
                                            if (err) res.json({error:err});
                                        })
                                    }
                                }
                            })
                        }
                    }
                })
            })
        }
    })
    res.json({result:'success'});
})

// share model list
app.get('/api/share/modellist',(req,res)=>{
    fs.readFile('./.share/.savemodel.json','utf8',(err,data)=>{
        if(err) res.json({error:err});
        else {
            data = JSON.parse(data);
            res.json(data);
        }
    })
})


// share model delete
app.delete('/api/share/model',(req,res)=>{
    const data = req.body;
    const modelnames = data.models;
    fs.readFile('./.share/.savemodel.json','utf8',(err,data)=>{
        if(err) res.json({error:err});
        else {
            data = JSON.parse(data);
            modelnames.map(d=>{
                delete data[d];
            })
            fs.writeFile('./.share/.savemodel.json',JSON.stringify(data),(err) => {
                if (err) res.json({error:err});
                else res.json({result:'success'});
            })
        }
    })
})

// share model info
app.post('/api/share/modelinfo',(req,res)=>{
    const data = req.body;
    const model = data.model;
    const creator = data.creator;
    fs.readFile(`./.user/${creator}/.model/${model}/modelinfo.json`,'utf8',(err,data)=>{
        if(err) res.json({error:err});
        else {
            data = JSON.parse(data);
            let tmp = {};
            tmp['dataset'] = data['input'];
            const {out,...input} = data['variable'];
            tmp['input'] = input;
            tmp['output']= out;
            tmp['descript'] = data['descript'];
            tmp['date'] = data['Date'];
            res.json(tmp);
        }
    })
})

// send models
app.post('/api/share/send',(req,res)=>{
    const data = req.body;
    const sendid = data.userid;
    const models = data.model;
    const users = data.user;

    users.map(user=>{
        models.map(model=>{
            fs.readFile(`./.user/${sendid}/.model/${model}/modelinfo.json`,'utf8',(err,data)=>{
                if(err) res.json({error:err});
                else {
                    data = JSON.parse(data);
                    const Dataset = data['input'];
                    fs.cp(`./.user/${sendid}/.data/${Dataset}`,`./.user/${user}/.data/${Dataset}`,{recursive:true},(err)=>{
                        if(err) res.json({error:err});
                    })
                }
            })
            fs.cp(`./.user/${sendid}/.model/${model}`,`./.user/${user}/.model/${model}`,{recursive:true},(err)=>{
                if(err) res.json({error:err});
            })
        })
    })
    res.json({result:'success'});
})

// get ref model list
app.get('/api/share/refmodels',(req,res)=>{
    fs.readdir('./.share/.models',(err,files)=>{
        if(err) res.json({error:err});
        else {
            res.json({data:files});
        }
    })
})

app.get('/api/share/refmodelinfo/:model',(req,res)=>{ // 가이던스 모델 정보 불러오기
    const model = req.params.model;
    fs.readFile(`./.share/.models/${model}/modelinfo.json`,'utf8',(err,data)=>{
        if(err) res.json({error:err});
        else {
            data = JSON.parse(data);
            res.json(data);
        }
    })
})

// validation id and password from postsql database
app.post('/api/auth/login',(req,res)=>{
    const data = req.body;
    const id = data.id;
    const password = data.password;
    var token = null;
    const query = `SELECT user_pw,user_name FROM "nier_user" WHERE "user_id" = '${id}'`;
    client.query(query,(err,result)=>{
        if(err) res.json({error:`qeury read error : ${err}`});
        // if(err) console.log(err);
        else {
            if(result.rows.length === 0){
                res.json({error:'등록되지않은 아이디입니다.'});
            }else{
                // 비밀번호 확인
                const username = result.rows[0].user_name;
                bcrypt.compare(password,result.rows[0].user_pw,(err,result)=>{
                    if(err) {console.log(err); res.json({error:'something wrong'});}
                    else {
                        if(!result) res.json({error:'비밀번호가 틀렸습니다.'});
                        else{
                            // 7일 유효 토큰 발행
                            token = jwt.sign({id:id},secretKey,{expiresIn:'7d'});
                            reftoken = jwt.sign({id:id},refsecretKey,{expiresIn:'7d'});
                            const now = new Date().toISOString();
                            // 토큰 db에 저장
                            client.query(`UPDATE "nier_user" SET ("user_token", "last_date") = ('${token}', '${now}'::TIMESTAMP) WHERE "user_id" = '${id}'`,(err,result)=>{
                                if(err) res.json({error:`db update error : ${err}`});
                                // if(err) console.log(err);
                                else {
                                    // 토큰 쿠키에 저장 후 응답
                                    res.cookie('token',token,{maxAge:1000*60*60*24*7,httpOnly:true});
                                    res.cookie('reftoken',reftoken,{maxAge:1000*60*60*24*7});
                                    res.cookie('name',username,{maxAge:1000*60*60*24*7});
                                    res.cookie('id',id,{maxAge:1000*60*60*24*7});
                                    res.json({result:'success',token:token});
                                }
                            })
                        }
                    }
                })
            }
        }
    })
})

// signup
app.post('/api/auth/signup',(req,res)=>{
    const data = req.body;
    const id = data.id;
    const password = data.password;
    const email = data.email;
    const name = data.name;
    const phone = data.phone? data.phone : null;
    const hashpw = bcrypt.hashSync(password,saltRounds);
    // const hashpw = bcrypt.hashSync(password);
    const now = new Date().toISOString();
    const query = `INSERT INTO "nier_user" ("user_id","user_pw","user_email","user_name","user_address", "join_date") VALUES ('${id}','${hashpw}','${email}','${name}','${phone}', '${now}'::TIMESTAMP)`;
    client.query(query,(err,result)=>{
        if(err) {res.json({error:err}); console.log(err)}
        else {
            fs.mkdir(`./.user/${id}`,(err)=>{
                if(err) console.log(err);
                else {
                    fs.mkdir(`./.user/${id}/.data`,(err)=>{
                        if(err) console.log(err);
                        else {
                            fs.mkdir(`./.user/${id}/.model`,(err)=>{
                                if(err) console.log(err);
                            })
                            fs.mkdir(`./.user/${id}/.data/.tmp`,(err)=>{
                                if(err) console.log(err);
                            })
                            fs.mkdir(`./.share/.notebook/${id}`,(err)=>{
                                if(err) console.log(err);
                                else{
                                    fs.mkdir(`./.share/.notebook/${id}/Models`,(err)=>{
                                        if(err) console.log(err);
                                    })
                                }
                            })
                        }
                    })
                }
            })
            res.json({result:'success'});
        }
    })
})

app.get('/api/auth/signup/checkid/:id',(req,res)=>{ // 아이디 중복 체크
    const id = req.params.id;
    const query = `SELECT * FROM "nier_user" WHERE "user_id" = '${id}'`;
    client.query(query,(err,result)=>{
        if(err) res.json({error:err});
        else {
            if(result.rows.length === 0){
                res.json({result:'success'});
            }else{
                res.json({result:'이미 존재하는 아이디입니다'});
            }
        }
    })
})

// logout
app.get('/api/auth/logout',(req,res)=>{
    // delete cookie
    res.clearCookie('token');
    return res.redirect('/');
})

// check is user admin
app.post('/api/auth/admin',(req,res)=>{
    const data = req.body;
    const id = data.id;

    if(id !== 'admin'){
        res.json({error:'권한이 없습니다.'});
    }else{
        // read cookie
        const cookie = req.cookies;
        const token = cookie.token;

        // check token
        if(!token){
            res.json({error:'not logged in'});
        }else{
            jwt.verify(token,secretKey,(err,decoded)=>{
                if(err) res.json({error:'토큰이 유효하지 않습니다.'});
                else {
                    client.query(`SELECT user_token FROM "nier_user" WHERE "user_id" = 'admin'`,(err,result)=>{
                        if(err) console.log(err);
                        else {
                            if(result.rows.length === 0){
                                res.json({error:'admin 계정이 존재하지 않습니다.'});
                            }else{
                                // compare user token and admin token
                                if(token === result.rows[0].user_token){
                                    res.json({result:'success'});
                                }else{
                                    res.json({error:'권한이 없습니다.'});
                                }
                            }
                        }
                    })
                }
            })
        }
    }
})

// user list
app.post('/api/auth/userlist',(req,res)=>{
    const data = req.body;
    const id = data.id;

    if(id !== 'admin'){
        res.json({error:'권한이 없습니다.'});
    }else{
        client.query(`SELECT user_id, user_name, user_email, user_address, last_date, join_date FROM "nier_user"`,(err,result)=>{
            if(err) res.json({error:`db load error: ${err}`});
            else {
                const users = result.rows.filter((user)=>user.user_id !== 'admin');
                const admin = result.rows.filter((user)=>user.user_id === 'admin');
                admin[0]['id'] = 1;
                users.map((user,idx)=>{user['id'] = idx+2; 
                if(user['last_date']!==null)user['last_date'] = new Date(user['last_date'].setHours(user['last_date'].getHours()+18)).toISOString().split('Z')[0]; 
                user['join_date'] = new Date(user['join_date'].setHours(user['join_date'].getHours()+18)).toISOString().split('Z')[0]; });
                res.json({data:[...admin,...users]});
            }
        })
    }
})

// user info change
app.post('/api/auth/userchange',(req,res)=>{
    const data = req.body;
    const admin = data.isadmin;
    const user_id = data.id;
    const user_password = data.password;
    const user_name = data.name;
    const user_email = data.email;
    const user_address = data.phone;

    const query = user_password!==''?`UPDATE "nier_user" SET user_name = '${user_name}', user_pw = '${bcrypt.hashSync(user_password,saltRounds)}', user_email = '${user_email}', user_address = '${user_address}' WHERE user_id = '${user_id}'`
                                    :`UPDATE "nier_user" SET user_name = '${user_name}', user_email = '${user_email}', user_address = '${user_address}' WHERE user_id = '${user_id}'`

    if(admin !== 'admin'){
        res.json({error:'권한이 없습니다.'});
    }else{
        client.query(query,(err,result)=>{
            if(err) res.json({error:`db update error: ${err}`});
            else {
                res.json({result:'success'});
            }
        })
    }
})

// user delete
app.delete('/api/auth/userdelete',(req,res)=>{
    const data = req.body;
    const admin = data.isadmin;
    const user_id = data.id;

    if(admin !== 'admin'){
        res.json({error:'권한이 없습니다.'});
    }else{
        client.query(`DELETE FROM "nier_user" WHERE user_id = '${user_id}'`,(err,result)=>{
            if(err) res.json({error:`db delete error: ${err}`});
            else {
                if(fs.existsSync(`./.user/${user_id}`)){
                    fs.rmSync(`./.user/${user_id}`,{recursive:true},(err)=>{
                        if(err) console.log(err);
                    })
                    fs.rmSync(`./.share/.notebook/${user_id}`,{recursive:true},(err)=>{
                        if(err) console.log(err);
                    })
                }
                res.json({result:'success'});
            }
        })
    }
})

// user password change
app.post('/api/auth/changepwd',(req,res)=>{
    const data = req.body;
    const id = data.id;
    const password = data.oldpasswd;
    const newpassword = data.newpasswd;

    client.query(`SELECT user_id, user_pw FROM "nier_user" WHERE user_id = '${id}'`,(err,result)=>{
        if(err) res.json({error:`db load error: ${err}`});
        else {
            if(result.rows.length === 0){
                res.json({error:'존재하지 않는 아이디입니다.'});
            }else{
                console.log(password,result.rows[0].user_pw)
                bcrypt.compare(password,result.rows[0].user_pw,(err,rest)=>{
                    if(err) {console.log(err); res.json({error:'something wrong'});}
                    else {
                        if(!rest) res.json({error:'비밀번호가 일치하지 않습니다.'});
                        else {
                            client.query(`UPDATE "nier_user" SET user_pw = '${bcrypt.hashSync(newpassword,saltRounds)}' WHERE user_id = '${id}'`,(err,result)=>{
                            if(err) res.json({error:`db update error: ${err}`});
                            else {
                                res.json({result:'success'});
                            }
                        })
                    }
                }
            })
        }
    }})
})

// user info change
app.post('/api/auth/changeinfo',(req,res)=>{
    const data = req.body;
    const id = data.id;
    const email = data.email;
    const phone = data.phone;

    const query = email!==''&&phone!==''?`UPDATE "nier_user" SET user_email = '${email}', user_address = '${phone}' WHERE user_id = '${id}'`
                                        :email!==''?`UPDATE "nier_user" SET user_email = '${email}' WHERE user_id = '${id}'`
                                        :`UPDATE "nier_user" SET user_address = '${phone}' WHERE user_id = '${id}'`;

    client.query(query,(err,result)=>{
        if(err) res.json({error:`db update error: ${err}`});
        else {
            res.json({result:'success'});
        }
    })
})

/**
 * return server information
 */
app.get('/api/serverinfo/:need',(req,res)=>{
    const need = req.params.need;
    // const request = `wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature && wmic cpu get loadpercentage`
    const request = need==='gpu'? 'nvidia-smi -q | findstr /C:"GPU Current Temp" && nvidia-smi -q | findstr /C:"\%" | findstr /C:"Gpu" && nvidia-smi -q | findstr /C:"Memory" | findstr /C:"\%"'
                                : `wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature && wmic cpu get loadpercentage`
    exec(request, (err,stdout,stderr)=>{
        if (err){
            console.log(err)
            res.json({error:err});
        } else {
            let result = {};
            if(need==='gpu'){const data = stdout.split('\r\n').map((item)=>item.split(':').at(-1).split(' ').at(1)).filter((item)=>item);
            result = {
                temp : Number(data[0]),
                use : Number(data[1]),
                memory : Number(data[2])
            }}else{
                const data = stdout.split('\r\r\n').map((item)=>item.trim()).filter((item)=>item);
                result ={
                    temp : Number(data[1])/100,
                    use : Number(data[3])
                }
            }
            res.json(result);
        }
    })
})

// get the cpu temperature
app.get('/api/cpu/cputemp', (req,res)=>{
    /*
        return cpu-temprature by vcgencmd command
    */
    exec('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', (err,stdout,stderr)=>{
        if (err){
            res.json({error:err});
        } else {
            res.json(stdout);
        }
    })
})



// Build & Connect FrontEnd - >Note : This code must be at the bottom.

app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  });

app.get('/', function(req,res){
    res.sendFile(path.join(__dirname,'../frontend/public/index.html'));
})