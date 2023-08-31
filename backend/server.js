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
const si = require('systeminformation');
const os = require('os-utils');
const crypto = require('crypto');

app.use(express.urlencoded({
    extended: true
}))
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cookieParser());

// User 경로 사용
app.use('/api/menual', express.static(path.join(__dirname, '.file')));
app.use('/api/tile', express.static(path.join(__dirname, 'map/tile')))


// NIER변경
const pythonpath = 'C:\\Users\\user\\Anaconda3\\envs\\nier_env\\python';
const pythonpathforattn = 'C:\\Users\\user\\Anaconda3\\envs\\nier_attn\\python';

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
const makedfQuery = (data) => {
    // allvars 구조
    // allvars: ['수질_골지천1_수온(℃)', '수질_골지천2_수온(℃)']
    
    allvars = [];
    regname = [];
    querys = [];
    tmpobj = {};
    data.data.map((d) => {
        // console.log('allvar', [d[2], d[4], d[6]].join('_'))
        // d[2] = 수질
        // d[4] = 골지천2
        // d[5] = 
        // d[6] == 카드뮴
        allvars.push(`${d[2]}_${d[4]}_${d[6]}`)
        if(!tmpobj.hasOwnProperty(d[7].split('_').slice(0, 2).join('_'))) 
            {tmpobj[d[7].split('_').slice(0, 2).join('_')]=[d[7].split('_').slice(2).join('_')]; regname.push(`${d[2]}_${d[4]}`);}
        else
            tmpobj[d[7].split('_').slice(0, 2).join('_')].push(d[7].split('_').slice(2).join('_'));      
    })
    for (let key in tmpobj){
        const vals = tmpobj[key].join(',');
        // 데이터 조회 쿼리 생성
        k = key.split('_')[0]
        r = key.split('_')[1]
        let sql = ''
        // console.log('vals', vals)
        if (k == '수질'){
            const table = 'V_MSR_WQMN_DAY'
            sql = `
            SELECT WTRSMPLE_DE, ${vals}
            FROM ${table}
            WHERE TO_DATE(WTRSMPLE_DE, 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND WQMN_CODE = '${r}'
            ORDER BY WTRSMPLE_DE
            `
        } else if (k == '수위'){
            const table = 'V_FLU_WLV_DAY'
            sql = `
            SELECT OBSR_DE, ${vals}
            FROM ${table}
            WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
            ORDER BY OBSR_DE
            `
        } else if (k == '강수량'){
            const table = 'V_FLU_GDWETHER_DAY'
            sql = `
            SELECT OBSR_DE, ${vals}
            FROM ${table}
            WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
            ORDER BY OBSR_DE
            `
        } else if (k == '댐'){
            const table = 'V_FLU_DAM_DAY'
            sql = `
            SELECT YEAR || MT || DE, ${vals}
            FROM ${table}
            WHERE TO_DATE(YEAR || MT || DE, 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
            ORDER BY TO_DATE(YEAR || MT || DE, 'YYYYMMDD')
            `
        } else if (k == '유량'){
            const table = 'V_FLU_FLUX_DAY'
            sql = `
            SELECT replace(OBSR_DE, '/', ''), ${vals}
            FROM ${table}
            WHERE TO_DATE(replace(OBSR_DE, '/', ''), 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
            ORDER BY TO_DATE(replace(OBSR_DE, '/', ''), 'YYYYMMDD')
            `
        } else if (k == '조류'){
            const table = 'V_MSR_SWMN_DAY'
            sql = `
            SELECT CHCK_DE, ${vals}
            FROM ${table}
            WHERE TO_DATE(CHCK_DE, 'YYYYMMDD') BETWEEN TO_DATE(${data.stdate}, 'YYYYMMDD') AND TO_DATE(${data.eddate}, 'YYYYMMDD') AND SWMN_CODE = '${r}'
            ORDER BY CHCK_DE
            `
        }
        querys.push(sql)
    }
    return [regname, querys, allvars];
}

const maketreeQuery = (data) => {
    const query = {};
    data.map(d => {
        const tmpd = d.split('__');
        if (tmpd.length !== 4) query[tmpd[1] + "__" + tmpd[2]] = `SELECT * FROM ${d}`;
        else if (tmpd[3] === "0") {
            const subs = data.filter(d => d.includes(tmpd[1] + "__" + tmpd[2]));
            var tmpquery = subs.join('; SELECT * FROM ');
            tmpquery = 'SELECT * FROM ' + tmpquery + ';';
            query[tmpd[1] + "__" + tmpd[2]] = tmpquery;
        }
    })
    return query;
}

const getDates = (std, end) => {

    const dateArray = [];
    let year = std.substring(0, 4);
    let month = std.substring(4, 6);
    let day = std.substring(6, 8);
    let startDate = new Date(`${year}-${month}-${day}`);
    year = end.substring(0, 4);
    month = end.substring(4, 6);
    day = end.substring(6, 8);
    let endDate = new Date(`${year}-${month}-${day}`);
    while (startDate <= endDate) {
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
 * @returns Object for Preprocessing Data
 */
const dataframes = (data) => {
    const result = {};
    const realresult = [];
    const regs = data.vals
    const std = data.dates.start;
    const edd = data.dates.end;
    const alldates = getDates(std, edd);
    const allvars = data.allvars;
    const nulls = [];
    regs.map((r) => {
        if (data[r].length === 0) {
            nulls.push(r);
        }
        data[r].map((d) => {
            tmpvals = Object.keys(d);
            tmpdata = {};
            tmpvals.map((v) => {
                if (v !== '일시') {
                    d[v] = !isNaN(d[v]) ? Number(d[v]) : d[v].trim() === "NaN" ? null : d[v].trim();
                    tmpdata[`${v}`] = d[v];
                }
            });
            if (!result.hasOwnProperty(d['일시'])) {
                result[d['일시']] = tmpdata;
            } else {
                result[d['일시']] = { ...result[d['일시']], ...tmpdata };
            }
        })
    });
    alldates.map((d) => {
        if (!result.hasOwnProperty(d)) {
            result[d] = {};
            allvars.map(v => {
                result[d][v] = null;
            })
        }
        else {
            allvars.map(v => {
                if (!result[d].hasOwnProperty(v)) result[d][v] = null;
            })
        }
    })

    const resultdays = Object.keys(result);
    let tmpR = [];
    resultdays.map((d) => {
        let tmp = { date: d };
        tmpR.push({ ...tmp, ...result[d] });
    })

    const passR = tmpR.sort((a, b) => new Date(a.date) - new Date(b.date));
    passR.map((d, idx) => {
        realresult.push({ ...{ id: idx }, ...d })
    })
    return realresult;
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
const dataframes_info = (data, allvars) => {
    const result = [{ id: "변수갯수" }, { id: "결측치" }, { id: "0건수" }, { id: "최소" }, { id: "최대" }, { id: "평균" }, { id: "표준편차" }];

    allvars.map((r) => {
        const targetData = data.map(d => d[r]);
        obslen = targetData.filter(t => t).length;
        nanlen = targetData.filter(t => t === null || t === undefined).length;
        zerolen = targetData.filter(t => t === 0).length;

        // 최소값
        const filteredArray = targetData.filter(t => t !== null && !isNaN(t))
        const min = Math.min(...filteredArray);
        // 최대값
        const max = Math.max(...filteredArray);
        // 평균값
        const mean = filteredArray.reduce((acc, curr) => acc + curr, 0) / obslen;

        // 표준편차
        const differences = filteredArray.map(num => num - mean);
        const squaredDifferences = differences.map(diff => diff ** 2);
        const meanSquaredDifference = squaredDifferences.reduce((acc, curr) => acc + curr, 0) / squaredDifferences.length;
        standardDeviation = Math.sqrt(meanSquaredDifference);

        tmp = {};
        tmp[r] = obslen;
        result[0] = { ...result[0], ...tmp }
        tmp[r] = nanlen;
        result[1] = { ...result[1], ...tmp }
        tmp[r] = zerolen;
        result[2] = { ...result[2], ...tmp }
        tmp[r] = min;
        result[3] = { ...result[3], ...tmp }
        tmp[r] = max;
        result[4] = { ...result[4], ...tmp }
        tmp[r] = mean;
        result[5] = { ...result[5], ...tmp }
        tmp[r] = standardDeviation;
        result[6] = { ...result[6], ...tmp }

    });
    return result;
}

const dataframes_info_for_process = (data) => { // obs : 관측 데이터, nan : 값이 없는 데이터, zero : 값이 0인 데이터
    const result = [{ id: "변수갯수" }, { id: "결측치" }, { id: "0건수" }, { id: "최소" }, { id: "최대" }, { id: "평균" }, { id: "표준편차" }];
    const tmpdata = [...data];
    const lenmax = tmpdata.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0];
    const regs = Object.keys(lenmax).filter(d => !d.includes('date') && !d.includes('id') && !d.includes('len'));

    regs.map((r) => {
        const targetData = data.map(d => d[r]);
        obslen = targetData.filter(t => t).length;
        nanlen = targetData.filter(t => t === null || t === undefined).length;
        zerolen = targetData.filter(t => t === 0).length;

        // 최소값
        const filteredArray = targetData.filter(t => t !== null && !isNaN(t))
        const min = Math.min(...filteredArray);
        // 최대값
        const max = Math.max(...filteredArray);
        // 평균값
        const mean = filteredArray.reduce((acc, curr) => acc + curr, 0) / obslen;

        // 표준편차
        const differences = filteredArray.map(num => num - mean);
        const squaredDifferences = differences.map(diff => diff ** 2);
        const meanSquaredDifference = squaredDifferences.reduce((acc, curr) => acc + curr, 0) / squaredDifferences.length;
        standardDeviation = Math.sqrt(meanSquaredDifference);

        tmp = {};
        tmp[r] = obslen;
        result[0] = { ...result[0], ...tmp }
        tmp[r] = nanlen;
        result[1] = { ...result[1], ...tmp }
        tmp[r] = zerolen;
        result[2] = { ...result[2], ...tmp }
        tmp[r] = min;
        result[3] = { ...result[3], ...tmp }
        tmp[r] = max;
        result[4] = { ...result[4], ...tmp }
        tmp[r] = mean;
        result[5] = { ...result[5], ...tmp }
        tmp[r] = standardDeviation;
        result[6] = { ...result[6], ...tmp }
    });
    // console.log('result', result)
    return result;
}

/**
 * to pass to python script, make data
 * @param {Object} data from client 
 * @returns object data
 */
const processEncode = (data) => {
    let val = [...data.request];
    val.shift();
    val.shift();
    val = val.map((item) => item.split('_')[0] + '_' + item.split('_')[1] + '_' + item.split('_')[2].replace(/\(.*\)/g, ''));
    const passdata = {};
    passdata['date'] = data.data.map(d => d.date);
    val.map(v => {
        let valdata = [];
        // if(!passdata.hasOwnProperty(v)) passdata[v] = data.data.map(d=>d[v]);
        if (!passdata.hasOwnProperty(v)) {
            data.data.map(d => {
                if (d[v] === null || d[v] === undefined) valdata.push(null);
                else valdata.push(d[v]);
            })
            passdata[v] = valdata;
        }
    })
    return passdata;
}

const convertToCSV = (arr) => { // in Dataprocessing, or forecast, export mui datagrid to csv
    const titles = Object.keys(arr[0]);
    let result = '';
    titles.forEach((title, index) => {
        result += (index !== titles.length - 1 ? `${title},` : `${title}\r\n`);
    })

    arr.forEach((cont, index) => {
        let row = '';
        titles.forEach((title, ind) => {
            row += (ind !== titles.length - 1 ? `${cont[title]},` : `${cont[title]}`);
        })
        result += (index !== arr.length - 1 ? `${row}\r\n` : `${row}`);
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
const forecastData = (data) => {
    let Tresult = [];
    let tmpTresult = {};
    let Gresult = [];
    let Dates = [];
    console.log('425 data', data)
    data.map(d => {
        const model = d.model;
        const vars = Object.keys(d.data['forecast_yhat']);
        console.log('429', vars)
        vars.map(v => {
            const dates = Object.keys(d.data['forecast_yhat'][v]);
            Dates = [...dates];
            const tmpvar = v.split('_').at(-1);
            dates.map(date => {
                if (!tmpTresult[date]) tmpTresult[date] = {};
                if (!tmpTresult[date][`${v}`]) tmpTresult[date][`${v}`] = d.data['forecast_yhat'][v][date];
            })
            Gresult.push([{
                label: `${v}_predict`,
                data: Object.values(d.data['forecast_yhat'][v]),
                type: 'line',
                borderColor: 'rgb(250, 0, 0)',
                backgroundColor: 'rgba(250, 0, 0, 0.5)',
                borderWidth: 1,
                pointRadius: 0.2,
            },
            {
                label:`${v}_y`,
                data:Object.values(d.data['forecast_y'][v]),
                type: 'line',
                borderColor: 'rgb(0, 0, 0)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                pointRadius: 0.2,
            }])
        })
    })
    Dates.map((d, i) => {
        Tresult.push({ id: i, ...tmpTresult[d], date: d });
    })
    Tresult.sort((a, b) => a.date - b.date);
    const result = {
        date: Dates,
        table: Tresult,
        graph: Gresult
    }
    return result;
}

const SeachData = (data, select, search) => { // frontend의 Database 화면, 데이터 검색 기능
    let cpData = [...data];
    if (select === "지역명") {
        data.map((one, oneidx) => {
            one.children.map((two, twoidx) => {
                two.children.map((region, ridx) => {
                    if (!region.label.includes(search))
                        delete cpData[oneidx].children[twoidx].children[ridx];
                })
                cpData[oneidx].children[twoidx].children = cpData[oneidx].children[twoidx].children.filter(d => d !== undefined && d !== null);
                if (cpData[oneidx].children[twoidx].children.length === 0) delete cpData[oneidx].children[twoidx];
            })
            cpData[oneidx].children = cpData[oneidx].children.filter(d => d !== undefined && d !== null);
            if (cpData[oneidx].children.length === 0) delete cpData[oneidx];
        })
        cpData = cpData.filter(d => d !== undefined && d !== null);
        return cpData;
    }
    else if (select === "변수명") {
        data.map((one, oneidx) => {
            one.children.map((two, twoidx) => {
                two.children.map((region, ridx) => {
                    region.children.map((varname, vidx) => {
                        if (!varname.label.includes(search))
                            delete cpData[oneidx].children[twoidx].children[ridx].children[vidx];
                    })
                    cpData[oneidx].children[twoidx].children[ridx].children = cpData[oneidx].children[twoidx].children[ridx].children.filter(d => d !== undefined && d !== null);
                    if (cpData[oneidx].children[twoidx].children[ridx].children.length === 0) delete cpData[oneidx].children[twoidx].children[ridx];
                })
                cpData[oneidx].children[twoidx].children = cpData[oneidx].children[twoidx].children.filter(d => d !== undefined && d !== null);
                if (cpData[oneidx].children[twoidx].children.length === 0) delete cpData[oneidx].children[twoidx];
            })
            cpData[oneidx].children = cpData[oneidx].children.filter(d => d !== undefined && d !== null);
            if (cpData[oneidx].children.length === 0) delete cpData[oneidx];
        })
        cpData = cpData.filter(d => d !== undefined && d !== null);
        return cpData;
    }
}

const PassYresult = (d) => { // Train result format - react-chart.js
    let datasets = {};
    ['test_yhat', 'test_y'].map(da => {
        const regions = Object.keys(d[da]);
        regions.map(k => {
            if (!datasets[k]) datasets[k] = [];
            switch (da) {
                case 'test_yhat':
                    datasets[k].push({
                        label: `${k}_yhat`,
                        data: Object.values(d[da][k]),
                        type: 'line',
                        borderColor: 'rgb(20, 100, 205)',
                        backgroundColor: 'rgba(20, 100, 205, 0.5)',
                        borderWidth: 1,
                        pointRadius: 0.2,
                    });
                    break;
                case 'test_y':
                    datasets[k].push({
                        label: `${k}_y`,
                        data: Object.values(d[da][k]),
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
    return { labels: labels, datasets: datasets };
}

// Using PostgreSQL
const { Client } = require('pg');
const { exec } = require('child_process');

// Using oracle
// const { oracledb  } = require('oracledb');


app.listen(8888, function () {
    console.log('listening on 8888')
});
const dbConfig = require("./dbconfig.js");
// Connect DB
var client = new Client({
    user: 'nier',
    // NIER변경
    host: "localhost",
    database: 'NIERDB',
    // database : 'NIERSYS',
    password: "dkdk123",
    port: 5432,
})

client.connect(err => {
    if (err) {
        console.error('connect DB ERROR', err.stack)
    } else {
        console.log('Success DB connect')
    }
});


const oracledb = require('oracledb');

// API 작성 --> 각 기능을 frontend에서 호출하여 사용

app.get('/api/list/alldata', (req, res) => {

    /* 수계별 데이터 정보 return*/

    client.query("select tablename from PG_TABLES WHERE tablename like 'info__%'", (err, rows) => { // DB info__ 로 시작하는 Table 데이터 정보 get
        if (err) {
            res.json({ error: err });
        } else {
            const data = rows.rows.map(r => r.tablename);
            const result = maketreeQuery(data);
            const regions = Object.keys(result);
            const myresult = {};
            regions.map(r => {
                client.query(result[r], (err, rows) => {
                    if (err) {
                        res.json({ error: err });
                    } else {
                        if (rows.length) {
                            const tmprows = rows.map(row => row.rows);
                            const pushrows = tmprows.reduce((acc, cur) => acc.concat(cur));
                            myresult[r] = pushrows;
                        }
                        else myresult[r] = rows.rows;
                        if (Object.keys(myresult).length === regions.length) {
                            // res.json(myresult);
                            // res.json(myresult['낙동강__수질_주간']);                  
                            // res.json(Object.keys(myresult));   

                            const passResult = {};
                            const keys = Object.keys(myresult);
                            keys.map(k => {
                                const target = k.includes('금강') ? '금강' : k.includes('한강') ? '한강' : k.includes('낙동강') ? '낙동강' : '영산강';
                                if (!passResult.hasOwnProperty(target)) passResult[target] = { 'regionNum': 0, 'valueNum': 0 }; // 수계별 지역 수, 변수 수 저장
                                const subKeys = Object.keys(myresult[k][0]);
                                passResult[target]['regionNum'] += subKeys.length;
                                let tmplen = 0;
                                subKeys.map(sk => {
                                    let lens = myresult[k].filter(d => d[sk] !== null || d[sk] !== undefined || !d[sk].includes("NaN") || !d[sk].includes('NULL')).length;
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

app.get('/api/tree/com_code', async (req, res) => {
    try {
        // Oracle 데이터베이스 연결
        const connection = await oracledb.getConnection(dbConfig);
        // sql = `SELECT CODE_NO, UPPER_CODE_NO, CODE, CODE_NM
        // FROM V_WRSSM_SEARCH
        // START WITH CODE_NO IN (1, 2, 3, 4)
        // CONNECT BY PRIOR CODE_NO = UPPER_CODE_NO`

        sql = `SELECT UPPER_CODE, CODE, CODE_NM
        FROM V_WRSSM_SEARCH
        START WITH UPPER_CODE = '0'
        CONNECT BY PRIOR CODE = UPPER_CODE
        ORDER BY LV, SORT`
        // 쿼리 실행
        const result = await connection.execute(sql);

        // 연결 종료
        // await connection.close();

        // console.log(result); // 결과를 콘솔에 출력
        let nodes = [];
        result.rows.forEach(data => {
            const node = {
                value: '수질_' + data[1],
                label: data[2],
                children: [],
                tmp_value: data[1],
            };

            const parentNode = findParentNode(data[0], nodes);
            if (parentNode) {
                parentNode.children.push(node);
            } else {
                nodes.push(node);
            }
            function findParentNode(upperCodeNo, nodes) {
                for (const node of nodes) {
                    if (node.tmp_value == upperCodeNo) {
                        return node;
                    }
                    const foundNode = findParentNode(upperCodeNo, node.children);
                    if (foundNode) {
                        return foundNode;
                    }
                }
                return null;
            }
        });

        const removeCodeKeys = (obj) => {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(removeCodeKeys);
            }

            const updatedObj = {};
            for (const key in obj) {
                if (key !== 'tmp_value') {
                    updatedObj[key] = removeCodeKeys(obj[key]);
                }
            }
            return updatedObj;
        };

        // 'code' 키를 삭제한 새로운 객체를 생성
        nodes = removeCodeKeys(nodes);
        // console.log('updatedData', updatedData)

        // 'children' 길이가 0인거
        const findEmptyLabel = (nodes) => {
            const emptyLabels = [];

            const traverseNodes = (nodes) => {
                for (const node of nodes) {
                    if (node.children.length === 0) {
                        emptyLabels.push(node);
                    } else {
                        traverseNodes(node.children);
                    }
                }
            };

            traverseNodes(nodes);

            return emptyLabels;
        };
        const waterName = require('./waterName.js')
        const emptyNodes = findEmptyLabel(nodes);
        for (const emptyNode of emptyNodes) {
            const att_list = [];
            const att_wqmn = ["IEM_1060", "IEM_1054", "IEM_1052", "IEM_1049", "IEM_1053", "IEM_1055", "IEM_1056", "IEM_1073", "IEM_1039", "IEM_1016", "IEM_1050", "IEM_1002", "IEM_1014", "IEM_1010", "IEM_1005", "IEM_1011", "IEM_1007", "IEM_1009", "IEM_1061", "IEM_1040", "IEM_1057", "IEM_1095", "IEM_1096", "IEM_1097", "IEM_1066", "IEM_1012", "IEM_1013", "IEM_1067", "IEM_1065", "IEM_1063", "IEM_1094", "IEM_1004", "IEM_1006", "IEM_1037", "IEM_1064", "IEM_1044", "IEM_1043", "IEM_1038", "IEM_1023", "IEM_1022", "IEM_1030", "IEM_1071", "IEM_1025", "IEM_1051", "IEM_1048", "IEM_1083", "IEM_1072", "IEM_1082", "IEM_1086", "IEM_1062", "IEM_1059", "IEM_1093"]
            att_wqmn.forEach(row => {
                const att_node = {
                    value: emptyNode.value + '_' + row,
                    label: waterName[row] || row
                };
                att_list.push(att_node);
            });
            emptyNode.children = att_list
        }

        // 부모 노드
        const parentLabels = ['한강', '낙동강', '금강', '영산강']
        const parentNodeList = []
        for (const parentLabel of parentLabels) {
            const parentNode = {
                value: parentLabel,
                label: parentLabel,
                children: [],
            }
            parentNodeList.push(parentNode)
        }

        // 자식 노드
        const childLabels = ['수질', '수위', '강수량', '댐', '유량', '조류'];
        for (const parentNode of parentNodeList) {
            for (const childLabel of childLabels) {
                const childNode = {
                    value: `${parentNode.label}_${childLabel}`,
                    label: childLabel,
                    children: [],
                };
                parentNode.children.push(childNode);
            }
        }
        // 수질
        //  - 한강
        parentNodeList[0].children[0].children = nodes[0].children
        //  - 낙동강
        parentNodeList[1].children[0].children = nodes[1].children
        //  - 금강
        parentNodeList[2].children[0].children = nodes[2].children
        //  - 영산강
        parentNodeList[3].children[0].children = nodes[3].children

        // // 수위
        // //  - 한강
        // wlv_r01_10_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R01_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // wlv_r01_11_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R01_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // wlv_r01_12_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R01_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // wlv_r01_13_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R01_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // - 낙동강
        // // 낙동강
        // wlv_r02_20_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 형산강
        // wlv_r02_21_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 태화강
        // wlv_r02_22_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 회야, 수영강
        // wlv_r02_23_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`
        
        // // 낙동강동해
        // wlv_r02_24_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 낙동강남해
        // wlv_r02_25_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R02_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // - 금강
        // // 금강
        // wlv_r03_30_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R03_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 삽교천
        // wlv_r03_31_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R03_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 금강서해
        // wlv_r03_32_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R03_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 만경, 동진
        // wlv_r03_33_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R03_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // - 영산강
        // // 섬진강
        // wlv_r04_40_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 섬진강남해
        // wlv_r04_41_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 영산강
        // wlv_r04_50_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 탐진강
        // wlv_r04_51_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC`

        // // 영산강남해
        // wlv_r04_52_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC
        // `

        // // 영산강서해
        // wlv_r04_53_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC
        // `

        // // 영산강서해
        // wlv_r04_53_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC
        // `

        // // 제주도
        // wlv_r04_60_sql = `SELECT OBSRVT_CODE, OBSRVT_NM
        // FROM V_FLU_WLV_R04_SEARCH
        // ORDER BY OBSRVT_NM ASC
        // `

        // r01_wlv = [
        //     {'value': '수위_10', 'label': '한강'},
        //     {'value': '수위_11', 'label': '안성천'},
        //     {'value': '수위_12', 'label': '한강서해'},
        //     {'value': '수위_13', 'label': '한강동해'}
        // ]

        // const result_wlv_r01_10 = await connection.execute(wlv_r01_10_sql);
        // // const result_wlv_r01_11 = await connection.execute(wlv_r01_11_sql);
        // // const result_wlv_r01_12 = await connection.execute(wlv_r01_12_sql);
        // // const result_wlv_r01_13 = await connection.execute(wlv_r01_13_sql);
        // const result_wlv_r02 = await connection.execute(wlv_r02_20_sql);
        // const result_wlv_r03 = await connection.execute(wlv_r03_30_sql);
        // const result_wlv_r04 = await connection.execute(wlv_r04_40_sql);

        // // 연결 종료
        // // await connection.close();

        // // console.log(result); // 결과를 콘솔에 출력
        // let nodes_wlv_r01_10 = [];
        // result_wlv_r01_10.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r01_10.push(node)
        // });
        // r01_wlv[0]['children'] = nodes_wlv_r01_10
        
        // let nodes_wlv_r01_11 = [];
        // result_wlv_r01_11.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r01_11.push(node)
        // });
        // r01_wlv[1]['children'] = nodes_wlv_r01_11

        // let nodes_wlv_r01_12 = [];
        // result_wlv_r01_12.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r01_12.push(node)
        // });
        // r01_wlv[2]['children'] = nodes_wlv_r01_12

        // let nodes_wlv_r01_13 = [];
        // result_wlv_r01_13.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r01_13.push(node)
        // });
        // r01_wlv[3]['children'] = nodes_wlv_r01_13

        // let nodes_wlv_r02 = [];
        // result_wlv_r02.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r02.push(node)
        // });
        // r01_wlv[1]['children'] = nodes_wlv_r02
        // let nodes_wlv_r03 = [];
        // result_wlv_r03.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r03.push(node)
        // });
        // r01_wlv[2]['children'] = nodes_wlv_r03
        // let nodes_wlv_r04 = [];
        // result_wlv_r04.rows.forEach(data => {
        //     const node = {
        //         value: '수위_' + data[0],
        //         label: data[1],
        //         children: [],
        //     };
        //     nodes_wlv_r04.push(node)
        // });
        // r01_wlv[3]['children'] = nodes_wlv_r04
        // console.log('803 r01_wlv[0]', r01_wlv[0])
        r01_wlv = [{
            'value': '수위_10',
            'label': '한강',
            'children': [{ 'value': '수위_1003635', 'label': '가대교', 'children': [] },
            { 'value': '수위_1013655', 'label': '가평군(가평교)', 'children': [] },
            { 'value': '수위_1015645', 'label': '가평군(대성리)', 'children': [] },
            { 'value': '수위_1015644', 'label': '가평군(청평교)', 'children': [] },
            { 'value': '수위_1015640', 'label': '가평군(청평댐)', 'children': [] },
            { 'value': '수위_1013652', 'label': '가평천', 'children': [] },
            { 'value': '수위_1007633', 'label': '강천보(상류)', 'children': [] },
            { 'value': '수위_1007634', 'label': '강천보(하류)', 'children': [] },
            { 'value': '수위_2503650', 'label': '거제시(구천교)', 'children': [] },
            { 'value': '수위_1016655', 'label': '경안교', 'children': [] },
            { 'value': '수위_1019648', 'label': '계양대교', 'children': [] },
            { 'value': '수위_1004630', 'label': '고성교', 'children': [] },
            { 'value': '수위_1018605', 'label': '고안(등록문화재)', 'children': [] },
            { 'value': '수위_1018693', 'label': '광명시(시흥대교)', 'children': [] },
            { 'value': '수위_1016650', 'label': '광주시(경안교)', 'children': [] },
            { 'value': '수위_1016695', 'label': '광주시(광동교)', 'children': [] },
            { 'value': '수위_1016670', 'label': '광주시(서하교)', 'children': [] },
            { 'value': '수위_1016660', 'label': '광주시(섬뜰교)', 'children': [] },
            { 'value': '수위_1004693', 'label': '괴산군(목도교)', 'children': [] },
            { 'value': '수위_1004646', 'label': '괴산군(비도교)', 'children': [] },
            { 'value': '수위_1004645', 'label': '괴산군(수전교)', 'children': [] },
            { 'value': '수위_1004670', 'label': '괴산군(추산교)', 'children': [] },
            { 'value': '수위_1004643', 'label': '괴산댐', 'children': [] },
            { 'value': '수위_1019640', 'label': '굴포천(내)', 'children': [] },
            { 'value': '수위_1019660', 'label': '굴포천(한강)', 'children': [] },
            { 'value': '수위_1019650', 'label': '굴현교', 'children': [] },
            { 'value': '수위_1019645', 'label': '굴현보(상)', 'children': [] },
            { 'value': '수위_1019655', 'label': '굴현보(하)', 'children': [] },
            { 'value': '수위_1022664', 'label': '궁신교', 'children': [] },
            { 'value': '수위_1019651', 'label': '귤현보(상)', 'children': [] },
            { 'value': '수위_1019652', 'label': '귤현보(하)', 'children': [] },
            { 'value': '수위_1019675', 'label': '김포시(전류리)', 'children': [] },
            { 'value': '수위_1018625', 'label': '남양주시(내곡교)', 'children': [] },
            { 'value': '수위_1018620', 'label': '남양주시(부평교)', 'children': [] },
            { 'value': '수위_1015680', 'label': '남양주시(삼봉리)', 'children': [] },
            { 'value': '수위_1018623', 'label': '남양주시(연평대교)', 'children': [] },
            { 'value': '수위_1018638', 'label': '남양주시(왕숙교)', 'children': [] },
            { 'value': '수위_1018630', 'label': '남양주시(진관교)', 'children': [] },
            { 'value': '수위_1018635', 'label': '남양주시(퇴계원리)', 'children': [] },
            { 'value': '수위_1018610', 'label': '남양주시(팔당대교)', 'children': [] },
            { 'value': '수위_1017690', 'label': '남양주시(팔당댐)', 'children': [] },
            { 'value': '수위_1010642', 'label': '남전교', 'children': [] },
            { 'value': '수위_1007630', 'label': '남한강', 'children': [] },
            { 'value': '수위_1003650', 'label': '단양1', 'children': [] },
            { 'value': '수위_1003640', 'label': '단양2', 'children': [] },
            { 'value': '수위_1003636', 'label': '단양군(가대교)', 'children': [] },
            { 'value': '수위_1003645', 'label': '단양군(단양1교)', 'children': [] },
            { 'value': '수위_1003642', 'label': '단양군(덕천교)', 'children': [] },
            { 'value': '수위_1003630', 'label': '단양군(오사리)', 'children': [] },
            { 'value': '수위_1002630', 'label': '대화', 'children': [] },
            { 'value': '수위_4009638', 'label': '대화', 'children': [] },
            { 'value': '수위_1022668', 'label': '동두천시(송천교)', 'children': [] },
            { 'value': '수위_1018664', 'label': '뚝도', 'children': [] },
            { 'value': '수위_1003662', 'label': '명서교', 'children': [] },
            { 'value': '수위_1013620', 'label': '목동교', 'children': [] },
            { 'value': '수위_1019647', 'label': '박촌1교', 'children': [] },
            { 'value': '수위_1022659', 'label': '백의교', 'children': [] },
            { 'value': '수위_1019653', 'label': '벌말교', 'children': [] },
            { 'value': '수위_1019620', 'label': '부천시(도두리2교)', 'children': [] },
            { 'value': '수위_1021670', 'label': '북삼', 'children': [] },
            { 'value': '수위_1011650', 'label': '북천', 'children': [] },
            { 'value': '수위_1015630', 'label': '산장제1교', 'children': [] },
            { 'value': '수위_1001615', 'label': '삼척시(갈밭교)', 'children': [] },
            { 'value': '수위_1001613', 'label': '삼척시(광동교)', 'children': [] },
            { 'value': '수위_1001610', 'label': '삼척시(광동댐)', 'children': [] },
            { 'value': '수위_1001607', 'label': '삼척시(번천교)', 'children': [] },
            { 'value': '수위_1003644', 'label': '상진교', 'children': [] },
            { 'value': '수위_1018640', 'label': '서울시(광진교)', 'children': [] },
            { 'value': '수위_1018695', 'label': '서울시(너부대교)', 'children': [] },
            { 'value': '수위_1018655', 'label': '서울시(대곡교)', 'children': [] },
            { 'value': '수위_1018658', 'label': '서울시(대치교)', 'children': [] },
            { 'value': '수위_1018697', 'label': '서울시(오금교)', 'children': [] },
            { 'value': '수위_4007618', 'label': '서울시(오금교)', 'children': [] },
            { 'value': '수위_1018670', 'label': '서울시(월계2교)', 'children': [] },
            { 'value': '수위_1018680', 'label': '서울시(잠수교)', 'children': [] },
            { 'value': '수위_1018675', 'label': '서울시(중랑교)', 'children': [] },
            { 'value': '수위_1018669', 'label': '서울시(창동교)', 'children': [] },
            { 'value': '수위_1018662', 'label': '서울시(청담대교)', 'children': [] },
            { 'value': '수위_1018683', 'label': '서울시(한강대교)', 'children': [] },
            { 'value': '수위_1019630', 'label': '서울시(행주대교)', 'children': [] },
            { 'value': '수위_1006667', 'label': '섬강교', 'children': [] },
            { 'value': '수위_1018650', 'label': '성남시(궁내교)', 'children': [] },
            { 'value': '수위_1012690', 'label': '소양강', 'children': [] },
            { 'value': '수위_1001605', 'label': '송천1교', 'children': [] },
            { 'value': '수위_1019635', 'label': '아라한강갑문(내)', 'children': [] },
            { 'value': '수위_1019637', 'label': '아라한강갑문(외)', 'children': [] },
            { 'value': '수위_1019636', 'label': '아라한강갑실', 'children': [] },
            { 'value': '수위_1007604', 'label': '안성시(한평교)', 'children': [] },
            { 'value': '수위_1018690', 'label': '안양시(충훈1교)', 'children': [] },
            { 'value': '수위_1007672', 'label': '약수교', 'children': [] },
            { 'value': '수위_1010630', 'label': '약수교', 'children': [] },
            { 'value': '수위_1010640', 'label': '양구군(각시교)', 'children': [] },
            { 'value': '수위_1007690', 'label': '양평군(봉상교)', 'children': [] },
            { 'value': '수위_1007697', 'label': '양평군(신원리)', 'children': [] },
            { 'value': '수위_1007685', 'label': '양평군(양평교)', 'children': [] },
            { 'value': '수위_1007680', 'label': '양평군(흑천교)', 'children': [] },
            { 'value': '수위_1007639', 'label': '여주보(상류)', 'children': [] },
            { 'value': '수위_1007641', 'label': '여주보(하류)', 'children': [] },
            { 'value': '수위_1007620', 'label': '여주시(강천리)', 'children': [] },
            { 'value': '수위_1007625', 'label': '여주시(남한강교)', 'children': [] },
            { 'value': '수위_1007617', 'label': '여주시(삼합교)', 'children': [] },
            { 'value': '수위_1007655', 'label': '여주시(양촌교)', 'children': [] },
            { 'value': '수위_1007635', 'label': '여주시(여주대교)', 'children': [] },
            { 'value': '수위_1007615', 'label': '여주시(원부교)', 'children': [] },
            { 'value': '수위_1007640', 'label': '여주시(율극교)', 'children': [] },
            { 'value': '수위_1007660', 'label': '여주시(이포대교)', 'children': [] },
            { 'value': '수위_1007650', 'label': '여주시(흥천대교)', 'children': [] },
            { 'value': '수위_1007656', 'label': '여주저류지', 'children': [] },
            { 'value': '수위_1022666', 'label': '연천군(고탄교)', 'children': [] },
            { 'value': '수위_1021660', 'label': '연천군(군남댐)', 'children': [] },
            { 'value': '수위_1022665', 'label': '연천군(궁신교)', 'children': [] },
            { 'value': '수위_1022680', 'label': '연천군(사랑교)', 'children': [] },
            { 'value': '수위_1023662', 'label': '연천군(사미천교)', 'children': [] },
            { 'value': '수위_1023640', 'label': '연천군(삼화교)', 'children': [] },
            { 'value': '수위_1022670', 'label': '연천군(신천교)', 'children': [] },
            { 'value': '수위_1021680', 'label': '연천군(임진교)', 'children': [] },
            { 'value': '수위_1022662', 'label': '연천군(차탄교)', 'children': [] },
            { 'value': '수위_1021650', 'label': '연천군(필승교)', 'children': [] },
            { 'value': '수위_1022645', 'label': '연천군(한여울교)', 'children': [] },
            { 'value': '수위_1022644', 'label': '연천군(한탄강댐)', 'children': [] },
            { 'value': '수위_1001680', 'label': '영월2', 'children': [] },
            { 'value': '수위_1001670', 'label': '영월군(거운교)', 'children': [] },
            { 'value': '수위_1002680', 'label': '영월군(두학교)', 'children': [] },
            { 'value': '수위_1002695', 'label': '영월군(북쌍리)', 'children': [] },
            { 'value': '수위_1001683', 'label': '영월군(삼옥교)', 'children': [] },
            { 'value': '수위_1002687', 'label': '영월군(신천교)', 'children': [] },
            { 'value': '수위_1001690', 'label': '영월군(영월대교)', 'children': [] },
            { 'value': '수위_1003620', 'label': '영월군(옥동교)', 'children': [] },
            { 'value': '수위_1002685', 'label': '영월군(주천교)', 'children': [] },
            { 'value': '수위_1003605', 'label': '영월군(충혼교)', 'children': [] },
            { 'value': '수위_1002655', 'label': '영월군(판운교)', 'children': [] },
            { 'value': '수위_1002698', 'label': '영월군(팔괴교)', 'children': [] },
            { 'value': '수위_1010684', 'label': '오탄교', 'children': [] },
            { 'value': '수위_1004692', 'label': '용당', 'children': [] },
            { 'value': '수위_1010677', 'label': '용신교', 'children': [] },
            { 'value': '수위_1016607', 'label': '용인시(월촌교)', 'children': [] },
            { 'value': '수위_1003646', 'label': '우화교', 'children': [] },
            { 'value': '수위_1004688', 'label': '원남', 'children': [] },
            { 'value': '수위_1005697', 'label': '원주시(남한강대교)', 'children': [] },
            { 'value': '수위_1006690', 'label': '원주시(문막교)', 'children': [] },
            { 'value': '수위_1005695', 'label': '원주시(법천교)', 'children': [] },
            { 'value': '수위_1006670', 'label': '원주시(옥산교)', 'children': [] },
            { 'value': '수위_1006665', 'label': '원주시(원주교)', 'children': [] },
            { 'value': '수위_1006672', 'label': '원주시(장현교)', 'children': [] },
            { 'value': '수위_1006680', 'label': '원주시(지정대교)', 'children': [] },
            { 'value': '수위_1003668', 'label': '월악', 'children': [] },
            { 'value': '수위_1007610', 'label': '음성군(총천교)', 'children': [] },
            { 'value': '수위_1013635', 'label': '의암댐', 'children': [] },
            { 'value': '수위_1018665', 'label': '의정부시(신곡교)', 'children': [] },
            { 'value': '수위_1007645', 'label': '이천시(복하교)', 'children': [] },
            { 'value': '수위_1007605', 'label': '이천시(장호원교)', 'children': [] },
            { 'value': '수위_1007662', 'label': '이포보(상류)', 'children': [] },
            { 'value': '수위_1007664', 'label': '이포보(하류)', 'children': [] },
            { 'value': '수위_1011693', 'label': '인제군(도리촌교)', 'children': [] },
            { 'value': '수위_1011695', 'label': '인제군(리빙스턴교)', 'children': [] },
            { 'value': '수위_1011620', 'label': '인제군(반월촌교)', 'children': [] },
            { 'value': '수위_1012657', 'label': '인제군(사구미교)', 'children': [] },
            { 'value': '수위_1012670', 'label': '인제군(양구대교)', 'children': [] },
            { 'value': '수위_1012635', 'label': '인제군(양지교)', 'children': [] },
            { 'value': '수위_1012630', 'label': '인제군(왕성동교)', 'children': [] },
            { 'value': '수위_1012650', 'label': '인제군(원대교)', 'children': [] },
            { 'value': '수위_1011690', 'label': '인제군(월학리)', 'children': [] },
            { 'value': '수위_1012645', 'label': '인제군(하죽천교)', 'children': [] },
            { 'value': '수위_1012640', 'label': '인제군(현리교)', 'children': [] },
            { 'value': '수위_1018645', 'label': '자양', 'children': [] },
            { 'value': '수위_1001647', 'label': '정선1', 'children': [] },
            { 'value': '수위_1001640', 'label': '정선3', 'children': [] },
            { 'value': '수위_1001658', 'label': '정선군(광하교)', 'children': [] },
            { 'value': '수위_1001630', 'label': '정선군(나전교)', 'children': [] },
            { 'value': '수위_1001660', 'label': '정선군(낙동교)', 'children': [] },
            { 'value': '수위_1001629', 'label': '정선군(남평대교)', 'children': [] },
            { 'value': '수위_1001620', 'label': '정선군(송계교)', 'children': [] },
            { 'value': '수위_1001625', 'label': '정선군(송천교)', 'children': [] },
            { 'value': '수위_1001649', 'label': '정선군(애산교)', 'children': [] },
            { 'value': '수위_1001645', 'label': '정선군(와평교)', 'children': [] },
            { 'value': '수위_1001655', 'label': '정선군(정선제1교)', 'children': [] },
            { 'value': '수위_1001626', 'label': '정선군(제1여량교)', 'children': [] },
            { 'value': '수위_1001622', 'label': '정선군(혈천교)', 'children': [] },
            { 'value': '수위_1003661', 'label': '제천시(구곡교)', 'children': [] },
            { 'value': '수위_1003655', 'label': '제천시(물태리)', 'children': [] },
            { 'value': '수위_1003658', 'label': '제천시(부수동교)', 'children': [] },
            { 'value': '수위_1003660', 'label': '제천시(팔송교)', 'children': [] },
            { 'value': '수위_1012688', 'label': '지내', 'children': [] },
            { 'value': '수위_1022638', 'label': '철원군(군탄교)', 'children': [] },
            { 'value': '수위_1022630', 'label': '철원군(삼합교)', 'children': [] },
            { 'value': '수위_1022626', 'label': '철원군(장수대교)', 'children': [] },
            { 'value': '수위_1022635', 'label': '철원군(한탄대교)', 'children': [] },
            { 'value': '수위_1004620', 'label': '청주시(옥화1교)', 'children': [] },
            { 'value': '수위_1015639', 'label': '청평댐', 'children': [] },
            { 'value': '수위_1012695', 'label': '춘천2', 'children': [] },
            { 'value': '수위_1010688', 'label': '춘천댐', 'children': [] },
            { 'value': '수위_1013645', 'label': '춘천시(강촌교)', 'children': [] },
            { 'value': '수위_1013637', 'label': '춘천시(소양2교)', 'children': [] },
            { 'value': '수위_1012680', 'label': '춘천시(소양강댐)', 'children': [] },
            { 'value': '수위_1012682', 'label': '춘천시(소양강댐방수로)', 'children': [] },
            { 'value': '수위_1012685', 'label': '춘천시(천전리)', 'children': [] },
            { 'value': '수위_1010690', 'label': '춘천시(춘천댐)', 'children': [] },
            { 'value': '수위_1010695', 'label': '춘천시(춘천댐하류)', 'children': [] },
            { 'value': '수위_1003680', 'label': '충주1', 'children': [] },
            { 'value': '수위_1003664', 'label': '충주본댐우안', 'children': [] },
            { 'value': '수위_1004695', 'label': '충주시(국원대교)', 'children': [] },
            { 'value': '수위_1005640', 'label': '충주시(목계교)', 'children': [] },
            { 'value': '수위_1004680', 'label': '충주시(문강교)', 'children': [] },
            { 'value': '수위_1003666', 'label': '충주시(충주댐)', 'children': [] },
            { 'value': '수위_1003665', 'label': '충주시(충주댐방수로)', 'children': [] },
            { 'value': '수위_1005635', 'label': '충주시(충주조정지댐)', 'children': [] },
            { 'value': '수위_1005620', 'label': '충주시(충주조정지댐방수로)', 'children': [] },
            { 'value': '수위_1005605', 'label': '충주시(탄금교)', 'children': [] },
            { 'value': '수위_1004690', 'label': '충주시(향산리)', 'children': [] },
            { 'value': '수위_1001603', 'label': '태백시(무사교)', 'children': [] },
            { 'value': '수위_1022631', 'label': '토교', 'children': [] },
            { 'value': '수위_1019680', 'label': '파주시(교하교)', 'children': [] },
            { 'value': '수위_1023660', 'label': '파주시(비룡대교)', 'children': [] },
            { 'value': '수위_8000004', 'label': '파주시(비룡대교)', 'children': [] },
            { 'value': '수위_1023680', 'label': '파주시(아가메교)', 'children': [] },
            { 'value': '수위_1023670', 'label': '파주시(통일대교)', 'children': [] },
            { 'value': '수위_1017678', 'label': '팔당댐', 'children': [] },
            { 'value': '수위_1004685', 'label': '팔봉교', 'children': [] },
            { 'value': '수위_1002615', 'label': '평창군(백옥포교)', 'children': [] },
            { 'value': '수위_1002635', 'label': '평창군(사초교)', 'children': [] },
            { 'value': '수위_1002640', 'label': '평창군(상방림교)', 'children': [] },
            { 'value': '수위_1002625', 'label': '평창군(선애교)', 'children': [] },
            { 'value': '수위_1001602', 'label': '평창군(송정교)', 'children': [] },
            { 'value': '수위_1002605', 'label': '평창군(이목정교)', 'children': [] },
            { 'value': '수위_1002610', 'label': '평창군(장평교)', 'children': [] },
            { 'value': '수위_1002650', 'label': '평창군(평창교)', 'children': [] },
            { 'value': '수위_1022642', 'label': '포천시(대회산교)', 'children': [] },
            { 'value': '수위_1022655', 'label': '포천시(신백의교)', 'children': [] },
            { 'value': '수위_8888888', 'label': '포천시(신백의교)', 'children': [] },
            { 'value': '수위_1022643', 'label': '포천시(영로대교)', 'children': [] },
            { 'value': '수위_1022650', 'label': '포천시(영평교)', 'children': [] },
            { 'value': '수위_1022640', 'label': '포천시(용담교)', 'children': [] },
            { 'value': '수위_1022648', 'label': '포천시(은현교)', 'children': [] },
            { 'value': '수위_1010635', 'label': '하리교', 'children': [] },
            { 'value': '수위_1014695', 'label': '한덕교', 'children': [] },
            { 'value': '수위_1018628', 'label': '행주(등록문화재)', 'children': [] },
            { 'value': '수위_1014648', 'label': '홍천강(남산교)', 'children': [] },
            { 'value': '수위_1014635', 'label': '홍천강(성포교)', 'children': [] },
            { 'value': '수위_1014640', 'label': '홍천군(굴운교)', 'children': [] },
            { 'value': '수위_1014665', 'label': '홍천군(남노일대교)', 'children': [] },
            { 'value': '수위_1014696', 'label': '홍천군(모곡교)', 'children': [] },
            { 'value': '수위_1014680', 'label': '홍천군(반곡교)', 'children': [] },
            { 'value': '수위_1014620', 'label': '홍천군(용선교)', 'children': [] },
            { 'value': '수위_1014630', 'label': '홍천군(주음치교)', 'children': [] },
            { 'value': '수위_1014650', 'label': '홍천군(홍천교)', 'children': [] },
            { 'value': '수위_1010670', 'label': '화천군(오작교)', 'children': [] },
            { 'value': '수위_1004653', 'label': '화천군(평화나래교)', 'children': [] },
            { 'value': '수위_1009652', 'label': '화천군(평화나래교)', 'children': [] },
            { 'value': '수위_1009650', 'label': '화천군(평화의댐)', 'children': [] },
            { 'value': '수위_1010680', 'label': '화천군(화천대교)', 'children': [] },
            { 'value': '수위_1010660', 'label': '화천군(화천댐)', 'children': [] },
            { 'value': '수위_1010661', 'label': '화천댐', 'children': [] },
            { 'value': '수위_1002675', 'label': '횡성군(안흥교)', 'children': [] },
            { 'value': '수위_8000006', 'label': '횡성군(안흥교)', 'children': [] },
            { 'value': '수위_1006630', 'label': '횡성군(오산교)', 'children': [] },
            { 'value': '수위_1006610', 'label': '횡성군(율동리)', 'children': [] },
            { 'value': '수위_1006660', 'label': '횡성군(전천교)', 'children': [] },
            { 'value': '수위_8000007', 'label': '횡성군(전천교)', 'children': [] },
            { 'value': '수위_1006612', 'label': '횡성군(포동2교)', 'children': [] },
            { 'value': '수위_1006650', 'label': '횡성군(횡성교)', 'children': [] },
            { 'value': '수위_1006615', 'label': '횡성군(횡성댐)', 'children': [] },
            { 'value': '수위_1004635', 'label': '후영교', 'children': [] },
            { 'value': '수위_1007649', 'label': '흑천', 'children': [] }]
        },
        {
            'value': '수위_11',
            'label': '안성천',
            'children': [{ 'value': '수위_1101615', 'label': '고삼', 'children': [] },
            { 'value': '수위_1101609', 'label': '금광', 'children': [] },
            { 'value': '수위_5004690', 'label': '나주시(회진리)', 'children': [] },
            { 'value': '수위_1101695', 'label': '아산만(내)', 'children': [] },
            { 'value': '수위_1101696', 'label': '아산만(외)', 'children': [] },
            { 'value': '수위_1101685', 'label': '아산호', 'children': [] },
            { 'value': '수위_1101620', 'label': '안성시(건천리)', 'children': [] },
            { 'value': '수위_1101610', 'label': '안성시(옥산대교)', 'children': [] },
            { 'value': '수위_1101645', 'label': '오산시(탑동대교)', 'children': [] },
            { 'value': '수위_1101625', 'label': '이동', 'children': [] },
            { 'value': '수위_1101630', 'label': '천안시(안성천교)', 'children': [] },
            { 'value': '수위_8000002', 'label': '천안시(안성천교)', 'children': [] },
            { 'value': '수위_1101635', 'label': '평택시(군문교)', 'children': [] },
            { 'value': '수위_1101670', 'label': '평택시(동연교)', 'children': [] },
            { 'value': '수위_4009628', 'label': '평택시(동연교)', 'children': [] },
            { 'value': '수위_1101663', 'label': '평택시(진위1교)', 'children': [] },
            { 'value': '수위_1101680', 'label': '평택시(팽성대교)', 'children': [] },
            { 'value': '수위_1101665', 'label': '평택시(회화리)', 'children': [] },
            { 'value': '수위_1101650', 'label': '화성시(수직교)', 'children': [] },
            { 'value': '수위_1101605', 'label': '화성시(화산교)', 'children': [] }]
        },
        {
            'value': '수위_12',
            'label': '한강서해',
            'children': [{ 'value': '수위_1201620', 'label': '강화군(강화대교)', 'children': [] },
            { 'value': '수위_1202670', 'label': '남양(외)', 'children': [] },
            { 'value': '수위_1202660', 'label': '반월1', 'children': [] },
            { 'value': '수위_1202630', 'label': '반월2', 'children': [] },
            { 'value': '수위_1202690', 'label': '서해배수문(내)', 'children': [] },
            { 'value': '수위_1202695', 'label': '서해배수문(외)', 'children': [] },
            { 'value': '수위_1201651', 'label': '아라서해갑문(내)', 'children': [] },
            { 'value': '수위_1201653', 'label': '아라서해갑문(외)', 'children': [] },
            { 'value': '수위_1201652', 'label': '아라서해갑실(남)', 'children': [] },
            { 'value': '수위_1201654', 'label': '아라서해갑실(북)', 'children': [] }]
        },
        {
            'value': '수위_13',
            'label': '한강동해',
            'children': [{ 'value': '수위_1302670', 'label': '강릉시(송림교)', 'children': [] },
            { 'value': '수위_1302648', 'label': '강릉시(회산교)', 'children': [] },
            { 'value': '수위_1302663', 'label': '동해시(달방댐)', 'children': [] },
            { 'value': '수위_2008629', 'label': '동해시(달방댐)', 'children': [] },
            { 'value': '수위_1302668', 'label': '동해시(북평교)', 'children': [] },
            { 'value': '수위_1302665', 'label': '동해시(원평교)', 'children': [] },
            { 'value': '수위_1303610', 'label': '삼척시(남양촌교)', 'children': [] },
            { 'value': '수위_1303650', 'label': '삼척시(상정교)', 'children': [] },
            { 'value': '수위_1303680', 'label': '삼척시(오십천교)', 'children': [] },
            { 'value': '수위_1301658', 'label': '양양군(양양대교)', 'children': [] },
            { 'value': '수위_1301630', 'label': '양양군(용천2교)', 'children': [] },
            { 'value': '수위_1302645', 'label': '오봉', 'children': [] }]
        }]
        //  - 낙동강
        r02_wlv = [{
            'value': '수위_20',
            'label': '낙동강',
            'children': [{ 'value': '수위_2015650', 'label': '가북', 'children': [] },
            { 'value': '수위_2011697', 'label': '강정보(임)', 'children': [] },
            { 'value': '수위_2008660', 'label': '강창1', 'children': [] },
            { 'value': '수위_2015645', 'label': '거창', 'children': [] },
            { 'value': '수위_2015635', 'label': '거창군(거열교)', 'children': [] },
            { 'value': '수위_1006693', 'label': '거창군(의동교)', 'children': [] },
            { 'value': '수위_2015620', 'label': '거창군(의동교)', 'children': [] },
            { 'value': '수위_2015655', 'label': '거창군(지산교)', 'children': [] },
            { 'value': '수위_2012648', 'label': '경산시(압량교)', 'children': [] },
            { 'value': '수위_2012650', 'label': '경산시(환상리)', 'children': [] },
            { 'value': '수위_2021610', 'label': '경주시(의곡교)', 'children': [] },
            { 'value': '수위_2004607', 'label': '경천', 'children': [] },
            { 'value': '수위_2004685', 'label': '경천댐', 'children': [] },
            { 'value': '수위_2006660', 'label': '계산', 'children': [] },
            { 'value': '수위_2014640', 'label': '고령군(고령교)', 'children': [] },
            { 'value': '수위_2013640', 'label': '고령군(귀원교)', 'children': [] },
            { 'value': '수위_2014651', 'label': '고령군(달성보하)', 'children': [] },
            { 'value': '수위_2013690', 'label': '고령군(도진교)', 'children': [] },
            { 'value': '수위_2013685', 'label': '고령군(사촌리)', 'children': [] },
            { 'value': '수위_8000005', 'label': '고령군(사촌리)', 'children': [] },
            { 'value': '수위_2013650', 'label': '고령군(회천교)', 'children': [] },
            { 'value': '수위_2008620', 'label': '고로', 'children': [] },
            { 'value': '수위_2019610', 'label': '고성군(두문교)', 'children': [] },
            { 'value': '수위_2012602', 'label': '고현', 'children': [] },
            { 'value': '수위_2011640', 'label': '구미시(구미대교)', 'children': [] },
            { 'value': '수위_2009680', 'label': '구미시(구미보상)', 'children': [] },
            { 'value': '수위_2009682', 'label': '구미시(구미보하)', 'children': [] },
            { 'value': '수위_2010690', 'label': '구미시(선주교)', 'children': [] },
            { 'value': '수위_2011625', 'label': '구미시(양포교)', 'children': [] },
            { 'value': '수위_2009670', 'label': '구미시(일선교)', 'children': [] },
            { 'value': '수위_2008603', 'label': '군위군(군위댐)', 'children': [] },
            { 'value': '수위_2008605', 'label': '군위군(동곡교)', 'children': [] },
            { 'value': '수위_2008650', 'label': '군위군(무성리)', 'children': [] },
            { 'value': '수위_2008630', 'label': '군위군(미성교)', 'children': [] },
            { 'value': '수위_2008635', 'label': '군위군(병수리)', 'children': [] },
            { 'value': '수위_2008621', 'label': '군위군(화수교)', 'children': [] },
            { 'value': '수위_2008645', 'label': '군위군(효령교)', 'children': [] },
            { 'value': '수위_2003635', 'label': '금봉', 'children': [] },
            { 'value': '수위_2010630', 'label': '김천시(교리)', 'children': [] },
            { 'value': '수위_2010650', 'label': '김천시(김천교)', 'children': [] },
            { 'value': '수위_2010625', 'label': '김천시(김천부항댐)', 'children': [] },
            { 'value': '수위_2010660', 'label': '김천시(대동교)', 'children': [] },
            { 'value': '수위_2010623', 'label': '김천시(도곡리)', 'children': [] },
            { 'value': '수위_2010620', 'label': '김천시(지좌리)', 'children': [] },
            { 'value': '수위_2010635', 'label': '김천시(지품교)', 'children': [] },
            { 'value': '수위_2020680', 'label': '김해시(오서교)', 'children': [] },
            { 'value': '수위_2022640', 'label': '김해시(월촌리)', 'children': [] },
            { 'value': '수위_2022685', 'label': '김해시(정천교)', 'children': [] },
            { 'value': '수위_2001615', 'label': '낙본A', 'children': [] },
            { 'value': '수위_2019660', 'label': '남지교', 'children': [] },
            { 'value': '수위_2007645', 'label': '달지2', 'children': [] },
            { 'value': '수위_2014665', 'label': '달창', 'children': [] },
            { 'value': '수위_2014670', 'label': '달창', 'children': [] },
            { 'value': '수위_2011696', 'label': '대구시(강정고령보하)', 'children': [] },
            { 'value': '수위_2012695', 'label': '대구시(강창교)', 'children': [] },
            { 'value': '수위_2014680', 'label': '대구시(내리)', 'children': [] },
            { 'value': '수위_2010687', 'label': '대구시(달성보상)', 'children': [] },
            { 'value': '수위_2014650', 'label': '대구시(달성보상)', 'children': [] },
            { 'value': '수위_2012665', 'label': '대구시(동화교)', 'children': [] },
            { 'value': '수위_2012696', 'label': '대구시(매곡리)', 'children': [] },
            { 'value': '수위_2012660', 'label': '대구시(불로동)', 'children': [] },
            { 'value': '수위_2014620', 'label': '대구시(사문진교)', 'children': [] },
            { 'value': '수위_2012670', 'label': '대구시(산격대교)', 'children': [] },
            { 'value': '수위_2012652', 'label': '대구시(성동교)', 'children': [] },
            { 'value': '수위_2012690', 'label': '대구시(성북교)', 'children': [] },
            { 'value': '수위_2014660', 'label': '대구시(성하리)', 'children': [] },
            { 'value': '수위_2012653', 'label': '대구시(안심교)', 'children': [] },
            { 'value': '수위_2001660', 'label': '도산', 'children': [] },
            { 'value': '수위_2302660', 'label': '독산', 'children': [] },
            { 'value': '수위_2008610', 'label': '동곡', 'children': [] },
            { 'value': '수위_2021635', 'label': '매곡교', 'children': [] },
            { 'value': '수위_2002610', 'label': '무계', 'children': [] },
            { 'value': '수위_2005640', 'label': '문경시(갈마교)', 'children': [] },
            { 'value': '수위_2005660', 'label': '문경시(김용리)', 'children': [] },
            { 'value': '수위_2007620', 'label': '문경시(말응리)', 'children': [] },
            { 'value': '수위_2005650', 'label': '문경시(불정동)', 'children': [] },
            { 'value': '수위_2007640', 'label': '문경시(이목리)', 'children': [] },
            { 'value': '수위_2021670', 'label': '밀양시(금곡리)', 'children': [] },
            { 'value': '수위_2021677', 'label': '밀양시(남천교)', 'children': [] },
            { 'value': '수위_2021685', 'label': '밀양시(남포동)', 'children': [] },
            { 'value': '수위_2021660', 'label': '밀양시(밀양댐)', 'children': [] },
            { 'value': '수위_2022610', 'label': '밀양시(삼랑진교)', 'children': [] },
            { 'value': '수위_2021690', 'label': '밀양시(삼상교)', 'children': [] },
            { 'value': '수위_2021665', 'label': '밀양시(상동교)', 'children': [] },
            { 'value': '수위_2021675', 'label': '밀양시(용평동)', 'children': [] },
            { 'value': '수위_2020651', 'label': '밀양시(인교)', 'children': [] },
            { 'value': '수위_2020603', 'label': '밀양시(판곡교)', 'children': [] },
            { 'value': '수위_2002606', 'label': '보현', 'children': [] },
            { 'value': '수위_2001650', 'label': '봉화', 'children': [] },
            { 'value': '수위_2001625', 'label': '봉화군(광회교)', 'children': [] },
            { 'value': '수위_2001655', 'label': '봉화군(도천교)', 'children': [] },
            { 'value': '수위_2004605', 'label': '봉화군(봉화대교)', 'children': [] },
            { 'value': '수위_2001628', 'label': '봉화군(분천교)', 'children': [] },
            { 'value': '수위_2001658', 'label': '봉화군(양삼교)', 'children': [] },
            { 'value': '수위_2001630', 'label': '봉화군(임기리)', 'children': [] },
            { 'value': '수위_2012645', 'label': '봉화군(풍호리)', 'children': [] },
            { 'value': '수위_2001629', 'label': '봉화군(현동교)', 'children': [] },
            { 'value': '수위_2022680', 'label': '부산시(구포대교)', 'children': [] },
            { 'value': '수위_2018645', 'label': '산청군(경호교)', 'children': [] },
            { 'value': '수위_2018674', 'label': '산청군(묵곡교)', 'children': [] },
            { 'value': '수위_2018680', 'label': '산청군(백운리)', 'children': [] },
            { 'value': '수위_2018662', 'label': '산청군(소이교)', 'children': [] },
            { 'value': '수위_2018650', 'label': '산청군(수산교)', 'children': [] },
            { 'value': '수위_2018673', 'label': '산청군(원리교)', 'children': [] },
            { 'value': '수위_2018665', 'label': '산청군(하정리)', 'children': [] },
            { 'value': '수위_2018640', 'label': '산청군(하촌리)', 'children': [] },
            { 'value': '수위_2018653', 'label': '삼가', 'children': [] },
            { 'value': '수위_2007686', 'label': '상주시(강창교)', 'children': [] },
            { 'value': '수위_2006625', 'label': '상주시(병성교)', 'children': [] },
            { 'value': '수위_2005670', 'label': '상주시(상우교)', 'children': [] },
            { 'value': '수위_2007680', 'label': '상주시(상주보상)', 'children': [] },
            { 'value': '수위_2007682', 'label': '상주시(상주보하)', 'children': [] },
            { 'value': '수위_2006630', 'label': '상주시(소천2교)', 'children': [] },
            { 'value': '수위_2005680', 'label': '상주시(이안교)', 'children': [] },
            { 'value': '수위_2006675', 'label': '상주시(화계교)', 'children': [] },
            { 'value': '수위_2006665', 'label': '상주시(후천교)', 'children': [] },
            { 'value': '수위_2019651', 'label': '서암', 'children': [] },
            { 'value': '수위_2013611', 'label': '성주', 'children': [] },
            { 'value': '수위_2013615', 'label': '성주군(가천교)', 'children': [] },
            { 'value': '수위_2011665', 'label': '성주군(도성교)', 'children': [] },
            { 'value': '수위_2011660', 'label': '성주군(성주대교)', 'children': [] },
            { 'value': '수위_2013620', 'label': '성주군(화죽교)', 'children': [] },
            { 'value': '수위_2018658', 'label': '손항', 'children': [] },
            { 'value': '수위_2004625', 'label': '송리원', 'children': [] },
            { 'value': '수위_2018675', 'label': '시천', 'children': [] },
            { 'value': '수위_3012611', 'label': '시천', 'children': [] },
            { 'value': '수위_2021612', 'label': '신원교', 'children': [] },
            { 'value': '수위_2012680', 'label': '신천1', 'children': [] },
            { 'value': '수위_2012681', 'label': '신천2', 'children': [] },
            { 'value': '수위_2012675', 'label': '신천3', 'children': [] },
            { 'value': '수위_2003650', 'label': '안동시(검암교)', 'children': [] },
            { 'value': '수위_2002695', 'label': '안동시(대사3교)', 'children': [] },
            { 'value': '수위_2002685', 'label': '안동시(묵계교)', 'children': [] },
            { 'value': '수위_2002686', 'label': '안동시(신덕교)', 'children': [] },
            { 'value': '수위_1007653', 'label': '안동시(안동대교)', 'children': [] },
            { 'value': '수위_2003610', 'label': '안동시(안동대교)', 'children': [] },
            { 'value': '수위_2001685', 'label': '안동시(안동댐)', 'children': [] },
            { 'value': '수위_2001680', 'label': '안동시(안동댐방수로)', 'children': [] },
            { 'value': '수위_2001690', 'label': '안동시(안동조정지댐)', 'children': [] },
            { 'value': '수위_2003640', 'label': '안동시(운산리)', 'children': [] },
            { 'value': '수위_2002677', 'label': '안동시(임하댐)', 'children': [] },
            { 'value': '수위_2002675', 'label': '안동시(임하댐방수로)', 'children': [] },
            { 'value': '수위_2002680', 'label': '안동시(임하조정지댐)', 'children': [] },
            { 'value': '수위_2002692', 'label': '안동시(포진교)', 'children': [] },
            { 'value': '수위_2018608', 'label': '안의', 'children': [] },
            { 'value': '수위_2021650', 'label': '양산시(대리)', 'children': [] },
            { 'value': '수위_2022660', 'label': '양산시(양산교)', 'children': [] },
            { 'value': '수위_2022670', 'label': '양산시(호포대교)', 'children': [] },
            { 'value': '수위_2022655', 'label': '양산시(효충교)', 'children': [] },
            { 'value': '수위_2002620', 'label': '영양군(양평교)', 'children': [] },
            { 'value': '수위_2002633', 'label': '영양군(임천교)', 'children': [] },
            { 'value': '수위_2002634', 'label': '영양군(청암교)', 'children': [] },
            { 'value': '수위_2002638', 'label': '영양군(흥구교)', 'children': [] },
            { 'value': '수위_2002635', 'label': '영양군(흥구리)', 'children': [] },
            { 'value': '수위_2004640', 'label': '영주시(석탑교)', 'children': [] },
            { 'value': '수위_2004630', 'label': '영주시(영주댐)', 'children': [] },
            { 'value': '수위_2004610', 'label': '영주시(영주유사조절지)', 'children': [] },
            { 'value': '수위_2004632', 'label': '영주시(용혈리)', 'children': [] },
            { 'value': '수위_2004635', 'label': '영주시(월호교)', 'children': [] },
            { 'value': '수위_2004608', 'label': '영주시(이산교)', 'children': [] },
            { 'value': '수위_2012610', 'label': '영천시(굼이교)', 'children': [] },
            { 'value': '수위_1006694', 'label': '영천시(금창교)', 'children': [] },
            { 'value': '수위_2012640', 'label': '영천시(금창교)', 'children': [] },
            { 'value': '수위_2012625', 'label': '영천시(단포교)', 'children': [] },
            { 'value': '수위_2012607', 'label': '영천시(보현산댐)', 'children': [] },
            { 'value': '수위_2012628', 'label': '영천시(영동교)', 'children': [] },
            { 'value': '수위_2012632', 'label': '영천시(영양교)', 'children': [] },
            { 'value': '수위_2012615', 'label': '영천시(영천댐)', 'children': [] },
            { 'value': '수위_2012612', 'label': '영천시(자천교)', 'children': [] },
            { 'value': '수위_2021680', 'label': '예림교', 'children': [] },
            { 'value': '수위_2001670', 'label': '예안', 'children': [] },
            { 'value': '수위_2004655', 'label': '예천군(고평교)', 'children': [] },
            { 'value': '수위_2003670', 'label': '예천군(구담교)', 'children': [] },
            { 'value': '수위_2004650', 'label': '예천군(미호교)', 'children': [] },
            { 'value': '수위_2004695', 'label': '예천군(산양교)', 'children': [] },
            { 'value': '수위_2007660', 'label': '예천군(상풍교)', 'children': [] },
            { 'value': '수위_2004675', 'label': '예천군(신음리)', 'children': [] },
            { 'value': '수위_2004668', 'label': '예천군(예천교)', 'children': [] },
            { 'value': '수위_2004680', 'label': '예천군(회룡교)', 'children': [] },
            { 'value': '수위_2006603', 'label': '오태', 'children': [] },
            { 'value': '수위_2014625', 'label': '옥연', 'children': [] },
            { 'value': '수위_2018670', 'label': '원지', 'children': [] },
            { 'value': '수위_2019653', 'label': '의령군(공단교)', 'children': [] },
            { 'value': '수위_2017630', 'label': '의령군(대곡교)', 'children': [] },
            { 'value': '수위_2019695', 'label': '의령군(성산리)', 'children': [] },
            { 'value': '수위_2017685', 'label': '의령군(세간교)', 'children': [] },
            { 'value': '수위_2017670', 'label': '의령군(여의리)', 'children': [] },
            { 'value': '수위_2019655', 'label': '의령군(정암교)', 'children': [] },
            { 'value': '수위_2008628', 'label': '의성군(구미교)', 'children': [] },
            { 'value': '수위_2009620', 'label': '의성군(낙단교)', 'children': [] },
            { 'value': '수위_2009618', 'label': '의성군(낙단보상)', 'children': [] },
            { 'value': '수위_2008631', 'label': '의성군(덕은교)', 'children': [] },
            { 'value': '수위_2008665', 'label': '의성군(동부교)', 'children': [] },
            { 'value': '수위_2008632', 'label': '의성군(비안교)', 'children': [] },
            { 'value': '수위_2008690', 'label': '의성군(용곡리)', 'children': [] },
            { 'value': '수위_2003690', 'label': '의성군(풍지교)', 'children': [] },
            { 'value': '수위_2002687', 'label': '임하댐하류수위(볼거리)', 'children': [] },
            { 'value': '수위_2018698', 'label': '진주시(남강댐방수로)', 'children': [] },
            { 'value': '수위_2018690', 'label': '진주시(내평리)', 'children': [] },
            { 'value': '수위_2019635', 'label': '진주시(덕오리)', 'children': [] },
            { 'value': '수위_2019625', 'label': '진주시(옥산교)', 'children': [] },
            { 'value': '수위_2019640', 'label': '진주시(월강교)', 'children': [] },
            { 'value': '수위_2019615', 'label': '진주시(장대동)', 'children': [] },
            { 'value': '수위_2019647', 'label': '진주시(장박교)', 'children': [] },
            { 'value': '수위_2018695', 'label': '진주시(판문동)', 'children': [] },
            { 'value': '수위_2020605', 'label': '창녕군(강리)', 'children': [] },
            { 'value': '수위_2017640', 'label': '창녕군(유어교)', 'children': [] },
            { 'value': '수위_2020647', 'label': '창녕군(창녕함안보상)', 'children': [] },
            { 'value': '수위_2020650', 'label': '창녕군(청암리)', 'children': [] },
            { 'value': '수위_2015690', 'label': '창리', 'children': [] },
            { 'value': '수위_2020675', 'label': '창원시(수산대교)', 'children': [] },
            { 'value': '수위_2001675', 'label': '천전', 'children': [] },
            { 'value': '수위_2021630', 'label': '청도군(당호리)', 'children': [] },
            { 'value': '수위_2021620', 'label': '청도군(운문댐)', 'children': [] },
            { 'value': '수위_2021640', 'label': '청도군(원리)', 'children': [] },
            { 'value': '수위_2021625', 'label': '청도군(임당리)', 'children': [] },
            { 'value': '수위_2002645', 'label': '청송군(광덕교)', 'children': [] },
            { 'value': '수위_2002655', 'label': '청송군(덕천교)', 'children': [] },
            { 'value': '수위_2002616', 'label': '청송군(명당리)', 'children': [] },
            { 'value': '수위_2002609', 'label': '청송군(성재리)', 'children': [] },
            { 'value': '수위_2002630', 'label': '청송군(송강2교)', 'children': [] },
            { 'value': '수위_2011648', 'label': '칠곡군(칠곡보상)', 'children': [] },
            { 'value': '수위_2011649', 'label': '칠곡군(칠곡보하)', 'children': [] },
            { 'value': '수위_2011650', 'label': '칠곡군(호국의다리)', 'children': [] },
            { 'value': '수위_2001613', 'label': '태백시(루사교)', 'children': [] },
            { 'value': '수위_2001610', 'label': '태백시(문화교)', 'children': [] },
            { 'value': '수위_2501620', 'label': '판문', 'children': [] },
            { 'value': '수위_5002201', 'label': '평림댐', 'children': [] },
            { 'value': '수위_2012605', 'label': '포항시(논골교)', 'children': [] },
            { 'value': '수위_2002613', 'label': '포항시(상사4교)', 'children': [] },
            { 'value': '수위_2022620', 'label': '하단', 'children': [] },
            { 'value': '수위_2018685', 'label': '하동군(대곡리)', 'children': [] },
            { 'value': '수위_2020615', 'label': '함안군(계내리)', 'children': [] },
            { 'value': '수위_2019620', 'label': '함안군(구혜리)', 'children': [] },
            { 'value': '수위_2019685', 'label': '함안군(대사교)', 'children': [] },
            { 'value': '수위_2019680', 'label': '함안군(서촌리)', 'children': [] },
            { 'value': '수위_2020640', 'label': '함안군(소랑교)', 'children': [] },
            { 'value': '수위_2020646', 'label': '함안군(창녕함안보하)', 'children': [] },
            { 'value': '수위_2018623', 'label': '함양군(대웅교)', 'children': [] },
            { 'value': '수위_2018609', 'label': '함양군(안의교)', 'children': [] },
            { 'value': '수위_2018620', 'label': '함양군(용평리)', 'children': [] },
            { 'value': '수위_2018630', 'label': '함양군(의탄리)', 'children': [] },
            { 'value': '수위_2018635', 'label': '함양군(화촌리)', 'children': [] },
            { 'value': '수위_2013630', 'label': '합천군(구정리)', 'children': [] },
            { 'value': '수위_2016650', 'label': '합천군(남정교)', 'children': [] },
            { 'value': '수위_2018655', 'label': '합천군(소오리)', 'children': [] },
            { 'value': '수위_2015637', 'label': '합천군(술곡교)', 'children': [] },
            { 'value': '수위_2014690', 'label': '합천군(율지교)', 'children': [] },
            { 'value': '수위_2017620', 'label': '합천군(적포교)', 'children': [] },
            { 'value': '수위_2015680', 'label': '합천군(합천댐)', 'children': [] },
            { 'value': '수위_2016630', 'label': '합천군(합천댐방수로)', 'children': [] },
            { 'value': '수위_2016635', 'label': '합천군(합천조정지댐)', 'children': [] },
            { 'value': '수위_2016640', 'label': '합천군(합천조정지방수로)', 'children': [] },
            { 'value': '수위_2014697', 'label': '합천군(합천창녕보상)', 'children': [] },
            { 'value': '수위_2014699', 'label': '합천군(합천창녕보하)', 'children': [] },
            { 'value': '수위_2016680', 'label': '합천군(황강교)', 'children': [] },
            { 'value': '수위_2002636', 'label': '홍구', 'children': [] },
            { 'value': '수위_2015630', 'label': '황강A', 'children': [] }]
        },
        {
            'value': '수위_21',
            'label': '형산강',
            'children': [{ 'value': '수위_2101675', 'label': '경주시(강동대교)', 'children': [] },
            { 'value': '수위_2101680', 'label': '경주시(국당리)', 'children': [] },
            { 'value': '수위_2101668', 'label': '경주시(달성교)', 'children': [] },
            { 'value': '수위_2101610', 'label': '경주시(망성교)', 'children': [] },
            { 'value': '수위_2101650', 'label': '경주시(모아리)', 'children': [] },
            { 'value': '수위_2101625', 'label': '경주시(서천교)', 'children': [] },
            { 'value': '수위_2101672', 'label': '경주시(안계댐)', 'children': [] },
            { 'value': '수위_2101620', 'label': '경주시(효현교)', 'children': [] },
            { 'value': '수위_2101632', 'label': '보문', 'children': [] },
            { 'value': '수위_2101690', 'label': '포항시(형산교)', 'children': [] }]
        },
        {
            'value': '수위_22',
            'label': '태화강',
            'children': [{ 'value': '수위_2201611', 'label': '울산시(구수교)', 'children': [] },
            { 'value': '수위_2201653', 'label': '울산시(구영교)', 'children': [] },
            { 'value': '수위_2201610', 'label': '울산시(대곡댐)', 'children': [] },
            { 'value': '수위_2201613', 'label': '울산시(대암교)', 'children': [] },
            { 'value': '수위_2201615', 'label': '울산시(대암댐)', 'children': [] },
            { 'value': '수위_2201690', 'label': '울산시(병영교)', 'children': [] },
            { 'value': '수위_2201630', 'label': '울산시(사연교)', 'children': [] },
            { 'value': '수위_2201625', 'label': '울산시(사연댐)', 'children': [] },
            { 'value': '수위_2201660', 'label': '울산시(삼호교)', 'children': [] },
            { 'value': '수위_2201640', 'label': '울산시(선바위교)', 'children': [] },
            { 'value': '수위_2201685', 'label': '울산시(신답교)', 'children': [] },
            { 'value': '수위_2201670', 'label': '울산시(태화교)', 'children': [] },
            { 'value': '수위_2201617', 'label': '울주군(반구교)', 'children': [] },
            { 'value': '수위_2201614', 'label': '울주군(왕방교)', 'children': [] },
            { 'value': '수위_2201650', 'label': '척과', 'children': [] }]
        },
        {
            'value': '수위_23',
            'label': '회야ㆍ수영강',
            'children': [{
                'value': '수위_2022696',
                'label': '부산시(낙동강하구언(내))',
                'children': []
            },
            { 'value': '수위_2302695', 'label': '부산시(신평동)', 'children': [] },
            { 'value': '수위_2302650', 'label': '부산시(원동교)', 'children': [] },
            { 'value': '수위_2301670', 'label': '울산시(덕신교)', 'children': [] },
            { 'value': '수위_2301650', 'label': '울산시(동천1교)', 'children': [] },
            { 'value': '수위_2301640', 'label': '울산시(선암댐)', 'children': [] },
            { 'value': '수위_2301630', 'label': '울산시(통천교)', 'children': [] }]
        },
        {
            'value': '수위_24',
            'label': '낙동강동해',
            'children': [{ 'value': '수위_2403610', 'label': '경주시(감포댐)', 'children': [] },
            { 'value': '수위_2401691', 'label': '묘곡', 'children': [] },
            { 'value': '수위_2402620', 'label': '영덕군(대지리)', 'children': [] },
            { 'value': '수위_2402630', 'label': '영덕군(영덕대교)', 'children': [] },
            { 'value': '수위_2401690', 'label': '영덕군(인량교)', 'children': [] },
            { 'value': '수위_2402610', 'label': '용연', 'children': [] },
            { 'value': '수위_2401620', 'label': '울진군(구산리)', 'children': [] },
            { 'value': '수위_2401650', 'label': '울진군(수산교)', 'children': [] }]
        },
        {
            'value': '수위_25',
            'label': '낙동강남해',
            'children': [{ 'value': '수위_2503640', 'label': '거제시(구천댐)', 'children': [] },
            { 'value': '수위_2503620', 'label': '거제시(연초댐)', 'children': [] },
            { 'value': '수위_2503625', 'label': '거제시(죽전교)', 'children': [] },
            { 'value': '수위_2022697', 'label': '부산시(낙동강하구언(외))', 'children': [] },
            { 'value': '수위_2018692', 'label': '사천시(검정리)', 'children': [] }]
        }]
        //  - 금강
        r03_wlv = [{
            'value': '수위_30',
            'label': '금강',
            'children': [{ 'value': '수위_3005620', 'label': '강창2', 'children': [] },
            { 'value': '수위_3007622', 'label': '공주시(공주보상)', 'children': [] },
            { 'value': '수위_3012633', 'label': '공주시(공주보상)', 'children': [] },
            { 'value': '수위_3012634', 'label': '공주시(공주보하)', 'children': [] },
            { 'value': '수위_3012635', 'label': '공주시(국재교)', 'children': [] },
            { 'value': '수위_3012620', 'label': '공주시(금강교)', 'children': [] },
            { 'value': '수위_3012612', 'label': '공주시(마암리)', 'children': [] },
            { 'value': '수위_3012625', 'label': '공주시(오인교)', 'children': [] },
            { 'value': '수위_3012630', 'label': '공주시(평소리)', 'children': [] },
            { 'value': '수위_3014695', 'label': '금강하구둑(외)', 'children': [] },
            { 'value': '수위_3009620', 'label': '금산군(문암교)', 'children': [] },
            { 'value': '수위_3004645', 'label': '금산군(음대교)', 'children': [] },
            { 'value': '수위_3004620', 'label': '금산군(적벽교)', 'children': [] },
            { 'value': '수위_3008670', 'label': '금산군(제원교)', 'children': [] },
            { 'value': '수위_3004640', 'label': '금산군(제원대교)', 'children': [] },
            { 'value': '수위_3004637', 'label': '금산군(황풍교)', 'children': [] },
            { 'value': '수위_3007652', 'label': '기대교(지)', 'children': [] },
            { 'value': '수위_3012604', 'label': '나성', 'children': [] },
            { 'value': '수위_3013670', 'label': '논산시(논산대교)', 'children': [] },
            { 'value': '수위_3012690', 'label': '논산시(동성교)', 'children': [] },
            { 'value': '수위_3012681', 'label': '논산시(석성천교)', 'children': [] },
            { 'value': '수위_3013605', 'label': '논산시(인천교)', 'children': [] },
            { 'value': '수위_3013685', 'label': '논산시(제내교)', 'children': [] },
            { 'value': '수위_3013665', 'label': '논산시(풋개다리)', 'children': [] },
            { 'value': '수위_3014610', 'label': '논산시(황산대교)', 'children': [] },
            { 'value': '수위_3001603', 'label': '대곡', 'children': [] },
            { 'value': '수위_3009665', 'label': '대전시(가수원교)', 'children': [] },
            { 'value': '수위_3008695', 'label': '대전시(금강1교)', 'children': [] },
            { 'value': '수위_3009675', 'label': '대전시(대덕대교)', 'children': [] },
            { 'value': '수위_3008680', 'label': '대전시(대청조정지댐)', 'children': [] },
            { 'value': '수위_3009655', 'label': '대전시(두계교)', 'children': [] },
            { 'value': '수위_3009670', 'label': '대전시(만년교)', 'children': [] },
            { 'value': '수위_3009630', 'label': '대전시(복수교)', 'children': [] },
            { 'value': '수위_3009698', 'label': '대전시(봉산동)', 'children': [] },
            { 'value': '수위_3009693', 'label': '대전시(신구교)', 'children': [] },
            { 'value': '수위_3009650', 'label': '대전시(용촌교)', 'children': [] },
            { 'value': '수위_3009680', 'label': '대전시(원촌교)', 'children': [] },
            { 'value': '수위_3009640', 'label': '대전시(인창교)', 'children': [] },
            { 'value': '수위_3009645', 'label': '대전시(철갑교)', 'children': [] },
            { 'value': '수위_3009673', 'label': '대전시(한밭대교)', 'children': [] },
            { 'value': '수위_3014656', 'label': '덕용', 'children': [] },
            { 'value': '수위_3007606', 'label': '두평', 'children': [] },
            { 'value': '수위_3011607', 'label': '맹동', 'children': [] },
            { 'value': '수위_2504695', 'label': '명지', 'children': [] },
            { 'value': '수위_3002655', 'label': '무주군(대티교)', 'children': [] },
            { 'value': '수위_3003620', 'label': '무주군(신촌농2교)', 'children': [] },
            { 'value': '수위_3003660', 'label': '무주군(여의교)', 'children': [] },
            { 'value': '수위_3003680', 'label': '무주군(취수장)', 'children': [] },
            { 'value': '수위_3011627', 'label': '미호', 'children': [] },
            { 'value': '수위_3011612', 'label': '백곡', 'children': [] },
            { 'value': '수위_3007650', 'label': '보은군(기대교)', 'children': [] },
            { 'value': '수위_3007645', 'label': '보은군(대양교)', 'children': [] },
            { 'value': '수위_3007610', 'label': '보은군(산성교)', 'children': [] },
            { 'value': '수위_3007620', 'label': '보은군(이평교)', 'children': [] },
            { 'value': '수위_3007640', 'label': '보은군(탄부교)', 'children': [] },
            { 'value': '수위_3007626', 'label': '보청', 'children': [] },
            { 'value': '수위_3012685', 'label': '부여군(반조원리)', 'children': [] },
            { 'value': '수위_3012675', 'label': '부여군(백제교)', 'children': [] },
            { 'value': '수위_3012664', 'label': '부여군(백제보하)', 'children': [] },
            { 'value': '수위_3012680', 'label': '부여군(석동교)', 'children': [] },
            { 'value': '수위_3012674', 'label': '부여군(송학교)', 'children': [] },
            { 'value': '수위_3014650', 'label': '부여군(입포리)', 'children': [] },
            { 'value': '수위_3012665', 'label': '부여군(지천교)', 'children': [] },
            { 'value': '수위_3007662', 'label': '산계교(지)', 'children': [] },
            { 'value': '수위_3007612', 'label': '산성교(지)', 'children': [] },
            { 'value': '수위_3014680', 'label': '서천군(북원교)', 'children': [] },
            { 'value': '수위_3014670', 'label': '서천군(옥포리)', 'children': [] },
            { 'value': '수위_3012606', 'label': '세종보(상)', 'children': [] },
            { 'value': '수위_3012605', 'label': '세종시(금남교)', 'children': [] },
            { 'value': '수위_3010620', 'label': '세종시(노호리)', 'children': [] },
            { 'value': '수위_3012607', 'label': '세종시(도암교)', 'children': [] },
            { 'value': '수위_3010660', 'label': '세종시(명학리)', 'children': [] },
            { 'value': '수위_3011685', 'label': '세종시(미호교)', 'children': [] },
            { 'value': '수위_3012609', 'label': '세종시(산봉교)', 'children': [] },
            { 'value': '수위_3011675', 'label': '세종시(상조천교)', 'children': [] },
            { 'value': '수위_3012602', 'label': '세종시(세종리)', 'children': [] },
            { 'value': '수위_3012608', 'label': '세종시(세종보하)', 'children': [] },
            { 'value': '수위_3011695', 'label': '세종시(월산교)', 'children': [] },
            { 'value': '수위_3011687', 'label': '세종시(월암교)', 'children': [] },
            { 'value': '수위_3005681', 'label': '송천', 'children': [] },
            { 'value': '수위_3004610', 'label': '수통', 'children': [] },
            { 'value': '수위_3005675', 'label': '영동군(백화교)', 'children': [] },
            { 'value': '수위_3005690', 'label': '영동군(심천교)', 'children': [] },
            { 'value': '수위_3004690', 'label': '영동군(양강교)', 'children': [] },
            { 'value': '수위_3004680', 'label': '영동군(영동제2교)', 'children': [] },
            { 'value': '수위_3005680', 'label': '영동군(율리)', 'children': [] },
            { 'value': '수위_3004685', 'label': '영동군(초강교)', 'children': [] },
            { 'value': '수위_3004650', 'label': '영동군(호탄리)', 'children': [] },
            { 'value': '수위_3005670', 'label': '영동군(황간교)', 'children': [] },
            { 'value': '수위_3006675', 'label': '옥천', 'children': [] },
            { 'value': '수위_3007660', 'label': '옥천군(산계교)', 'children': [] },
            { 'value': '수위_3007670', 'label': '옥천군(산계리)', 'children': [] },
            { 'value': '수위_3008630', 'label': '옥천군(옥각교)', 'children': [] },
            { 'value': '수위_3006680', 'label': '옥천군(이원대교)', 'children': [] },
            { 'value': '수위_3006650', 'label': '이원', 'children': [] },
            { 'value': '수위_3001620', 'label': '장수군(연화교)', 'children': [] },
            { 'value': '수위_3001605', 'label': '장수군(운곡교)', 'children': [] },
            { 'value': '수위_3001610', 'label': '장수군(장계제2교)', 'children': [] },
            { 'value': '수위_3001680', 'label': '주천', 'children': [] },
            { 'value': '수위_3011625', 'label': '증평군(반탄교)', 'children': [] },
            { 'value': '수위_3002650', 'label': '진안군(감동교)', 'children': [] },
            { 'value': '수위_3001660', 'label': '진안군(석정교)', 'children': [] },
            { 'value': '수위_3001640', 'label': '진안군(성산리)', 'children': [] },
            { 'value': '수위_3001630', 'label': '진안군(송대교)', 'children': [] },
            { 'value': '수위_3002630', 'label': '진안군(신용담교)', 'children': [] },
            { 'value': '수위_3001690', 'label': '진안군(용담댐)', 'children': [] },
            { 'value': '수위_3001695', 'label': '진안군(용담댐방수로)', 'children': [] },
            { 'value': '수위_3011620', 'label': '진천군(가산교)', 'children': [] },
            { 'value': '수위_3011617', 'label': '진천군(금곡교)', 'children': [] },
            { 'value': '수위_3011615', 'label': '진천군(신정교)', 'children': [] },
            { 'value': '수위_3011624', 'label': '진천군(오갑교)', 'children': [] },
            { 'value': '수위_3011623', 'label': '진천군(인산리)', 'children': [] },
            { 'value': '수위_3011650', 'label': '천안시(장산교)', 'children': [] },
            { 'value': '수위_3001615', 'label': '천천', 'children': [] },
            { 'value': '수위_3012662', 'label': '청양군(백제보상)', 'children': [] },
            { 'value': '수위_3012650', 'label': '청양군(신흥리)', 'children': [] },
            { 'value': '수위_3012655', 'label': '청양군(지천교)', 'children': [] },
            { 'value': '수위_3011641', 'label': '청주시(노동교)', 'children': [] },
            { 'value': '수위_3008690', 'label': '청주시(대청댐)', 'children': [] },
            { 'value': '수위_3008685', 'label': '청주시(대청댐방수로)', 'children': [] },
            { 'value': '수위_3011665', 'label': '청주시(미호천교)', 'children': [] },
            { 'value': '수위_3011630', 'label': '청주시(여암교)', 'children': [] },
            { 'value': '수위_3011643', 'label': '청주시(용평교)', 'children': [] },
            { 'value': '수위_3011635', 'label': '청주시(팔결교)', 'children': [] },
            { 'value': '수위_3011660', 'label': '청주시(환희교)', 'children': [] },
            { 'value': '수위_3011645', 'label': '청주시(흥덕교)', 'children': [] },
            { 'value': '수위_3007642', 'label': '탄부교(지)', 'children': [] },
            { 'value': '수위_3013650', 'label': '탑정', 'children': [] },
            { 'value': '수위_3013652', 'label': '탑정2', 'children': [] }]
        },
        {
            'value': '수위_31',
            'label': '삽교천',
            'children': [{ 'value': '수위_3101605', 'label': '광시', 'children': [] },
            { 'value': '수위_3101679', 'label': '궁평', 'children': [] },
            { 'value': '수위_3101680', 'label': '궁평', 'children': [] },
            { 'value': '수위_3101665', 'label': '남관', 'children': [] },
            { 'value': '수위_3101650', 'label': '당진시(구양교)', 'children': [] },
            { 'value': '수위_3101693', 'label': '당진시(신촌리)', 'children': [] },
            { 'value': '수위_3101620', 'label': '대흥', 'children': [] },
            { 'value': '수위_3101615', 'label': '무봉', 'children': [] },
            { 'value': '수위_3101614', 'label': '배약교', 'children': [] },
            { 'value': '수위_3101695', 'label': '삽교호', 'children': [] },
            { 'value': '수위_3101603', 'label': '신대교', 'children': [] },
            { 'value': '수위_3101690', 'label': '아산시(강청교)', 'children': [] },
            { 'value': '수위_3101672', 'label': '아산시(덕지리)', 'children': [] },
            { 'value': '수위_3101673', 'label': '아산시(새터교)', 'children': [] },
            { 'value': '수위_3101683', 'label': '아산시(온천교)', 'children': [] },
            { 'value': '수위_3101685', 'label': '아산시(충무교)', 'children': [] },
            { 'value': '수위_3101675', 'label': '아산시(한내다리)', 'children': [] },
            { 'value': '수위_3101670', 'label': '아산시(휴대교)', 'children': [] },
            { 'value': '수위_3102623', 'label': '예당', 'children': [] },
            { 'value': '수위_3101622', 'label': '예당 간선', 'children': [] },
            { 'value': '수위_3101645', 'label': '예산군(구만교)', 'children': [] },
            { 'value': '수위_3101613', 'label': '예산군(서계양교)', 'children': [] },
            { 'value': '수위_3001604', 'label': '예산군(신례원교)', 'children': [] },
            { 'value': '수위_3101630', 'label': '예산군(신례원교)', 'children': [] },
            { 'value': '수위_3101638', 'label': '예산군(신리교)', 'children': [] },
            { 'value': '수위_3101625', 'label': '예산군(예산대교)', 'children': [] },
            { 'value': '수위_3101604', 'label': '예산군(은사교)', 'children': [] },
            { 'value': '수위_3101640', 'label': '예산군(충의대교)', 'children': [] },
            { 'value': '수위_3101660', 'label': '천안시(가송교)', 'children': [] },
            { 'value': '수위_3101655', 'label': '천안시(신흥교)', 'children': [] },
            { 'value': '수위_3101635', 'label': '홍성군(삽교천교)', 'children': [] }]
        },
        {
            'value': '수위_32',
            'label': '금강서해',
            'children': [{ 'value': '수위_3201680', 'label': '고풍', 'children': [] },
            { 'value': '수위_3014690', 'label': '금강하구둑(내)', 'children': [] },
            { 'value': '수위_3201690', 'label': '당진시(채운교)', 'children': [] },
            { 'value': '수위_3203652', 'label': '보령시(노천교)', 'children': [] },
            { 'value': '수위_3203620', 'label': '보령시(동대교)', 'children': [] },
            { 'value': '수위_3203640', 'label': '보령시(보령댐)', 'children': [] },
            { 'value': '수위_8000001', 'label': '보령시(보령댐)', 'children': [] },
            { 'value': '수위_3203645', 'label': '보령시(보령댐방수로)', 'children': [] },
            { 'value': '수위_3201675', 'label': '삽교호 내수위', 'children': [] },
            { 'value': '수위_3203660', 'label': '서부', 'children': [] },
            { 'value': '수위_3203629', 'label': '청천', 'children': [] },
            { 'value': '수위_3203630', 'label': '청천', 'children': [] }]
        },
        {
            'value': '수위_33',
            'label': '만경ㆍ동진',
            'children': [{ 'value': '수위_3301618', 'label': '경천', 'children': [] },
            { 'value': '수위_3301620', 'label': '경천', 'children': [] },
            { 'value': '수위_3301650', 'label': '구이', 'children': [] },
            { 'value': '수위_3301651', 'label': '구이', 'children': [] },
            { 'value': '수위_3301688', 'label': '군산시(원두교)', 'children': [] },
            { 'value': '수위_3302661', 'label': '금평', 'children': [] },
            { 'value': '수위_3302665', 'label': '김제시(군포교)', 'children': [] },
            { 'value': '수위_3301690', 'label': '김제시(만경대교)', 'children': [] },
            { 'value': '수위_3302680', 'label': '김제시(용동교)', 'children': [] },
            { 'value': '수위_3302685', 'label': '김제시(죽산교)', 'children': [] },
            { 'value': '수위_3302635', 'label': '내장', 'children': [] },
            { 'value': '수위_3301610', 'label': '대아', 'children': [] },
            { 'value': '수위_3301611', 'label': '대아', 'children': [] },
            { 'value': '수위_3203655', 'label': '대창', 'children': [] },
            { 'value': '수위_3301605', 'label': '동상', 'children': [] },
            { 'value': '수위_3302690', 'label': '동진대교', 'children': [] },
            { 'value': '수위_3302675', 'label': '부안군(평교)', 'children': [] },
            { 'value': '수위_3303110', 'label': '부안댐', 'children': [] },
            { 'value': '수위_3303670', 'label': '부안댐', 'children': [] },
            { 'value': '수위_3302640', 'label': '부전', 'children': [] },
            { 'value': '수위_3301660', 'label': '색장', 'children': [] },
            { 'value': '수위_3301632', 'label': '소양천', 'children': [] },
            { 'value': '수위_3302610', 'label': '수청', 'children': [] },
            { 'value': '수위_3302611', 'label': '수청', 'children': [] },
            { 'value': '수위_3301615', 'label': '신흥천', 'children': [] },
            { 'value': '수위_3301623', 'label': '완주군(마안교)', 'children': [] },
            { 'value': '수위_3301670', 'label': '완주군(삼례교)', 'children': [] },
            { 'value': '수위_3301635', 'label': '완주군(소양용연교)', 'children': [] },
            { 'value': '수위_3301625', 'label': '완주군(오성교)', 'children': [] },
            { 'value': '수위_3301630', 'label': '완주군(용봉교)', 'children': [] },
            { 'value': '수위_3301640', 'label': '완주군(제2소양교)', 'children': [] },
            { 'value': '수위_3301645', 'label': '완주군(하리교)', 'children': [] },
            { 'value': '수위_3302650', 'label': '용산', 'children': [] },
            { 'value': '수위_3301685', 'label': '익산시(만경교)', 'children': [] },
            { 'value': '수위_3301675', 'label': '익산시(인수교)', 'children': [] },
            { 'value': '수위_4005620', 'label': '장남', 'children': [] },
            { 'value': '수위_3301665', 'label': '전주시(미산교)', 'children': [] },
            { 'value': '수위_3301653', 'label': '전주시(삼천교)', 'children': [] },
            { 'value': '수위_3301655', 'label': '전주시(서곡교)', 'children': [] },
            { 'value': '수위_3301657', 'label': '전주시(서천교)', 'children': [] },
            { 'value': '수위_3301654', 'label': '전주시(세내교)', 'children': [] },
            { 'value': '수위_3301652', 'label': '전주시(신평교)', 'children': [] },
            { 'value': '수위_3301662', 'label': '전주시(은석교)', 'children': [] },
            { 'value': '수위_3302620', 'label': '정읍시(거산교)', 'children': [] },
            { 'value': '수위_3302643', 'label': '정읍시(상동교)', 'children': [] },
            { 'value': '수위_3302660', 'label': '정읍시(양전교)', 'children': [] },
            { 'value': '수위_3302630', 'label': '정읍시(정우교)', 'children': [] },
            { 'value': '수위_3302653', 'label': '정읍시(정읍교)', 'children': [] },
            { 'value': '수위_3302655', 'label': '정읍시(정읍천대교)', 'children': [] },
            { 'value': '수위_3302617', 'label': '정읍시(종산리)', 'children': [] },
            { 'value': '수위_3302645', 'label': '정읍시(죽림교)', 'children': [] },
            { 'value': '수위_3302658', 'label': '정읍시(초강리)', 'children': [] },
            { 'value': '수위_3302657', 'label': '정읍시(풍월교)', 'children': [] },
            { 'value': '수위_3302615', 'label': '정읍시(행정교)', 'children': [] },
            { 'value': '수위_3302605', 'label': '칠보', 'children': [] }]
        }]
        //  - 영산강
        r04_wlv = [{
            'value': '수위_40',
            'label': '섬진강',
            'children': [{ 'value': '수위_4006660', 'label': '곡성군(고달교)', 'children': [] },
            { 'value': '수위_4004690', 'label': '곡성군(금곡교)', 'children': [] },
            { 'value': '수위_4008660', 'label': '곡성군(목사동1교)', 'children': [] },
            { 'value': '수위_4008655', 'label': '곡성군(목사동2교)', 'children': [] },
            { 'value': '수위_4006680', 'label': '곡성군(예성교)', 'children': [] },
            { 'value': '수위_4008670', 'label': '곡성군(태안교)', 'children': [] },
            { 'value': '수위_4004650', 'label': '곡성군(합강교)', 'children': [] },
            { 'value': '수위_4009650', 'label': '광양시(고사리)', 'children': [] },
            { 'value': '수위_4009640', 'label': '광양시(남도대교)', 'children': [] },
            { 'value': '수위_4009610', 'label': '구례군(구례교)', 'children': [] },
            { 'value': '수위_4009625', 'label': '구례군(서시교)', 'children': [] },
            { 'value': '수위_4009630', 'label': '구례군(송정리)', 'children': [] },
            { 'value': '수위_4005670', 'label': '남원시(동림교)', 'children': [] },
            { 'value': '수위_4004660', 'label': '남원시(신덕리)', 'children': [] },
            { 'value': '수위_4005660', 'label': '남원시(요천교)', 'children': [] },
            { 'value': '수위_4005690', 'label': '남원시(요천대교)', 'children': [] },
            { 'value': '수위_4005645', 'label': '남원시(월석교)', 'children': [] },
            { 'value': '수위_4005628', 'label': '동화', 'children': [] },
            { 'value': '수위_4005630', 'label': '동화', 'children': [] },
            { 'value': '수위_4007630', 'label': '보성군(가장교)', 'children': [] },
            { 'value': '수위_4007625', 'label': '보성군(보성강댐)', 'children': [] },
            { 'value': '수위_4004630', 'label': '순창군(옥천교)', 'children': [] },
            { 'value': '수위_4001660', 'label': '순창군(운암교)', 'children': [] },
            { 'value': '수위_4004615', 'label': '순창군(유적교)', 'children': [] },
            { 'value': '수위_4004640', 'label': '순창군(유풍교)', 'children': [] },
            { 'value': '수위_4002690', 'label': '순창군(평남리)', 'children': [] },
            { 'value': '수위_4003690', 'label': '순창군(현포리)', 'children': [] },
            { 'value': '수위_4008650', 'label': '순천시(광천교)', 'children': [] },
            { 'value': '수위_4009608', 'label': '순천시(용서교)', 'children': [] },
            { 'value': '수위_4007695', 'label': '순천시(주암댐)', 'children': [] },
            { 'value': '수위_4005624', 'label': '용림', 'children': [] },
            { 'value': '수위_4002605', 'label': '임실군(섬진강댐)', 'children': [] },
            { 'value': '수위_4003650', 'label': '임실군(신기교)', 'children': [] },
            { 'value': '수위_4002640', 'label': '임실군(일중리)', 'children': [] },
            { 'value': '수위_4001620', 'label': '임실군(호암교)', 'children': [] },
            { 'value': '수위_4002610', 'label': '임실군(회문리)', 'children': [] },
            { 'value': '수위_4003615', 'label': '장남', 'children': [] },
            { 'value': '수위_4007615', 'label': '죽동교', 'children': [] },
            { 'value': '수위_4001610', 'label': '진안군(좌포교)', 'children': [] },
            { 'value': '수위_4009668', 'label': '하동', 'children': [] },
            { 'value': '수위_4009670', 'label': '하동군(대석교)', 'children': [] },
            { 'value': '수위_4009665', 'label': '하동군(읍내리)', 'children': [] },
            { 'value': '수위_4007660', 'label': '화순군(동복댐)', 'children': [] },
            { 'value': '수위_4007670', 'label': '화순군(용리교)', 'children': [] }]
        },
        {
            'value': '수위_41',
            'label': '섬진강남해',
            'children': [{ 'value': '수위_4105630', 'label': '광양시(서산교)', 'children': [] },
            { 'value': '수위_4105670', 'label': '광양시(수어천교)', 'children': [] },
            { 'value': '수위_4105640', 'label': '광양시(용강교)', 'children': [] },
            { 'value': '수위_4105665', 'label': '광양시(지원교)', 'children': [] },
            { 'value': '수위_3007637', 'label': '노동', 'children': [] },
            { 'value': '수위_4007620', 'label': '노동', 'children': [] },
            { 'value': '수위_4007623', 'label': '보성강댐', 'children': [] },
            { 'value': '수위_4105210', 'label': '수어댐', 'children': [] },
            { 'value': '수위_4105660', 'label': '수어댐', 'children': [] },
            { 'value': '수위_4104610', 'label': '순천시(노동교)', 'children': [] },
            { 'value': '수위_4104665', 'label': '순천시(노디목교)', 'children': [] },
            { 'value': '수위_4104680', 'label': '순천시(동천교)', 'children': [] },
            { 'value': '수위_4104603', 'label': '순천시(송전교)', 'children': [] },
            { 'value': '수위_4104685', 'label': '순천시(연동교)', 'children': [] },
            { 'value': '수위_4104620', 'label': '순천시(주암조절지댐)', 'children': [] },
            { 'value': '수위_4104625', 'label': '순천시(주암조절지방수로)', 'children': [] },
            { 'value': '수위_4104655', 'label': '순천시(주암조절지조정지댐)', 'children': [] }]
        },
        {
            'value': '수위_50',
            'label': '영산강',
            'children': [{ 'value': '수위_5001680', 'label': '광주광역시(극락교)', 'children': [] },
            { 'value': '수위_5001670', 'label': '광주광역시(설월교)', 'children': [] },
            { 'value': '수위_5004620', 'label': '광주광역시(승용교)', 'children': [] },
            { 'value': '수위_5001660', 'label': '광주광역시(어등대교)', 'children': [] },
            { 'value': '수위_5001640', 'label': '광주광역시(용산교)', 'children': [] },
            { 'value': '수위_5002660', 'label': '광주광역시(용진교)', 'children': [] },
            { 'value': '수위_5001650', 'label': '광주광역시(유촌교)', 'children': [] },
            { 'value': '수위_5002690', 'label': '광주광역시(장록교)', 'children': [] },
            { 'value': '수위_5001673', 'label': '광주광역시(천교)', 'children': [] },
            { 'value': '수위_5001645', 'label': '광주광역시(첨단대교)', 'children': [] },
            { 'value': '수위_5002677', 'label': '광주광역시(평림교)', 'children': [] },
            { 'value': '수위_5001655', 'label': '광주광역시(풍영정천2교)', 'children': [] },
            { 'value': '수위_5004650', 'label': '나주시(나주대교)', 'children': [] },
            { 'value': '수위_5003640', 'label': '나주시(나주댐)', 'children': [] },
            { 'value': '수위_5003680', 'label': '나주시(남평교)', 'children': [] },
            { 'value': '수위_5004655', 'label': '나주시(동곡리)', 'children': [] },
            { 'value': '수위_5004670', 'label': '나주시(영산교)', 'children': [] },
            { 'value': '수위_5003650', 'label': '나주시(우산교)', 'children': [] },
            { 'value': '수위_5001630', 'label': '담양군(광주댐)', 'children': [] },
            { 'value': '수위_5001615', 'label': '담양군(금월교)', 'children': [] },
            { 'value': '수위_5001610', 'label': '담양군(담양댐)', 'children': [] },
            { 'value': '수위_5001620', 'label': '담양군(덕용교)', 'children': [] },
            { 'value': '수위_5001625', 'label': '담양군(삼지교)', 'children': [] },
            { 'value': '수위_5001627', 'label': '담양군(양지교)', 'children': [] },
            { 'value': '수위_5001618', 'label': '담양군(장천교)', 'children': [] },
            { 'value': '수위_5006621', 'label': '대동', 'children': [] },
            { 'value': '수위_5006670', 'label': '무안군(몽탄대교)', 'children': [] },
            { 'value': '수위_5002667', 'label': '수양(함동)', 'children': [] },
            { 'value': '수위_5004630', 'label': '승촌보(하류)', 'children': [] },
            { 'value': '수위_5007640', 'label': '영암군(해창교)', 'children': [] },
            { 'value': '수위_5002643', 'label': '장성군(금계리)', 'children': [] },
            { 'value': '수위_5002610', 'label': '장성군(용동교)', 'children': [] },
            { 'value': '수위_5002620', 'label': '장성군(장성댐)', 'children': [] },
            { 'value': '수위_5002650', 'label': '장성군(제2황룡교)', 'children': [] },
            { 'value': '수위_5002670', 'label': '장성군(죽탄교)', 'children': [] },
            { 'value': '수위_5002680', 'label': '장성군(평림댐)', 'children': [] },
            { 'value': '수위_5004696', 'label': '죽산보', 'children': [] },
            { 'value': '수위_5004698', 'label': '죽산보(하류)', 'children': [] },
            { 'value': '수위_5005650', 'label': '함평군(나산교)', 'children': [] },
            { 'value': '수위_5006610', 'label': '함평군(동강교)', 'children': [] },
            { 'value': '수위_5006620', 'label': '함평군(영수교)', 'children': [] },
            { 'value': '수위_5005680', 'label': '함평군(원고막교)', 'children': [] },
            { 'value': '수위_5006630', 'label': '함평군(학야교)', 'children': [] },
            { 'value': '수위_5003610', 'label': '화순군(능주교)', 'children': [] },
            { 'value': '수위_5003604', 'label': '화순군(세청교)', 'children': [] },
            { 'value': '수위_5003620', 'label': '화순군(신성교)', 'children': [] },
            { 'value': '수위_5003605', 'label': '화순군(용두교)', 'children': [] },
            { 'value': '수위_5003615', 'label': '화순군(주도교)', 'children': [] }]
        },
        {
            'value': '수위_51',
            'label': '탐진강',
            'children': [{ 'value': '수위_5101690', 'label': '강진군(석교교)', 'children': [] },
            { 'value': '수위_5101680', 'label': '강진군(풍동리)', 'children': [] },
            { 'value': '수위_5101675', 'label': '장흥군(감천교)', 'children': [] },
            { 'value': '수위_5101620', 'label': '장흥군(동산교)', 'children': [] },
            { 'value': '수위_5101650', 'label': '장흥군(별천교)', 'children': [] },
            { 'value': '수위_5101670', 'label': '장흥군(예양교)', 'children': [] },
            { 'value': '수위_5101631', 'label': '장흥군(장흥댐)', 'children': [] }]
        },
        {
            'value': '수위_52',
            'label': '영산강남해',
            'children': [{ 'value': '수위_5008690', 'label': '하구언(내)', 'children': [] },
            { 'value': '수위_5008695', 'label': '하구언(외)', 'children': [] }]
        },
        {
            'value': '수위_53',
            'label': '영산강서해',
            'children': [{ 'value': '수위_5301660', 'label': '고창군(부정교)', 'children': [] },
            { 'value': '수위_5301690', 'label': '고창군(용선교)', 'children': [] },
            { 'value': '수위_5302640', 'label': '불갑', 'children': [] },
            { 'value': '수위_5302620', 'label': '영광군(반와교)', 'children': [] }]
        }]
        function add_wlv_att(wlv_list) {
            for (let i = 0; i < wlv_list.length; i++) {
                const wlv_emptyNodes = findEmptyLabel(wlv_list[i]);
                for (const emptyNode of wlv_emptyNodes) {
                    const att_list = [];
                    const att_node = {
                        value: emptyNode.value + '_WLV',
                        label: '수위(cm)'
                    };
                    att_list.push(att_node);
                    emptyNode.children = att_list
                }
            }
        }
        add_wlv_att([r01_wlv, r02_wlv, r03_wlv, r04_wlv])
        parentNodeList[0].children[1].children = r01_wlv
        parentNodeList[1].children[1].children = r02_wlv
        parentNodeList[2].children[1].children = r03_wlv
        parentNodeList[3].children[1].children = r04_wlv

        // 강수량
        //  - 한강
        r01_wether = [{
            'value': '강수량_10',
            'label': '한강',
            'children': [{ 'value': '강수량_98', 'label': '동두천', 'children': [] },
            { 'value': '강수량_93', 'label': '북춘천', 'children': [] },
            { 'value': '강수량_108', 'label': '서울', 'children': [] },
            { 'value': '강수량_202', 'label': '양평', 'children': [] },
            { 'value': '강수량_121', 'label': '영월', 'children': [] },
            { 'value': '강수량_114', 'label': '원주', 'children': [] },
            { 'value': '강수량_203', 'label': '이천', 'children': [] },
            { 'value': '강수량_211', 'label': '인제', 'children': [] },
            { 'value': '강수량_217', 'label': '정선군', 'children': [] },
            { 'value': '강수량_221', 'label': '제천', 'children': [] },
            { 'value': '강수량_95', 'label': '철원', 'children': [] },
            { 'value': '강수량_101', 'label': '춘천', 'children': [] },
            { 'value': '강수량_127', 'label': '충주', 'children': [] },
            { 'value': '강수량_99', 'label': '파주', 'children': [] },
            { 'value': '강수량_212', 'label': '홍천', 'children': [] }]
        },
        {
            'value': '강수량_11',
            'label': '안성천',
            'children': [{ 'value': '강수량_119', 'label': '수원', 'children': [] }]
        },
        {
            'value': '강수량_12',
            'label': '한강서해',
            'children': [{ 'value': '강수량_201', 'label': '강화', 'children': [] },
            { 'value': '강수량_102', 'label': '백령', 'children': [] },
            { 'value': '강수량_112', 'label': '인천', 'children': [] }]
        },
        {
            'value': '강수량_13',
            'label': '한강동해',
            'children': [{ 'value': '강수량_105', 'label': '강릉', 'children': [] },
            { 'value': '강수량_106', 'label': '동해', 'children': [] },
            { 'value': '강수량_104', 'label': '북강릉', 'children': [] },
            { 'value': '강수량_90', 'label': '속초', 'children': [] }]
        }]
        //  - 낙동강
        r02_wether = [{
            'value': '강수량_20',
            'label': '낙동강',
            'children': [{ 'value': '강수량_284', 'label': '거창', 'children': [] },
            { 'value': '강수량_279', 'label': '구미', 'children': [] },
            { 'value': '강수량_253', 'label': '김해시', 'children': [] },
            { 'value': '강수량_143', 'label': '대구', 'children': [] },
            { 'value': '강수량_273', 'label': '문경', 'children': [] },
            { 'value': '강수량_288', 'label': '밀양', 'children': [] },
            { 'value': '강수량_271', 'label': '봉화', 'children': [] },
            { 'value': '강수량_289', 'label': '산청', 'children': [] },
            { 'value': '강수량_137', 'label': '상주', 'children': [] },
            { 'value': '강수량_136', 'label': '안동', 'children': [] },
            { 'value': '강수량_257', 'label': '양산시', 'children': [] },
            { 'value': '강수량_272', 'label': '영주', 'children': [] },
            { 'value': '강수량_281', 'label': '영천', 'children': [] },
            { 'value': '강수량_263', 'label': '의령군', 'children': [] },
            { 'value': '강수량_278', 'label': '의성', 'children': [] },
            { 'value': '강수량_192', 'label': '진주', 'children': [] },
            { 'value': '강수량_276', 'label': '청송군', 'children': [] },
            { 'value': '강수량_216', 'label': '태백', 'children': [] },
            { 'value': '강수량_264', 'label': '함양군', 'children': [] },
            { 'value': '강수량_285', 'label': '합천', 'children': [] }]
        },
        {
            'value': '강수량_22',
            'label': '태화강',
            'children': [{ 'value': '강수량_152', 'label': '울산', 'children': [] }]
        },
        {
            'value': '강수량_23',
            'label': '회야ㆍ수영강',
            'children': [{ 'value': '강수량_159', 'label': '부산', 'children': [] }]
        },
        {
            'value': '강수량_24',
            'label': '낙동강동해',
            'children': [{ 'value': '강수량_277', 'label': '영덕', 'children': [] },
            { 'value': '강수량_115', 'label': '울릉도', 'children': [] },
            { 'value': '강수량_130', 'label': '울진', 'children': [] },
            { 'value': '강수량_138', 'label': '포항', 'children': [] }]
        },
        {
            'value': '강수량_25',
            'label': '낙동강남해',
            'children': [{ 'value': '강수량_294', 'label': '거제', 'children': [] },
            { 'value': '강수량_255', 'label': '북창원', 'children': [] },
            { 'value': '강수량_155', 'label': '창원', 'children': [] },
            { 'value': '강수량_162', 'label': '통영', 'children': [] }]
        }]
        //  - 금강
        r03_wether = [{
            'value': '강수량_30',
            'label': '금강',
            'children': [{ 'value': '강수량_238', 'label': '금산', 'children': [] },
            { 'value': '강수량_133', 'label': '대전', 'children': [] },
            { 'value': '강수량_226', 'label': '보은', 'children': [] },
            { 'value': '강수량_236', 'label': '부여', 'children': [] },
            { 'value': '강수량_239', 'label': '세종', 'children': [] },
            { 'value': '강수량_248', 'label': '장수', 'children': [] },
            { 'value': '강수량_232', 'label': '천안', 'children': [] },
            { 'value': '강수량_131', 'label': '청주', 'children': [] },
            { 'value': '강수량_135', 'label': '추풍령', 'children': [] }]
        },
        {
            'value': '강수량_32',
            'label': '금강서해',
            'children': [{ 'value': '강수량_140', 'label': '군산', 'children': [] },
            { 'value': '강수량_235', 'label': '보령', 'children': [] },
            { 'value': '강수량_129', 'label': '서산', 'children': [] }]
        },
        {
            'value': '강수량_33',
            'label': '만경ㆍ동진',
            'children': [{ 'value': '강수량_243', 'label': '부안', 'children': [] },
            { 'value': '강수량_146', 'label': '전주', 'children': [] },
            { 'value': '강수량_245', 'label': '정읍', 'children': [] }]
        }]
        //  - 영산강
        r04_wether = [{
            'value': '강수량_40',
            'label': '섬진강',
            'children': [{ 'value': '강수량_247', 'label': '남원', 'children': [] },
            { 'value': '강수량_254', 'label': '순창군', 'children': [] },
            { 'value': '강수량_256', 'label': '순천', 'children': [] },
            { 'value': '강수량_244', 'label': '임실', 'children': [] }]
        },
        {
            'value': '강수량_41',
            'label': '섬진강남해',
            'children': [{ 'value': '강수량_259', 'label': '강진군', 'children': [] },
            { 'value': '강수량_262', 'label': '고흥', 'children': [] },
            { 'value': '강수량_266', 'label': '광양시', 'children': [] },
            { 'value': '강수량_258', 'label': '보성군', 'children': [] },
            { 'value': '강수량_174', 'label': '순천', 'children': [] },
            { 'value': '강수량_168', 'label': '여수', 'children': [] },
            { 'value': '강수량_170', 'label': '완도', 'children': [] }]
        },
        {
            'value': '강수량_50',
            'label': '영산강',
            'children': [{ 'value': '강수량_156', 'label': '광주', 'children': [] }]
        },
        {
            'value': '강수량_51',
            'label': '탐진강',
            'children': [{ 'value': '강수량_260', 'label': '장흥', 'children': [] }]
        },
        {
            'value': '강수량_52',
            'label': '영산강남해',
            'children': [{ 'value': '강수량_175', 'label': '진도(첨찰산)', 'children': [] },
            { 'value': '강수량_268', 'label': '진도군', 'children': [] },
            { 'value': '강수량_261', 'label': '해남', 'children': [] }]
        },
        {
            'value': '강수량_53',
            'label': '영산강서해',
            'children': [{ 'value': '강수량_172', 'label': '고창', 'children': [] },
            { 'value': '강수량_251', 'label': '고창군', 'children': [] },
            { 'value': '강수량_165', 'label': '목포', 'children': [] },
            { 'value': '강수량_252', 'label': '영광군', 'children': [] },
            { 'value': '강수량_169', 'label': '흑산도', 'children': [] }]
        },
        {
            'value': '강수량_60',
            'label': '제주도',
            'children': [{ 'value': '강수량_185', 'label': '고산', 'children': [] },
            { 'value': '강수량_189', 'label': '서귀포', 'children': [] },
            { 'value': '강수량_188', 'label': '성산', 'children': [] },
            { 'value': '강수량_184', 'label': '제주', 'children': [] }]
        }]

        function add_wether_att(wether_list) {
            for (let i = 0; i < wether_list.length; i++) {
                const wether_emptyNodes = findEmptyLabel(wether_list[i]);
                for (const emptyNode of wether_emptyNodes) {
                    const att_list = [];
                    const att_node = {
                        value: emptyNode.value + '_RAINFL',
                        label: '강수량(mm)'
                    };
                    att_list.push(att_node);
                    emptyNode.children = att_list
                }
            }
        }
        add_wether_att([r01_wether, r02_wether, r03_wether, r04_wether])
        parentNodeList[0].children[2].children = r01_wether
        parentNodeList[1].children[2].children = r02_wether
        parentNodeList[2].children[2].children = r03_wether
        parentNodeList[3].children[2].children = r04_wether
        // 댐
        //  - 한강
        r01_dam = [{
            'value': '댐_10',
            'label': '한강',
            'children': [{ 'value': '댐_1001210', 'label': '광동', 'children': [] },
            { 'value': '댐_1004310', 'label': '괴산', 'children': [] },
            { 'value': '댐_1021701', 'label': '군남', 'children': [] },
            { 'value': '댐_1001310', 'label': '도암', 'children': [] },
            { 'value': '댐_1013310', 'label': '의암', 'children': [] },
            { 'value': '댐_1015310', 'label': '청평', 'children': [] },
            { 'value': '댐_1017310', 'label': '팔당', 'children': [] },
            { 'value': '댐_1022701', 'label': '한탄강', 'children': [] },
            { 'value': '댐_1006110', 'label': '횡성', 'children': [] }]
        }]
        //  - 낙동강
        r02_dam = [{
            'value': '댐_20',
            'label': '낙동강',
            'children': [{ 'value': '댐_2018110', 'label': '남강', 'children': [] },
            { 'value': '댐_2010101', 'label': '부항', 'children': [] },
            { 'value': '댐_2002111', 'label': '성덕', 'children': [] },
            { 'value': '댐_2004101', 'label': '영주', 'children': [] },
            { 'value': '댐_2012210', 'label': '영천', 'children': [] },
            { 'value': '댐_2002110', 'label': '임하', 'children': [] },
            { 'value': '댐_2002610', 'label': '임하조정지', 'children': [] },
            { 'value': '댐_2015110', 'label': '합천', 'children': [] },
            { 'value': '댐_2018611', 'label': '합천조정지', 'children': [] }]
        },
        {
            'value': '댐_21',
            'label': '형산강',
            'children': [{ 'value': '댐_2201230', 'label': '대암', 'children': [] },
            { 'value': '댐_2201220', 'label': '사연', 'children': [] }]
        },
        {
            'value': '댐_23',
            'label': '회야ㆍ수영강',
            'children': [{ 'value': '댐_2301210', 'label': '선암', 'children': [] }]
        },
        {
            'value': '댐_25',
            'label': '낙동강남해',
            'children': [{ 'value': '댐_2503210', 'label': '연초', 'children': [] }]
        }]
        //  - 금강
        r03_dam = [{
            'value': '댐_30',
            'label': '금강',
            'children': [{ 'value': '댐_3001110', 'label': '용담', 'children': [] }]
        },
        {
            'value': '댐_32',
            'label': '금강서해',
            'children': [{ 'value': '댐_3203110', 'label': '보령', 'children': [] }]
        },
        {
            'value': '댐_33',
            'label': '만경ㆍ동진',
            'children': [{ 'value': '댐_3001111', 'label': '용담', 'children': [] }]
        }]
        //  - 영산강
        r04_dam = [{
            'value': '댐_40',
            'label': '섬진강',
            'children': [{ 'value': '댐_4007210', 'label': '동복', 'children': [] },
            { 'value': '댐_4007310', 'label': '보성강', 'children': [] },
            { 'value': '댐_4001110', 'label': '섬진강', 'children': [] },
            { 'value': '댐_4007110', 'label': '주암(본)', 'children': [] }]
        },
        {
            'value': '댐_50',
            'label': '영산강',
            'children': [{ 'value': '댐_5001410', 'label': '광주댐', 'children': [] },
            { 'value': '댐_5003410', 'label': '나주댐', 'children': [] },
            { 'value': '댐_5001420', 'label': '담양댐', 'children': [] },
            { 'value': '댐_5002410', 'label': '장성댐', 'children': [] },
            { 'value': '댐_5002201', 'label': '평림', 'children': [] }]
        },
        {
            'value': '댐_51',
            'label': '탐진강',
            'children': [{ 'value': '댐_5101110', 'label': '장흥', 'children': [] }]
        },
        {
            'value': '댐_53',
            'label': '영산강서해',
            'children': [{ 'value': '댐_3303110', 'label': '부안', 'children': [] }]
        }]

        function add_dam_att(dam_list) {
            for (let i = 0; i < dam_list.length; i++) {
                const dam_emptyNodes = findEmptyLabel(dam_list[i]);
                for (const emptyNode of dam_emptyNodes) {
                    const att_list = [];
                    const att_dam_nm = ["저수위(cm)", "유입량(cms)", "방류량(cms)", "저수량(만m^3)"]
                    const att_dam_code = ["LOW_WLV", "INFLOW_QY", "DCWTR_QY", "RSVWT_QY"]
                    for (let i = 0; i < att_dam_nm.length; i++) {
                        const att_node = {
                            value: emptyNode.value + '_' + att_dam_code[i],
                            label: att_dam_nm[i]
                        };
                        att_list.push(att_node);
                    }
                    emptyNode.children = att_list
                }
            }
        }
        add_dam_att([r01_dam, r02_dam, r03_dam, r04_dam])
        parentNodeList[0].children[3].children = r01_dam
        parentNodeList[1].children[3].children = r02_dam
        parentNodeList[2].children[3].children = r03_dam
        parentNodeList[3].children[3].children = r04_dam

        // 유량
        //  - 한강
        r01_flux = [{
            'value': '유량_10',
            'label': '한강',
            'children': [{ 'value': '유량_1003535', 'label': '가대교', 'children': [] },
            { 'value': '유량_1013555', 'label': '가평군(가평교)', 'children': [] },
            { 'value': '유량_1015545', 'label': '가평군(신청평대교)', 'children': [] },
            { 'value': '유량_1015544', 'label': '가평군(청평교)', 'children': [] },
            { 'value': '유량_1015540', 'label': '가평군(청평댐)', 'children': [] },
            { 'value': '유량_1013552', 'label': '가평천', 'children': [] },
            { 'value': '유량_1007533', 'label': '강천보(상류)', 'children': [] },
            { 'value': '유량_1007534', 'label': '강천보(하류)', 'children': [] },
            { 'value': '유량_1016555', 'label': '경안교', 'children': [] },
            { 'value': '유량_1019548', 'label': '계양대교', 'children': [] },
            { 'value': '유량_1004530', 'label': '고성교', 'children': [] },
            { 'value': '유량_1018505', 'label': '고안(등록문화재)', 'children': [] },
            { 'value': '유량_1018593', 'label': '광명시(시흥대교)', 'children': [] },
            { 'value': '유량_1016550', 'label': '광주시(경안교)', 'children': [] },
            { 'value': '유량_1016595', 'label': '광주시(광동교)', 'children': [] },
            { 'value': '유량_1016570', 'label': '광주시(서하교)', 'children': [] },
            { 'value': '유량_1016560', 'label': '광주시(섬뜰교)', 'children': [] },
            { 'value': '유량_1004593', 'label': '괴산군(목도교)', 'children': [] },
            { 'value': '유량_1004546', 'label': '괴산군(비도교)', 'children': [] },
            { 'value': '유량_1004545', 'label': '괴산군(수전교)', 'children': [] },
            { 'value': '유량_1004570', 'label': '괴산군(추산교)', 'children': [] },
            { 'value': '유량_1004543', 'label': '괴산댐', 'children': [] },
            { 'value': '유량_1022564', 'label': '궁신교', 'children': [] },
            { 'value': '유량_1019551', 'label': '귤현보(상)', 'children': [] },
            { 'value': '유량_1019552', 'label': '귤현보(하)', 'children': [] },
            { 'value': '유량_1019575', 'label': '김포시(전류리)', 'children': [] },
            { 'value': '유량_1018525', 'label': '남양주시(내곡교)', 'children': [] },
            { 'value': '유량_1018520', 'label': '남양주시(부평교)', 'children': [] },
            { 'value': '유량_1015580', 'label': '남양주시(삼봉리)', 'children': [] },
            { 'value': '유량_1018523', 'label': '남양주시(연평대교)', 'children': [] },
            { 'value': '유량_1018538', 'label': '남양주시(왕숙교)', 'children': [] },
            { 'value': '유량_1018530', 'label': '남양주시(진관교)', 'children': [] },
            { 'value': '유량_1018535', 'label': '남양주시(퇴계원리)', 'children': [] },
            { 'value': '유량_1018510', 'label': '남양주시(팔당대교)', 'children': [] },
            { 'value': '유량_1017590', 'label': '남양주시(팔당댐)', 'children': [] },
            { 'value': '유량_1010542', 'label': '남전교', 'children': [] },
            { 'value': '유량_1007530', 'label': '남한강', 'children': [] },
            { 'value': '유량_1003550', 'label': '단양1', 'children': [] },
            { 'value': '유량_1003540', 'label': '단양2', 'children': [] },
            { 'value': '유량_1003536', 'label': '단양군(가대교)', 'children': [] },
            { 'value': '유량_1003545', 'label': '단양군(단양1교)', 'children': [] },
            { 'value': '유량_1003542', 'label': '단양군(덕천교)', 'children': [] },
            { 'value': '유량_1003530', 'label': '단양군(오사리)', 'children': [] },
            { 'value': '유량_1002530', 'label': '대화', 'children': [] },
            { 'value': '유량_1022568', 'label': '동두천시(송천교)', 'children': [] },
            { 'value': '유량_1018564', 'label': '뚝도', 'children': [] },
            { 'value': '유량_1003562', 'label': '명서교', 'children': [] },
            { 'value': '유량_1013520', 'label': '목동교', 'children': [] },
            { 'value': '유량_1019547', 'label': '박촌1교', 'children': [] },
            { 'value': '유량_1022559', 'label': '백의교', 'children': [] },
            { 'value': '유량_1019553', 'label': '벌말교', 'children': [] },
            { 'value': '유량_1019520', 'label': '부천시(도두리2교)', 'children': [] },
            { 'value': '유량_1021570', 'label': '북삼', 'children': [] },
            { 'value': '유량_1015530', 'label': '산장제1교', 'children': [] },
            { 'value': '유량_1001515', 'label': '삼척시(갈밭교)', 'children': [] },
            { 'value': '유량_1001513', 'label': '삼척시(광동교)', 'children': [] },
            { 'value': '유량_1001510', 'label': '삼척시(광동댐)', 'children': [] },
            { 'value': '유량_1001507', 'label': '삼척시(번천교)', 'children': [] },
            { 'value': '유량_1003544', 'label': '상진교', 'children': [] },
            { 'value': '유량_1018540', 'label': '서울시(광진교)', 'children': [] },
            { 'value': '유량_1018595', 'label': '서울시(너부대교)', 'children': [] },
            { 'value': '유량_1018555', 'label': '서울시(대곡교)', 'children': [] },
            { 'value': '유량_1018558', 'label': '서울시(대치교)', 'children': [] },
            { 'value': '유량_1018597', 'label': '서울시(오금교)', 'children': [] },
            { 'value': '유량_1018570', 'label': '서울시(월계2교)', 'children': [] },
            { 'value': '유량_1018580', 'label': '서울시(잠수교)', 'children': [] },
            { 'value': '유량_1018575', 'label': '서울시(중랑교)', 'children': [] },
            { 'value': '유량_1018569', 'label': '서울시(창동교)', 'children': [] },
            { 'value': '유량_1018562', 'label': '서울시(청담대교)', 'children': [] },
            { 'value': '유량_1018583', 'label': '서울시(한강대교)', 'children': [] },
            { 'value': '유량_1019530', 'label': '서울시(행주대교)', 'children': [] },
            { 'value': '유량_1006567', 'label': '섬강교', 'children': [] },
            { 'value': '유량_1018550', 'label': '성남시(궁내교)', 'children': [] },
            { 'value': '유량_1012590', 'label': '소양강', 'children': [] },
            { 'value': '유량_1001505', 'label': '송천1교', 'children': [] },
            { 'value': '유량_1019535', 'label': '아라한강갑문(내)', 'children': [] },
            { 'value': '유량_1019537', 'label': '아라한강갑문(외)', 'children': [] },
            { 'value': '유량_1019536', 'label': '아라한강갑실', 'children': [] },
            { 'value': '유량_1007504', 'label': '안성시(한평교)', 'children': [] },
            { 'value': '유량_1018590', 'label': '안양시(충훈1교)', 'children': [] },
            { 'value': '유량_1010530', 'label': '약수교', 'children': [] },
            { 'value': '유량_1010540', 'label': '양구군(각시교)', 'children': [] },
            { 'value': '유량_1007590', 'label': '양평군(봉상교)', 'children': [] },
            { 'value': '유량_1007597', 'label': '양평군(신원리)', 'children': [] },
            { 'value': '유량_1007585', 'label': '양평군(양평교)', 'children': [] },
            { 'value': '유량_1007580', 'label': '양평군(흑천교)', 'children': [] },
            { 'value': '유량_1007539', 'label': '여주보(상류)', 'children': [] },
            { 'value': '유량_1007541', 'label': '여주보(하류)', 'children': [] },
            { 'value': '유량_1007520', 'label': '여주시(강천리)', 'children': [] },
            { 'value': '유량_1007525', 'label': '여주시(남한강교)', 'children': [] },
            { 'value': '유량_1007517', 'label': '여주시(삼합교)', 'children': [] },
            { 'value': '유량_1007555', 'label': '여주시(양촌교)', 'children': [] },
            { 'value': '유량_1007535', 'label': '여주시(여주대교)', 'children': [] },
            { 'value': '유량_1007515', 'label': '여주시(원부교)', 'children': [] },
            { 'value': '유량_1007540', 'label': '여주시(율극교)', 'children': [] },
            { 'value': '유량_1007560', 'label': '여주시(이포대교)', 'children': [] },
            { 'value': '유량_1007550', 'label': '여주시(흥천대교)', 'children': [] },
            { 'value': '유량_1007556', 'label': '여주저류지', 'children': [] },
            { 'value': '유량_1022566', 'label': '연천군(고탄교)', 'children': [] },
            { 'value': '유량_1021560', 'label': '연천군(군남댐)', 'children': [] },
            { 'value': '유량_1022565', 'label': '연천군(궁신교)', 'children': [] },
            { 'value': '유량_1022580', 'label': '연천군(사랑교)', 'children': [] },
            { 'value': '유량_1023562', 'label': '연천군(사미천교)', 'children': [] },
            { 'value': '유량_1023540', 'label': '연천군(삼화교)', 'children': [] },
            { 'value': '유량_1022570', 'label': '연천군(신천교)', 'children': [] },
            { 'value': '유량_1021580', 'label': '연천군(임진교)', 'children': [] },
            { 'value': '유량_1022562', 'label': '연천군(차탄교)', 'children': [] },
            { 'value': '유량_1021550', 'label': '연천군(필승교)', 'children': [] },
            { 'value': '유량_1022545', 'label': '연천군(한여울교)', 'children': [] },
            { 'value': '유량_1022544', 'label': '연천군(한탄강댐)', 'children': [] },
            { 'value': '유량_1001580', 'label': '영월2', 'children': [] },
            { 'value': '유량_1001570', 'label': '영월군(거운교)', 'children': [] },
            { 'value': '유량_1002580', 'label': '영월군(두학교)', 'children': [] },
            { 'value': '유량_1002595', 'label': '영월군(북쌍리)', 'children': [] },
            { 'value': '유량_1001583', 'label': '영월군(삼옥교)', 'children': [] },
            { 'value': '유량_1002587', 'label': '영월군(신천교)', 'children': [] },
            { 'value': '유량_1001590', 'label': '영월군(영월대교)', 'children': [] },
            { 'value': '유량_1003520', 'label': '영월군(옥동교)', 'children': [] },
            { 'value': '유량_1002585', 'label': '영월군(주천교)', 'children': [] },
            { 'value': '유량_1003505', 'label': '영월군(충혼교)', 'children': [] },
            { 'value': '유량_1002555', 'label': '영월군(판운교)', 'children': [] },
            { 'value': '유량_1002598', 'label': '영월군(팔괴교)', 'children': [] },
            { 'value': '유량_1010584', 'label': '오탄교', 'children': [] },
            { 'value': '유량_1004592', 'label': '용당', 'children': [] },
            { 'value': '유량_1010577', 'label': '용신교', 'children': [] },
            { 'value': '유량_1016507', 'label': '용인시(월촌교)', 'children': [] },
            { 'value': '유량_1003546', 'label': '우화교', 'children': [] },
            { 'value': '유량_1004588', 'label': '원남', 'children': [] },
            { 'value': '유량_1005597', 'label': '원주시(남한강대교)', 'children': [] },
            { 'value': '유량_1006590', 'label': '원주시(문막교)', 'children': [] },
            { 'value': '유량_1005595', 'label': '원주시(법천교)', 'children': [] },
            { 'value': '유량_1006570', 'label': '원주시(옥산교)', 'children': [] },
            { 'value': '유량_1006565', 'label': '원주시(원주교)', 'children': [] },
            { 'value': '유량_1006572', 'label': '원주시(장현교)', 'children': [] },
            { 'value': '유량_1006580', 'label': '원주시(지정대교)', 'children': [] },
            { 'value': '유량_1003568', 'label': '월악', 'children': [] },
            { 'value': '유량_1007510', 'label': '음성군(총천교)', 'children': [] },
            { 'value': '유량_1013535', 'label': '의암댐', 'children': [] },
            { 'value': '유량_1018565', 'label': '의정부시(신곡교)', 'children': [] },
            { 'value': '유량_1007545', 'label': '이천시(복하교)', 'children': [] },
            { 'value': '유량_1007505', 'label': '이천시(장호원교)', 'children': [] },
            { 'value': '유량_1007562', 'label': '이포보(상류)', 'children': [] },
            { 'value': '유량_1007564', 'label': '이포보(하류)', 'children': [] },
            { 'value': '유량_1011593', 'label': '인제군(도리촌교)', 'children': [] },
            { 'value': '유량_1011595', 'label': '인제군(리빙스턴교)', 'children': [] },
            { 'value': '유량_1011520', 'label': '인제군(반월촌교)', 'children': [] },
            { 'value': '유량_1012557', 'label': '인제군(사구미교)', 'children': [] },
            { 'value': '유량_1012570', 'label': '인제군(양구대교)', 'children': [] },
            { 'value': '유량_1012535', 'label': '인제군(양지교)', 'children': [] },
            { 'value': '유량_1011550', 'label': '인제군(어두원교)', 'children': [] },
            { 'value': '유량_1012530', 'label': '인제군(왕성동교)', 'children': [] },
            { 'value': '유량_1012550', 'label': '인제군(원대교)', 'children': [] },
            { 'value': '유량_1011590', 'label': '인제군(월학리)', 'children': [] },
            { 'value': '유량_1012545', 'label': '인제군(하죽천교)', 'children': [] },
            { 'value': '유량_1012540', 'label': '인제군(현리교)', 'children': [] },
            { 'value': '유량_1018545', 'label': '자양', 'children': [] },
            { 'value': '유량_1001547', 'label': '정선1', 'children': [] },
            { 'value': '유량_1001540', 'label': '정선3', 'children': [] },
            { 'value': '유량_1001558', 'label': '정선군(광하교)', 'children': [] },
            { 'value': '유량_1001530', 'label': '정선군(나전교)', 'children': [] },
            { 'value': '유량_1001560', 'label': '정선군(낙동교)', 'children': [] },
            { 'value': '유량_1001529', 'label': '정선군(남평대교)', 'children': [] },
            { 'value': '유량_1001520', 'label': '정선군(송계교)', 'children': [] },
            { 'value': '유량_1001525', 'label': '정선군(송천교)', 'children': [] },
            { 'value': '유량_1001549', 'label': '정선군(애산교)', 'children': [] },
            { 'value': '유량_1001545', 'label': '정선군(와평교)', 'children': [] },
            { 'value': '유량_1001555', 'label': '정선군(정선제1교)', 'children': [] },
            { 'value': '유량_1001526', 'label': '정선군(제1여량교)', 'children': [] },
            { 'value': '유량_1001522', 'label': '정선군(혈천교)', 'children': [] },
            { 'value': '유량_1003561', 'label': '제천시(구곡교)', 'children': [] },
            { 'value': '유량_1003555', 'label': '제천시(물태리)', 'children': [] },
            { 'value': '유량_1003558', 'label': '제천시(부수동교)', 'children': [] },
            { 'value': '유량_1003560', 'label': '제천시(팔송교)', 'children': [] },
            { 'value': '유량_1012588', 'label': '지내', 'children': [] },
            { 'value': '유량_1022538', 'label': '철원군(군탄교)', 'children': [] },
            { 'value': '유량_1022530', 'label': '철원군(삼합교)', 'children': [] },
            { 'value': '유량_1022526', 'label': '철원군(장수대교)', 'children': [] },
            { 'value': '유량_1022535', 'label': '철원군(한탄대교)', 'children': [] },
            { 'value': '유량_1004520', 'label': '청주시(옥화1교)', 'children': [] },
            { 'value': '유량_1015539', 'label': '청평댐', 'children': [] },
            { 'value': '유량_1012595', 'label': '춘천2', 'children': [] },
            { 'value': '유량_1010588', 'label': '춘천댐', 'children': [] },
            { 'value': '유량_1013545', 'label': '춘천시(강촌교)', 'children': [] },
            { 'value': '유량_1013537', 'label': '춘천시(소양2교)', 'children': [] },
            { 'value': '유량_1012580', 'label': '춘천시(소양강댐)', 'children': [] },
            { 'value': '유량_1012582', 'label': '춘천시(소양강댐방수로)', 'children': [] },
            { 'value': '유량_1012585', 'label': '춘천시(천전리)', 'children': [] },
            { 'value': '유량_1010590', 'label': '춘천시(춘천댐)', 'children': [] },
            { 'value': '유량_1010595', 'label': '춘천시(춘천댐하류)', 'children': [] },
            { 'value': '유량_1003580', 'label': '충주1', 'children': [] },
            { 'value': '유량_1003564', 'label': '충주본댐우안', 'children': [] },
            { 'value': '유량_1004595', 'label': '충주시(국원대교)', 'children': [] },
            { 'value': '유량_1005540', 'label': '충주시(목계교)', 'children': [] },
            { 'value': '유량_1004580', 'label': '충주시(문강교)', 'children': [] },
            { 'value': '유량_1003566', 'label': '충주시(충주댐)', 'children': [] },
            { 'value': '유량_1003565', 'label': '충주시(충주댐방수로)', 'children': [] },
            { 'value': '유량_1005535', 'label': '충주시(충주조정지댐)', 'children': [] },
            { 'value': '유량_1005520', 'label': '충주시(충주조정지댐방수로)', 'children': [] },
            { 'value': '유량_1005505', 'label': '충주시(탄금교)', 'children': [] },
            { 'value': '유량_1004590', 'label': '충주시(향산리)', 'children': [] },
            { 'value': '유량_1001503', 'label': '태백시(무사교)', 'children': [] },
            { 'value': '유량_1019580', 'label': '파주시(교하교)', 'children': [] },
            { 'value': '유량_1023560', 'label': '파주시(비룡대교)', 'children': [] },
            { 'value': '유량_1023580', 'label': '파주시(아가메교)', 'children': [] },
            { 'value': '유량_1023570', 'label': '파주시(통일대교)', 'children': [] },
            { 'value': '유량_1017578', 'label': '팔당댐', 'children': [] },
            { 'value': '유량_1004585', 'label': '팔봉교', 'children': [] },
            { 'value': '유량_1002515', 'label': '평창군(백옥포교)', 'children': [] },
            { 'value': '유량_1002535', 'label': '평창군(사초교)', 'children': [] },
            { 'value': '유량_1002540', 'label': '평창군(상방림교)', 'children': [] },
            { 'value': '유량_1002525', 'label': '평창군(선애교)', 'children': [] },
            { 'value': '유량_1001502', 'label': '평창군(송정교)', 'children': [] },
            { 'value': '유량_1002505', 'label': '평창군(이목정교)', 'children': [] },
            { 'value': '유량_1002510', 'label': '평창군(장평교)', 'children': [] },
            { 'value': '유량_1002550', 'label': '평창군(평창교)', 'children': [] },
            { 'value': '유량_1022542', 'label': '포천시(대회산교)', 'children': [] },
            { 'value': '유량_1022555', 'label': '포천시(신백의교)', 'children': [] },
            { 'value': '유량_1022543', 'label': '포천시(영로대교)', 'children': [] },
            { 'value': '유량_1022550', 'label': '포천시(영평교)', 'children': [] },
            { 'value': '유량_1022540', 'label': '포천시(용담교)', 'children': [] },
            { 'value': '유량_1022548', 'label': '포천시(은현교)', 'children': [] },
            { 'value': '유량_1010535', 'label': '하리교', 'children': [] },
            { 'value': '유량_1014595', 'label': '한덕교', 'children': [] },
            { 'value': '유량_1018528', 'label': '행주(등록문화재)', 'children': [] },
            { 'value': '유량_1014548', 'label': '홍천강(남산교)', 'children': [] },
            { 'value': '유량_1014535', 'label': '홍천강(성포교)', 'children': [] },
            { 'value': '유량_1014540', 'label': '홍천군(굴운교)', 'children': [] },
            { 'value': '유량_1014565', 'label': '홍천군(남노일대교)', 'children': [] },
            { 'value': '유량_1014596', 'label': '홍천군(모곡교)', 'children': [] },
            { 'value': '유량_1014580', 'label': '홍천군(반곡교)', 'children': [] },
            { 'value': '유량_1014520', 'label': '홍천군(용선교)', 'children': [] },
            { 'value': '유량_1014530', 'label': '홍천군(주음치교)', 'children': [] },
            { 'value': '유량_1014550', 'label': '홍천군(홍천교)', 'children': [] },
            { 'value': '유량_1010570', 'label': '화천군(오작교)', 'children': [] },
            { 'value': '유량_1009552', 'label': '화천군(평화나래교)', 'children': [] },
            { 'value': '유량_1009550', 'label': '화천군(평화의댐)', 'children': [] },
            { 'value': '유량_1010580', 'label': '화천군(화천대교)', 'children': [] },
            { 'value': '유량_1010560', 'label': '화천군(화천댐)', 'children': [] },
            { 'value': '유량_1010561', 'label': '화천댐', 'children': [] },
            { 'value': '유량_1002575', 'label': '횡성군(안흥교)', 'children': [] },
            { 'value': '유량_1006530', 'label': '횡성군(오산교)', 'children': [] },
            { 'value': '유량_1006510', 'label': '횡성군(율동리)', 'children': [] },
            { 'value': '유량_1006560', 'label': '횡성군(전천교)', 'children': [] },
            { 'value': '유량_1006512', 'label': '횡성군(포동2교)', 'children': [] },
            { 'value': '유량_1006550', 'label': '횡성군(횡성교)', 'children': [] },
            { 'value': '유량_1006515', 'label': '횡성군(횡성댐)', 'children': [] },
            { 'value': '유량_1004535', 'label': '후영교', 'children': [] },
            { 'value': '유량_1007549', 'label': '흑천', 'children': [] }]
        },
        {
            'value': '유량_11',
            'label': '안성천',
            'children': [{ 'value': '유량_1101515', 'label': '고삼', 'children': [] },
            { 'value': '유량_1101509', 'label': '금광', 'children': [] },
            { 'value': '유량_1101595', 'label': '아산만(내)', 'children': [] },
            { 'value': '유량_1101596', 'label': '아산만(외)', 'children': [] },
            { 'value': '유량_1101585', 'label': '아산호', 'children': [] },
            { 'value': '유량_1101520', 'label': '안성시(건천리)', 'children': [] },
            { 'value': '유량_1101510', 'label': '안성시(옥산대교)', 'children': [] },
            { 'value': '유량_1101545', 'label': '오산시(탑동대교)', 'children': [] },
            { 'value': '유량_1101530', 'label': '천안시(안성천교)', 'children': [] },
            { 'value': '유량_1101535', 'label': '평택시(군문교)', 'children': [] },
            { 'value': '유량_1101570', 'label': '평택시(동연교)', 'children': [] },
            { 'value': '유량_1101563', 'label': '평택시(진위1교)', 'children': [] },
            { 'value': '유량_1101580', 'label': '평택시(팽성대교)', 'children': [] },
            { 'value': '유량_1101565', 'label': '평택시(회화리)', 'children': [] },
            { 'value': '유량_1101550', 'label': '화성시(수직교)', 'children': [] },
            { 'value': '유량_1101505', 'label': '화성시(화산교)', 'children': [] }]
        },
        {
            'value': '유량_12',
            'label': '한강서해',
            'children': [{ 'value': '유량_1201520', 'label': '강화군(강화대교)', 'children': [] },
            { 'value': '유량_1202570', 'label': '남양(외)', 'children': [] },
            { 'value': '유량_1202560', 'label': '반월1', 'children': [] },
            { 'value': '유량_1202530', 'label': '반월2', 'children': [] },
            { 'value': '유량_1201551', 'label': '아라서해갑문(내)', 'children': [] },
            { 'value': '유량_1201553', 'label': '아라서해갑문(외)', 'children': [] },
            { 'value': '유량_1021552', 'label': '아라서해갑실(남)', 'children': [] },
            { 'value': '유량_1201552', 'label': '아라서해갑실(남)', 'children': [] },
            { 'value': '유량_1201554', 'label': '아라서해갑실(북)', 'children': [] }]
        },
        {
            'value': '유량_13',
            'label': '한강동해',
            'children': [{ 'value': '유량_1302570', 'label': '강릉시(송림교)', 'children': [] },
            { 'value': '유량_1302548', 'label': '강릉시(회산교)', 'children': [] },
            { 'value': '유량_1302563', 'label': '동해시(달방댐)', 'children': [] },
            { 'value': '유량_1302568', 'label': '동해시(북평교)', 'children': [] },
            { 'value': '유량_1302565', 'label': '동해시(원평교)', 'children': [] },
            { 'value': '유량_1303510', 'label': '삼척시(남양촌교)', 'children': [] },
            { 'value': '유량_1303550', 'label': '삼척시(상정교)', 'children': [] },
            { 'value': '유량_1303580', 'label': '삼척시(오십천교)', 'children': [] },
            { 'value': '유량_1301558', 'label': '양양군(양양대교)', 'children': [] },
            { 'value': '유량_1301530', 'label': '양양군(용천2교)', 'children': [] },
            { 'value': '유량_1302545', 'label': '오봉', 'children': [] }]
        }]
        //  - 낙동강
        r02_flux = [{
            'value': '유량_20',
            'label': '낙동강',
            'children': [{ 'value': '유량_2015550', 'label': '가북', 'children': [] },
            { 'value': '유량_2011597', 'label': '강정보(임)', 'children': [] },
            { 'value': '유량_2008560', 'label': '강창1', 'children': [] },
            { 'value': '유량_3005520', 'label': '강창2', 'children': [] },
            { 'value': '유량_2015545', 'label': '거창', 'children': [] },
            { 'value': '유량_2015535', 'label': '거창군(거열교)', 'children': [] },
            { 'value': '유량_2015530', 'label': '거창군(남하교)', 'children': [] },
            { 'value': '유량_2015520', 'label': '거창군(의동교)', 'children': [] },
            { 'value': '유량_2015555', 'label': '거창군(지산교)', 'children': [] },
            { 'value': '유량_2012548', 'label': '경산시(압량교)', 'children': [] },
            { 'value': '유량_2012550', 'label': '경산시(환상리)', 'children': [] },
            { 'value': '유량_2021535', 'label': '경주시(매곡교)', 'children': [] },
            { 'value': '유량_2021510', 'label': '경주시(의곡교)', 'children': [] },
            { 'value': '유량_2004585', 'label': '경천댐', 'children': [] },
            { 'value': '유량_2006560', 'label': '계산', 'children': [] },
            { 'value': '유량_2014540', 'label': '고령군(고령교)', 'children': [] },
            { 'value': '유량_2013540', 'label': '고령군(귀원교)', 'children': [] },
            { 'value': '유량_2014551', 'label': '고령군(달성보하)', 'children': [] },
            { 'value': '유량_2013590', 'label': '고령군(도진교)', 'children': [] },
            { 'value': '유량_2013585', 'label': '고령군(사촌리)', 'children': [] },
            { 'value': '유량_2013550', 'label': '고령군(회천교)', 'children': [] },
            { 'value': '유량_2008520', 'label': '고로', 'children': [] },
            { 'value': '유량_2019510', 'label': '고성군(두문교)', 'children': [] },
            { 'value': '유량_2012502', 'label': '고현', 'children': [] },
            { 'value': '유량_2011540', 'label': '구미시(구미대교)', 'children': [] },
            { 'value': '유량_2009580', 'label': '구미시(구미보상)', 'children': [] },
            { 'value': '유량_2009582', 'label': '구미시(구미보하)', 'children': [] },
            { 'value': '유량_2010590', 'label': '구미시(선주교)', 'children': [] },
            { 'value': '유량_2011525', 'label': '구미시(양포교)', 'children': [] },
            { 'value': '유량_2009570', 'label': '구미시(일선교)', 'children': [] },
            { 'value': '유량_2008503', 'label': '군위군(군위댐)', 'children': [] },
            { 'value': '유량_2008505', 'label': '군위군(동곡교)', 'children': [] },
            { 'value': '유량_2008550', 'label': '군위군(무성리)', 'children': [] },
            { 'value': '유량_2008530', 'label': '군위군(미성교)', 'children': [] },
            { 'value': '유량_2008535', 'label': '군위군(병수리)', 'children': [] },
            { 'value': '유량_2008521', 'label': '군위군(화수교)', 'children': [] },
            { 'value': '유량_2008545', 'label': '군위군(효령교)', 'children': [] },
            { 'value': '유량_2003535', 'label': '금봉', 'children': [] },
            { 'value': '유량_2010530', 'label': '김천시(교리)', 'children': [] },
            { 'value': '유량_2010550', 'label': '김천시(김천교)', 'children': [] },
            { 'value': '유량_2010525', 'label': '김천시(김천부항댐)', 'children': [] },
            { 'value': '유량_2010560', 'label': '김천시(대동교)', 'children': [] },
            { 'value': '유량_2010523', 'label': '김천시(도곡리)', 'children': [] },
            { 'value': '유량_2010520', 'label': '김천시(지좌리)', 'children': [] },
            { 'value': '유량_2010535', 'label': '김천시(지품교)', 'children': [] },
            { 'value': '유량_2020580', 'label': '김해시(오서교)', 'children': [] },
            { 'value': '유량_2022540', 'label': '김해시(월촌리)', 'children': [] },
            { 'value': '유량_2022585', 'label': '김해시(정천교)', 'children': [] },
            { 'value': '유량_2019560', 'label': '남지교', 'children': [] },
            { 'value': '유량_2007545', 'label': '달지2', 'children': [] },
            { 'value': '유량_2014565', 'label': '달창', 'children': [] },
            { 'value': '유량_2014570', 'label': '달창', 'children': [] },
            { 'value': '유량_2011596', 'label': '대구시(강정고령보하)', 'children': [] },
            { 'value': '유량_2012595', 'label': '대구시(강창교)', 'children': [] },
            { 'value': '유량_2014580', 'label': '대구시(내리)', 'children': [] },
            { 'value': '유량_2014550', 'label': '대구시(달성보상)', 'children': [] },
            { 'value': '유량_2012565', 'label': '대구시(동화교)', 'children': [] },
            { 'value': '유량_2012596', 'label': '대구시(매곡리)', 'children': [] },
            { 'value': '유량_2014520', 'label': '대구시(사문진교)', 'children': [] },
            { 'value': '유량_2012570', 'label': '대구시(산격대교)', 'children': [] },
            { 'value': '유량_2012552', 'label': '대구시(성동교)', 'children': [] },
            { 'value': '유량_2012590', 'label': '대구시(성북교)', 'children': [] },
            { 'value': '유량_2014560', 'label': '대구시(성하리)', 'children': [] },
            { 'value': '유량_2012560', 'label': '대구시(신암동)', 'children': [] },
            { 'value': '유량_2012553', 'label': '대구시(안심교)', 'children': [] },
            { 'value': '유량_2001560', 'label': '도산', 'children': [] },
            { 'value': '유량_2302560', 'label': '독산', 'children': [] },
            { 'value': '유량_2008510', 'label': '동곡', 'children': [] },
            { 'value': '유량_2504595', 'label': '명지', 'children': [] },
            { 'value': '유량_2002510', 'label': '무계', 'children': [] },
            { 'value': '유량_2005540', 'label': '문경시(갈마교)', 'children': [] },
            { 'value': '유량_2005560', 'label': '문경시(김용리)', 'children': [] },
            { 'value': '유량_2007520', 'label': '문경시(말응리)', 'children': [] },
            { 'value': '유량_2005550', 'label': '문경시(불정동)', 'children': [] },
            { 'value': '유량_2007540', 'label': '문경시(이목리)', 'children': [] },
            { 'value': '유량_2021570', 'label': '밀양시(금곡리)', 'children': [] },
            { 'value': '유량_2021577', 'label': '밀양시(남천교)', 'children': [] },
            { 'value': '유량_2021585', 'label': '밀양시(남포동)', 'children': [] },
            { 'value': '유량_2021560', 'label': '밀양시(밀양댐)', 'children': [] },
            { 'value': '유량_2022510', 'label': '밀양시(삼랑진교)', 'children': [] },
            { 'value': '유량_2021590', 'label': '밀양시(삼상교)', 'children': [] },
            { 'value': '유량_2021565', 'label': '밀양시(상동교)', 'children': [] },
            { 'value': '유량_2021575', 'label': '밀양시(용평동)', 'children': [] },
            { 'value': '유량_2020551', 'label': '밀양시(인교)', 'children': [] },
            { 'value': '유량_2020503', 'label': '밀양시(판곡교)', 'children': [] },
            { 'value': '유량_2002506', 'label': '보현', 'children': [] },
            { 'value': '유량_2001550', 'label': '봉화', 'children': [] },
            { 'value': '유량_2001525', 'label': '봉화군(광회교)', 'children': [] },
            { 'value': '유량_2001515', 'label': '봉화군(대현교)', 'children': [] },
            { 'value': '유량_2001555', 'label': '봉화군(도천교)', 'children': [] },
            { 'value': '유량_2004505', 'label': '봉화군(봉화대교)', 'children': [] },
            { 'value': '유량_2001528', 'label': '봉화군(분천교)', 'children': [] },
            { 'value': '유량_2001558', 'label': '봉화군(양삼교)', 'children': [] },
            { 'value': '유량_2001530', 'label': '봉화군(임기리)', 'children': [] },
            { 'value': '유량_2012545', 'label': '봉화군(풍호리)', 'children': [] },
            { 'value': '유량_2001529', 'label': '봉화군(현동교)', 'children': [] },
            { 'value': '유량_2022580', 'label': '부산시(구포대교)', 'children': [] },
            { 'value': '유량_2022597', 'label': '부산시(낙동강하구언(외))', 'children': [] },
            { 'value': '유량_2018545', 'label': '산청군(경호교)', 'children': [] },
            { 'value': '유량_2018540', 'label': '산청군(고읍교)', 'children': [] },
            { 'value': '유량_2018574', 'label': '산청군(묵곡교)', 'children': [] },
            { 'value': '유량_2018562', 'label': '산청군(소이교)', 'children': [] },
            { 'value': '유량_2018550', 'label': '산청군(수산교)', 'children': [] },
            { 'value': '유량_2018573', 'label': '산청군(원리교)', 'children': [] },
            { 'value': '유량_2018580', 'label': '산청군(창촌리)', 'children': [] },
            { 'value': '유량_2018565', 'label': '산청군(하정리)', 'children': [] },
            { 'value': '유량_2018553', 'label': '삼가', 'children': [] },
            { 'value': '유량_2007586', 'label': '상주시(강창교)', 'children': [] },
            { 'value': '유량_2006525', 'label': '상주시(병성교)', 'children': [] },
            { 'value': '유량_2005570', 'label': '상주시(상우교)', 'children': [] },
            { 'value': '유량_2007580', 'label': '상주시(상주보상)', 'children': [] },
            { 'value': '유량_2007582', 'label': '상주시(상주보하)', 'children': [] },
            { 'value': '유량_2006530', 'label': '상주시(소천2교)', 'children': [] },
            { 'value': '유량_2005580', 'label': '상주시(이안교)', 'children': [] },
            { 'value': '유량_2006575', 'label': '상주시(화계교)', 'children': [] },
            { 'value': '유량_2006565', 'label': '상주시(후천교)', 'children': [] },
            { 'value': '유량_2019551', 'label': '서암', 'children': [] },
            { 'value': '유량_2013511', 'label': '성주', 'children': [] },
            { 'value': '유량_2013515', 'label': '성주군(가천교)', 'children': [] },
            { 'value': '유량_2011565', 'label': '성주군(도성교)', 'children': [] },
            { 'value': '유량_2011560', 'label': '성주군(성주대교)', 'children': [] },
            { 'value': '유량_2013520', 'label': '성주군(화죽교)', 'children': [] },
            { 'value': '유량_2018558', 'label': '손항', 'children': [] },
            { 'value': '유량_2004525', 'label': '송리원', 'children': [] },
            { 'value': '유량_2018575', 'label': '시천', 'children': [] },
            { 'value': '유량_2012580', 'label': '신천1', 'children': [] },
            { 'value': '유량_2012581', 'label': '신천2', 'children': [] },
            { 'value': '유량_2012575', 'label': '신천3', 'children': [] },
            { 'value': '유량_2003505', 'label': '안동2', 'children': [] },
            { 'value': '유량_2003550', 'label': '안동시(검암교)', 'children': [] },
            { 'value': '유량_2002595', 'label': '안동시(대사3교)', 'children': [] },
            { 'value': '유량_2002585', 'label': '안동시(묵계교)', 'children': [] },
            { 'value': '유량_2002586', 'label': '안동시(신덕교)', 'children': [] },
            { 'value': '유량_2003510', 'label': '안동시(안동대교)', 'children': [] },
            { 'value': '유량_2001585', 'label': '안동시(안동댐)', 'children': [] },
            { 'value': '유량_2001580', 'label': '안동시(안동댐방수로)', 'children': [] },
            { 'value': '유량_2001590', 'label': '안동시(안동조정지댐)', 'children': [] },
            { 'value': '유량_2003540', 'label': '안동시(운산리)', 'children': [] },
            { 'value': '유량_2002577', 'label': '안동시(임하댐)', 'children': [] },
            { 'value': '유량_2002575', 'label': '안동시(임하댐방수로)', 'children': [] },
            { 'value': '유량_2002580', 'label': '안동시(임하조정지댐)', 'children': [] },
            { 'value': '유량_2002592', 'label': '안동시(포진교)', 'children': [] },
            { 'value': '유량_2021550', 'label': '양산시(대리)', 'children': [] },
            { 'value': '유량_2022560', 'label': '양산시(양산교)', 'children': [] },
            { 'value': '유량_2022570', 'label': '양산시(호포대교)', 'children': [] },
            { 'value': '유량_2022555', 'label': '양산시(효충교)', 'children': [] },
            { 'value': '유량_2002520', 'label': '영양군(양평교)', 'children': [] },
            { 'value': '유량_2002533', 'label': '영양군(임천교)', 'children': [] },
            { 'value': '유량_2002534', 'label': '영양군(청암교)', 'children': [] },
            { 'value': '유량_2002538', 'label': '영양군(흥구교)', 'children': [] },
            { 'value': '유량_2002535', 'label': '영양군(흥구리)', 'children': [] },
            { 'value': '유량_2004540', 'label': '영주시(석탑교)', 'children': [] },
            { 'value': '유량_2004530', 'label': '영주시(영주댐)', 'children': [] },
            { 'value': '유량_2004510', 'label': '영주시(영주유사조절지)', 'children': [] },
            { 'value': '유량_2004532', 'label': '영주시(용혈리)', 'children': [] },
            { 'value': '유량_2004535', 'label': '영주시(월호교)', 'children': [] },
            { 'value': '유량_2004508', 'label': '영주시(이산교)', 'children': [] },
            { 'value': '유량_2012507', 'label': '영천시(굼이교)', 'children': [] },
            { 'value': '유량_2012540', 'label': '영천시(금창교)', 'children': [] },
            { 'value': '유량_2012525', 'label': '영천시(단포교)', 'children': [] },
            { 'value': '유량_2012510', 'label': '영천시(보현산댐)', 'children': [] },
            { 'value': '유량_2012528', 'label': '영천시(영동교)', 'children': [] },
            { 'value': '유량_2012532', 'label': '영천시(영양교)', 'children': [] },
            { 'value': '유량_2012515', 'label': '영천시(영천댐)', 'children': [] },
            { 'value': '유량_2012512', 'label': '영천시(자천교)', 'children': [] },
            { 'value': '유량_2021580', 'label': '예림교', 'children': [] },
            { 'value': '유량_2001570', 'label': '예안', 'children': [] },
            { 'value': '유량_2004555', 'label': '예천군(고평교)', 'children': [] },
            { 'value': '유량_2003570', 'label': '예천군(구담교)', 'children': [] },
            { 'value': '유량_2004550', 'label': '예천군(미호교)', 'children': [] },
            { 'value': '유량_2004595', 'label': '예천군(산양교)', 'children': [] },
            { 'value': '유량_2007560', 'label': '예천군(상풍교)', 'children': [] },
            { 'value': '유량_2004568', 'label': '예천군(신예천교)', 'children': [] },
            { 'value': '유량_2004575', 'label': '예천군(신음리)', 'children': [] },
            { 'value': '유량_2004580', 'label': '예천군(회룡교)', 'children': [] },
            { 'value': '유량_2006503', 'label': '오태', 'children': [] },
            { 'value': '유량_2014525', 'label': '옥연', 'children': [] },
            { 'value': '유량_2018570', 'label': '원지', 'children': [] },
            { 'value': '유량_2019553', 'label': '의령군(공단교)', 'children': [] },
            { 'value': '유량_2017530', 'label': '의령군(대곡교)', 'children': [] },
            { 'value': '유량_2019595', 'label': '의령군(성산리)', 'children': [] },
            { 'value': '유량_2017585', 'label': '의령군(세간교)', 'children': [] },
            { 'value': '유량_2017570', 'label': '의령군(여의리)', 'children': [] },
            { 'value': '유량_2019555', 'label': '의령군(정암교)', 'children': [] },
            { 'value': '유량_2008528', 'label': '의성군(구미교)', 'children': [] },
            { 'value': '유량_2009520', 'label': '의성군(낙단교)', 'children': [] },
            { 'value': '유량_2009518', 'label': '의성군(낙단보상)', 'children': [] },
            { 'value': '유량_2008531', 'label': '의성군(덕은교)', 'children': [] },
            { 'value': '유량_2008565', 'label': '의성군(동부교)', 'children': [] },
            { 'value': '유량_2008532', 'label': '의성군(비안교)', 'children': [] },
            { 'value': '유량_2008590', 'label': '의성군(위중리)', 'children': [] },
            { 'value': '유량_2003590', 'label': '의성군(풍지교)', 'children': [] },
            { 'value': '유량_2018598', 'label': '진주시(남강댐방수로)', 'children': [] },
            { 'value': '유량_2018590', 'label': '진주시(내평리)', 'children': [] },
            { 'value': '유량_2019535', 'label': '진주시(덕오리)', 'children': [] },
            { 'value': '유량_2019525', 'label': '진주시(옥산교)', 'children': [] },
            { 'value': '유량_2019540', 'label': '진주시(월강교)', 'children': [] },
            { 'value': '유량_2019515', 'label': '진주시(장대동)', 'children': [] },
            { 'value': '유량_2019547', 'label': '진주시(장박교)', 'children': [] },
            { 'value': '유량_2018595', 'label': '진주시(판문동)', 'children': [] },
            { 'value': '유량_2020505', 'label': '창녕군(강리)', 'children': [] },
            { 'value': '유량_2017540', 'label': '창녕군(유어교)', 'children': [] },
            { 'value': '유량_2020547', 'label': '창녕군(창녕함안보상)', 'children': [] },
            { 'value': '유량_2020550', 'label': '창녕군(청암리)', 'children': [] },
            { 'value': '유량_2015590', 'label': '창리', 'children': [] },
            { 'value': '유량_2020575', 'label': '창원시(수산대교)', 'children': [] },
            { 'value': '유량_2001575', 'label': '천전', 'children': [] },
            { 'value': '유량_2021530', 'label': '청도군(당호리)', 'children': [] },
            { 'value': '유량_2021512', 'label': '청도군(신원교)', 'children': [] },
            { 'value': '유량_2021520', 'label': '청도군(운문댐)', 'children': [] },
            { 'value': '유량_2021540', 'label': '청도군(원리)', 'children': [] },
            { 'value': '유량_2021525', 'label': '청도군(임당리)', 'children': [] },
            { 'value': '유량_2002545', 'label': '청송군(광덕교)', 'children': [] },
            { 'value': '유량_2002555', 'label': '청송군(덕천교)', 'children': [] },
            { 'value': '유량_2002516', 'label': '청송군(명당리)', 'children': [] },
            { 'value': '유량_2002509', 'label': '청송군(성덕댐)', 'children': [] },
            { 'value': '유량_2002530', 'label': '청송군(송강2교)', 'children': [] },
            { 'value': '유량_2011548', 'label': '칠곡군(칠곡보상)', 'children': [] },
            { 'value': '유량_2011549', 'label': '칠곡군(칠곡보하)', 'children': [] },
            { 'value': '유량_2011550', 'label': '칠곡군(호국의다리)', 'children': [] },
            { 'value': '유량_2001513', 'label': '태백시(루사교)', 'children': [] },
            { 'value': '유량_2001510', 'label': '태백시(문화교)', 'children': [] },
            { 'value': '유량_2501520', 'label': '판문', 'children': [] },
            { 'value': '유량_2012505', 'label': '포항시(논골교)', 'children': [] },
            { 'value': '유량_2002513', 'label': '포항시(상사4교)', 'children': [] },
            { 'value': '유량_2022520', 'label': '하단', 'children': [] },
            { 'value': '유량_2018585', 'label': '하동군(대곡리)', 'children': [] },
            { 'value': '유량_2020515', 'label': '함안군(계내리)', 'children': [] },
            { 'value': '유량_2019585', 'label': '함안군(대사교)', 'children': [] },
            { 'value': '유량_2019580', 'label': '함안군(서촌리)', 'children': [] },
            { 'value': '유량_2020540', 'label': '함안군(소랑교)', 'children': [] },
            { 'value': '유량_2019520', 'label': '함안군(송도교)', 'children': [] },
            { 'value': '유량_2020546', 'label': '함안군(창녕함안보하)', 'children': [] },
            { 'value': '유량_2018508', 'label': '함양군(금천리)', 'children': [] },
            { 'value': '유량_2018523', 'label': '함양군(대웅교)', 'children': [] },
            { 'value': '유량_2018509', 'label': '함양군(안의교)', 'children': [] },
            { 'value': '유량_2018520', 'label': '함양군(용평리)', 'children': [] },
            { 'value': '유량_2018530', 'label': '함양군(의탄리)', 'children': [] },
            { 'value': '유량_2018535', 'label': '함양군(화촌리)', 'children': [] },
            { 'value': '유량_2013530', 'label': '합천군(구정리)', 'children': [] },
            { 'value': '유량_2016550', 'label': '합천군(남정교)', 'children': [] },
            { 'value': '유량_2018555', 'label': '합천군(소오리)', 'children': [] },
            { 'value': '유량_2015537', 'label': '합천군(술곡교)', 'children': [] },
            { 'value': '유량_2014590', 'label': '합천군(율지교)', 'children': [] },
            { 'value': '유량_2017520', 'label': '합천군(적포교)', 'children': [] },
            { 'value': '유량_2015580', 'label': '합천군(합천댐)', 'children': [] },
            { 'value': '유량_2016530', 'label': '합천군(합천댐방수로)', 'children': [] },
            { 'value': '유량_2016535', 'label': '합천군(합천조정지댐)', 'children': [] },
            { 'value': '유량_2016540', 'label': '합천군(합천조정지방수로)', 'children': [] },
            { 'value': '유량_2014597', 'label': '합천군(합천창녕보상)', 'children': [] },
            { 'value': '유량_2014599', 'label': '합천군(합천창녕보하)', 'children': [] },
            { 'value': '유량_2016580', 'label': '합천군(황강교)', 'children': [] },
            { 'value': '유량_2002536', 'label': '홍구', 'children': [] }]
        },
        {
            'value': '유량_21',
            'label': '형산강',
            'children': [{ 'value': '유량_2101575', 'label': '경주시(강동대교)', 'children': [] },
            { 'value': '유량_2101580', 'label': '경주시(국당리)', 'children': [] },
            { 'value': '유량_2101568', 'label': '경주시(달성교)', 'children': [] },
            { 'value': '유량_2101510', 'label': '경주시(망성교)', 'children': [] },
            { 'value': '유량_2101550', 'label': '경주시(모아리)', 'children': [] },
            { 'value': '유량_2101525', 'label': '경주시(서천교)', 'children': [] },
            { 'value': '유량_2101572', 'label': '경주시(안계댐)', 'children': [] },
            { 'value': '유량_2101520', 'label': '경주시(효현교)', 'children': [] },
            { 'value': '유량_2101532', 'label': '보문', 'children': [] },
            { 'value': '유량_2101590', 'label': '포항시(형산교)', 'children': [] }]
        },
        {
            'value': '유량_22',
            'label': '태화강',
            'children': [{ 'value': '유량_2201511', 'label': '울산시(구수교)', 'children': [] },
            { 'value': '유량_2201553', 'label': '울산시(구영교)', 'children': [] },
            { 'value': '유량_2201510', 'label': '울산시(대곡댐)', 'children': [] },
            { 'value': '유량_2201513', 'label': '울산시(대암교)', 'children': [] },
            { 'value': '유량_2201515', 'label': '울산시(대암댐)', 'children': [] },
            { 'value': '유량_2201517', 'label': '울산시(반구교)', 'children': [] },
            { 'value': '유량_2201590', 'label': '울산시(병영교)', 'children': [] },
            { 'value': '유량_2201530', 'label': '울산시(사연교)', 'children': [] },
            { 'value': '유량_2201525', 'label': '울산시(사연댐)', 'children': [] },
            { 'value': '유량_2201560', 'label': '울산시(삼호교)', 'children': [] },
            { 'value': '유량_2201540', 'label': '울산시(선바위교)', 'children': [] },
            { 'value': '유량_2201585', 'label': '울산시(신답교)', 'children': [] },
            { 'value': '유량_2201514', 'label': '울산시(왕방교)', 'children': [] },
            { 'value': '유량_2201570', 'label': '울산시(태화교)', 'children': [] },
            { 'value': '유량_2201550', 'label': '척과', 'children': [] }]
        },
        {
            'value': '유량_23',
            'label': '회야ㆍ수영강',
            'children': [{
                'value': '유량_2022596',
                'label': '부산시(낙동강하구언(내))',
                'children': []
            },
            { 'value': '유량_2302595', 'label': '부산시(신평동)', 'children': [] },
            { 'value': '유량_2302550', 'label': '부산시(원동교)', 'children': [] },
            { 'value': '유량_2301570', 'label': '울산시(덕신교)', 'children': [] },
            { 'value': '유량_2301550', 'label': '울산시(동천1교)', 'children': [] },
            { 'value': '유량_2301540', 'label': '울산시(선암댐)', 'children': [] },
            { 'value': '유량_2301530', 'label': '울산시(통천교)', 'children': [] }]
        },
        {
            'value': '유량_24',
            'label': '낙동강동해',
            'children': [{ 'value': '유량_2403510', 'label': '경주시(감포댐)', 'children': [] },
            { 'value': '유량_2402520', 'label': '영덕군(대지리)', 'children': [] },
            { 'value': '유량_2402530', 'label': '영덕군(영덕대교)', 'children': [] },
            { 'value': '유량_2401590', 'label': '영덕군(인량교)', 'children': [] },
            { 'value': '유량_2401520', 'label': '울진군(구산리)', 'children': [] },
            { 'value': '유량_2401550', 'label': '울진군(수산교)', 'children': [] }]
        },
        {
            'value': '유량_25',
            'label': '낙동강남해',
            'children': [{ 'value': '유량_2503550', 'label': '거제시(구천교)', 'children': [] },
            { 'value': '유량_2503540', 'label': '거제시(구천댐)', 'children': [] },
            { 'value': '유량_2503520', 'label': '거제시(연초댐)', 'children': [] },
            { 'value': '유량_2503525', 'label': '거제시(죽전교)', 'children': [] },
            { 'value': '유량_2018592', 'label': '사천시(검정리)', 'children': [] }]
        }]
        //  - 금강
        r03_flux = [{
            'value': '유량_30',
            'label': '금강',
            'children': [{ 'value': '유량_3012533', 'label': '공주시(공주보상)', 'children': [] },
            { 'value': '유량_3012534', 'label': '공주시(공주보하)', 'children': [] },
            { 'value': '유량_3012535', 'label': '공주시(국재교)', 'children': [] },
            { 'value': '유량_3012520', 'label': '공주시(금강교)', 'children': [] },
            { 'value': '유량_3012512', 'label': '공주시(마암리)', 'children': [] },
            { 'value': '유량_3012525', 'label': '공주시(오인교)', 'children': [] },
            { 'value': '유량_3012530', 'label': '공주시(평소리)', 'children': [] },
            { 'value': '유량_3014590', 'label': '금강하구둑(내)', 'children': [] },
            { 'value': '유량_3014595', 'label': '금강하구둑(외)', 'children': [] },
            { 'value': '유량_3009520', 'label': '금산군(문암교)', 'children': [] },
            { 'value': '유량_3004545', 'label': '금산군(음대교)', 'children': [] },
            { 'value': '유량_3004520', 'label': '금산군(적벽교)', 'children': [] },
            { 'value': '유량_3008570', 'label': '금산군(제원교)', 'children': [] },
            { 'value': '유량_3004540', 'label': '금산군(제원대교)', 'children': [] },
            { 'value': '유량_3004537', 'label': '금산군(황풍교)', 'children': [] },
            { 'value': '유량_3007552', 'label': '기대교(지)', 'children': [] },
            { 'value': '유량_3012504', 'label': '나성', 'children': [] },
            { 'value': '유량_3013570', 'label': '논산시(논산대교)', 'children': [] },
            { 'value': '유량_3012590', 'label': '논산시(동성교)', 'children': [] },
            { 'value': '유량_3012581', 'label': '논산시(석성천교)', 'children': [] },
            { 'value': '유량_3013505', 'label': '논산시(인천교)', 'children': [] },
            { 'value': '유량_3013585', 'label': '논산시(제내교)', 'children': [] },
            { 'value': '유량_3013565', 'label': '논산시(풋개다리)', 'children': [] },
            { 'value': '유량_3014510', 'label': '논산시(황산대교)', 'children': [] },
            { 'value': '유량_3001503', 'label': '대곡', 'children': [] },
            { 'value': '유량_3009565', 'label': '대전시(가수원교)', 'children': [] },
            { 'value': '유량_3008595', 'label': '대전시(금강1교)', 'children': [] },
            { 'value': '유량_3009575', 'label': '대전시(대덕대교)', 'children': [] },
            { 'value': '유량_3008580', 'label': '대전시(대청조정지댐)', 'children': [] },
            { 'value': '유량_3009555', 'label': '대전시(두계교)', 'children': [] },
            { 'value': '유량_3009570', 'label': '대전시(만년교)', 'children': [] },
            { 'value': '유량_3009530', 'label': '대전시(복수교)', 'children': [] },
            { 'value': '유량_3009598', 'label': '대전시(봉산동)', 'children': [] },
            { 'value': '유량_3009593', 'label': '대전시(신구교)', 'children': [] },
            { 'value': '유량_3009550', 'label': '대전시(용촌교)', 'children': [] },
            { 'value': '유량_3009580', 'label': '대전시(원촌교)', 'children': [] },
            { 'value': '유량_3009540', 'label': '대전시(인창교)', 'children': [] },
            { 'value': '유량_3009545', 'label': '대전시(철갑교)', 'children': [] },
            { 'value': '유량_3009573', 'label': '대전시(한밭대교)', 'children': [] },
            { 'value': '유량_3014556', 'label': '덕용', 'children': [] },
            { 'value': '유량_3007506', 'label': '두평', 'children': [] },
            { 'value': '유량_3011507', 'label': '맹동', 'children': [] },
            { 'value': '유량_3002555', 'label': '무주군(대티교)', 'children': [] },
            { 'value': '유량_3003520', 'label': '무주군(신촌농2교)', 'children': [] },
            { 'value': '유량_3003560', 'label': '무주군(여의교)', 'children': [] },
            { 'value': '유량_3003580', 'label': '무주군(취수장)', 'children': [] },
            { 'value': '유량_3011527', 'label': '미호', 'children': [] },
            { 'value': '유량_3011512', 'label': '백곡', 'children': [] },
            { 'value': '유량_3007550', 'label': '보은군(기대교)', 'children': [] },
            { 'value': '유량_3007545', 'label': '보은군(대양교)', 'children': [] },
            { 'value': '유량_3007510', 'label': '보은군(산성교)', 'children': [] },
            { 'value': '유량_3007520', 'label': '보은군(이평교)', 'children': [] },
            { 'value': '유량_3007540', 'label': '보은군(탄부교)', 'children': [] },
            { 'value': '유량_3007526', 'label': '보청', 'children': [] },
            { 'value': '유량_3012585', 'label': '부여군(반조원리)', 'children': [] },
            { 'value': '유량_3012575', 'label': '부여군(백제교)', 'children': [] },
            { 'value': '유량_3012564', 'label': '부여군(백제보하)', 'children': [] },
            { 'value': '유량_3012580', 'label': '부여군(석동교)', 'children': [] },
            { 'value': '유량_3012574', 'label': '부여군(송학교)', 'children': [] },
            { 'value': '유량_3014550', 'label': '부여군(입포리)', 'children': [] },
            { 'value': '유량_3012565', 'label': '부여군(지천교)', 'children': [] },
            { 'value': '유량_3007562', 'label': '산계교(지)', 'children': [] },
            { 'value': '유량_3014580', 'label': '서천군(북원교)', 'children': [] },
            { 'value': '유량_3014570', 'label': '서천군(옥포리)', 'children': [] },
            { 'value': '유량_3012506', 'label': '세종보(상)', 'children': [] },
            { 'value': '유량_3012505', 'label': '세종시(금남교)', 'children': [] },
            { 'value': '유량_3010520', 'label': '세종시(노호리)', 'children': [] },
            { 'value': '유량_3012507', 'label': '세종시(도암교)', 'children': [] },
            { 'value': '유량_3010560', 'label': '세종시(명학리)', 'children': [] },
            { 'value': '유량_3011585', 'label': '세종시(미호교)', 'children': [] },
            { 'value': '유량_3012509', 'label': '세종시(산봉교)', 'children': [] },
            { 'value': '유량_3011575', 'label': '세종시(상조천교)', 'children': [] },
            { 'value': '유량_3012508', 'label': '세종시(세종보하)', 'children': [] },
            { 'value': '유량_3011595', 'label': '세종시(월산교)', 'children': [] },
            { 'value': '유량_3011587', 'label': '세종시(월암교)', 'children': [] },
            { 'value': '유량_3012502', 'label': '세종시(햇무리교)', 'children': [] },
            { 'value': '유량_3005581', 'label': '송천', 'children': [] },
            { 'value': '유량_3004510', 'label': '수통', 'children': [] },
            { 'value': '유량_3005570', 'label': '영동군(금상교)', 'children': [] },
            { 'value': '유량_3005575', 'label': '영동군(백화교)', 'children': [] },
            { 'value': '유량_3005590', 'label': '영동군(심천교)', 'children': [] },
            { 'value': '유량_3004590', 'label': '영동군(양강교)', 'children': [] },
            { 'value': '유량_3004580', 'label': '영동군(영동제2교)', 'children': [] },
            { 'value': '유량_3005580', 'label': '영동군(율리)', 'children': [] },
            { 'value': '유량_3004585', 'label': '영동군(초강교)', 'children': [] },
            { 'value': '유량_3004550', 'label': '영동군(호탄리)', 'children': [] },
            { 'value': '유량_3011557', 'label': '오창', 'children': [] },
            { 'value': '유량_3006580', 'label': '옥천군', 'children': [] },
            { 'value': '유량_3007560', 'label': '옥천군(산계교)', 'children': [] },
            { 'value': '유량_3007570', 'label': '옥천군(산계리)', 'children': [] },
            { 'value': '유량_3008530', 'label': '옥천군(옥각교)', 'children': [] },
            { 'value': '유량_3006575', 'label': '옥천군(이원대교)', 'children': [] },
            { 'value': '유량_3011586', 'label': '용암', 'children': [] },
            { 'value': '유량_3006550', 'label': '이원', 'children': [] },
            { 'value': '유량_3001520', 'label': '장수군(연화교)', 'children': [] },
            { 'value': '유량_3001505', 'label': '장수군(운곡교)', 'children': [] },
            { 'value': '유량_3001510', 'label': '장수군(장계제2교)', 'children': [] },
            { 'value': '유량_3001580', 'label': '주천', 'children': [] },
            { 'value': '유량_3011525', 'label': '증평군(반탄교)', 'children': [] },
            { 'value': '유량_3002550', 'label': '진안군(감동교)', 'children': [] },
            { 'value': '유량_3001560', 'label': '진안군(석정교)', 'children': [] },
            { 'value': '유량_3001540', 'label': '진안군(성산리)', 'children': [] },
            { 'value': '유량_3001530', 'label': '진안군(송대교)', 'children': [] },
            { 'value': '유량_3002530', 'label': '진안군(신용담교)', 'children': [] },
            { 'value': '유량_3001590', 'label': '진안군(용담댐)', 'children': [] },
            { 'value': '유량_3001595', 'label': '진안군(용담댐방수로)', 'children': [] },
            { 'value': '유량_3011520', 'label': '진천군(가산교)', 'children': [] },
            { 'value': '유량_3011517', 'label': '진천군(금곡교)', 'children': [] },
            { 'value': '유량_3011515', 'label': '진천군(신정교)', 'children': [] },
            { 'value': '유량_3011524', 'label': '진천군(오갑교)', 'children': [] },
            { 'value': '유량_3011523', 'label': '진천군(인산리)', 'children': [] },
            { 'value': '유량_3011550', 'label': '천안시(장산교)', 'children': [] },
            { 'value': '유량_3012562', 'label': '청양군(백제보상)', 'children': [] },
            { 'value': '유량_3012550', 'label': '청양군(신흥리)', 'children': [] },
            { 'value': '유량_3012555', 'label': '청양군(지천교)', 'children': [] },
            { 'value': '유량_3011541', 'label': '청주시(노동교)', 'children': [] },
            { 'value': '유량_3008590', 'label': '청주시(대청댐)', 'children': [] },
            { 'value': '유량_3008585', 'label': '청주시(대청댐방수로)', 'children': [] },
            { 'value': '유량_3011565', 'label': '청주시(미호천교)', 'children': [] },
            { 'value': '유량_3011530', 'label': '청주시(여암교)', 'children': [] },
            { 'value': '유량_3011543', 'label': '청주시(용평교)', 'children': [] },
            { 'value': '유량_3011535', 'label': '청주시(팔결교)', 'children': [] },
            { 'value': '유량_3011560', 'label': '청주시(환희교)', 'children': [] },
            { 'value': '유량_3011545', 'label': '청주시(흥덕교)', 'children': [] },
            { 'value': '유량_3013550', 'label': '탑정', 'children': [] },
            { 'value': '유량_3013552', 'label': '탑정2', 'children': [] }]
        },
        {
            'value': '유량_31',
            'label': '삽교천',
            'children': [{ 'value': '유량_3101579', 'label': '궁평', 'children': [] },
            { 'value': '유량_3101580', 'label': '궁평', 'children': [] },
            { 'value': '유량_3101565', 'label': '남관', 'children': [] },
            { 'value': '유량_3101550', 'label': '당진시(구양교)', 'children': [] },
            { 'value': '유량_3101593', 'label': '당진시(신촌리)', 'children': [] },
            { 'value': '유량_3101520', 'label': '대흥', 'children': [] },
            { 'value': '유량_3101515', 'label': '무봉', 'children': [] },
            { 'value': '유량_3101595', 'label': '삽교호', 'children': [] },
            { 'value': '유량_3101590', 'label': '아산시(강청교)', 'children': [] },
            { 'value': '유량_3101572', 'label': '아산시(덕지리)', 'children': [] },
            { 'value': '유량_3101573', 'label': '아산시(새터교)', 'children': [] },
            { 'value': '유량_3101583', 'label': '아산시(온천교)', 'children': [] },
            { 'value': '유량_3101585', 'label': '아산시(충무교)', 'children': [] },
            { 'value': '유량_3101575', 'label': '아산시(한내다리)', 'children': [] },
            { 'value': '유량_3101570', 'label': '아산시(휴대교)', 'children': [] },
            { 'value': '유량_3102523', 'label': '예당', 'children': [] },
            { 'value': '유량_3101545', 'label': '예산군(구만교)', 'children': [] },
            { 'value': '유량_3101513', 'label': '예산군(서계양교)', 'children': [] },
            { 'value': '유량_3101530', 'label': '예산군(신례원교)', 'children': [] },
            { 'value': '유량_3101538', 'label': '예산군(신리교)', 'children': [] },
            { 'value': '유량_3101525', 'label': '예산군(예산대교)', 'children': [] },
            { 'value': '유량_3101504', 'label': '예산군(은사교)', 'children': [] },
            { 'value': '유량_3101540', 'label': '예산군(충의대교)', 'children': [] },
            { 'value': '유량_3101560', 'label': '천안시(가송교)', 'children': [] },
            { 'value': '유량_3101555', 'label': '천안시(신흥교)', 'children': [] },
            { 'value': '유량_3101535', 'label': '홍성군(삽교천교)', 'children': [] }]
        },
        {
            'value': '유량_32',
            'label': '금강서해',
            'children': [{ 'value': '유량_3201580', 'label': '고풍', 'children': [] },
            { 'value': '유량_3201590', 'label': '당진시(채운교)', 'children': [] },
            { 'value': '유량_3203555', 'label': '대창', 'children': [] },
            { 'value': '유량_3203552', 'label': '보령시(노천교)', 'children': [] },
            { 'value': '유량_3203520', 'label': '보령시(동대교)', 'children': [] },
            { 'value': '유량_3203540', 'label': '보령시(보령댐)', 'children': [] },
            { 'value': '유량_3203545', 'label': '보령시(보령댐방수로)', 'children': [] },
            { 'value': '유량_3203529', 'label': '청천', 'children': [] },
            { 'value': '유량_3203530', 'label': '청천', 'children': [] }]
        },
        {
            'value': '유량_33',
            'label': '만경ㆍ동진',
            'children': [{ 'value': '유량_3301518', 'label': '경천', 'children': [] },
            { 'value': '유량_3301520', 'label': '경천', 'children': [] },
            { 'value': '유량_3301550', 'label': '구이', 'children': [] },
            { 'value': '유량_3301588', 'label': '군산시(원두교)', 'children': [] },
            { 'value': '유량_3302565', 'label': '김제시(군포교)', 'children': [] },
            { 'value': '유량_3301590', 'label': '김제시(만경대교)', 'children': [] },
            { 'value': '유량_3302580', 'label': '김제시(용동교)', 'children': [] },
            { 'value': '유량_3302585', 'label': '김제시(죽산교)', 'children': [] },
            { 'value': '유량_3302535', 'label': '내장', 'children': [] },
            { 'value': '유량_3301510', 'label': '대아', 'children': [] },
            { 'value': '유량_3301511', 'label': '대아', 'children': [] },
            { 'value': '유량_3301505', 'label': '동상', 'children': [] },
            { 'value': '유량_3302590', 'label': '동진대교', 'children': [] },
            { 'value': '유량_3302575', 'label': '부안군(평교)', 'children': [] },
            { 'value': '유량_3303570', 'label': '부안댐', 'children': [] },
            { 'value': '유량_3302540', 'label': '부전', 'children': [] },
            { 'value': '유량_3301560', 'label': '색장', 'children': [] },
            { 'value': '유량_3301532', 'label': '소양천', 'children': [] },
            { 'value': '유량_3302510', 'label': '수청', 'children': [] },
            { 'value': '유량_3302511', 'label': '수청', 'children': [] },
            { 'value': '유량_3301515', 'label': '신흥천', 'children': [] },
            { 'value': '유량_3301523', 'label': '완주군(마안교)', 'children': [] },
            { 'value': '유량_3301570', 'label': '완주군(삼례교)', 'children': [] },
            { 'value': '유량_3301535', 'label': '완주군(소양용연교)', 'children': [] },
            { 'value': '유량_3301525', 'label': '완주군(오성교)', 'children': [] },
            { 'value': '유량_3301530', 'label': '완주군(용봉교)', 'children': [] },
            { 'value': '유량_3301540', 'label': '완주군(제2소양교)', 'children': [] },
            { 'value': '유량_3301545', 'label': '완주군(하리교)', 'children': [] },
            { 'value': '유량_3302550', 'label': '용산', 'children': [] },
            { 'value': '유량_3301585', 'label': '익산시(만경교)', 'children': [] },
            { 'value': '유량_3301575', 'label': '익산시(인수교)', 'children': [] },
            { 'value': '유량_3301565', 'label': '전주시(미산교)', 'children': [] },
            { 'value': '유량_3301553', 'label': '전주시(삼천교)', 'children': [] },
            { 'value': '유량_3301555', 'label': '전주시(서곡교)', 'children': [] },
            { 'value': '유량_3301557', 'label': '전주시(서천교)', 'children': [] },
            { 'value': '유량_3301554', 'label': '전주시(세내교)', 'children': [] },
            { 'value': '유량_3301552', 'label': '전주시(신평교)', 'children': [] },
            { 'value': '유량_3301562', 'label': '전주시(은석교)', 'children': [] },
            { 'value': '유량_3302520', 'label': '정읍시(거산교)', 'children': [] },
            { 'value': '유량_3302543', 'label': '정읍시(상동교)', 'children': [] },
            { 'value': '유량_3302560', 'label': '정읍시(양전교)', 'children': [] },
            { 'value': '유량_3302530', 'label': '정읍시(정우교)', 'children': [] },
            { 'value': '유량_3302553', 'label': '정읍시(정읍교)', 'children': [] },
            { 'value': '유량_3302555', 'label': '정읍시(정읍천대교)', 'children': [] },
            { 'value': '유량_3302517', 'label': '정읍시(종산리)', 'children': [] },
            { 'value': '유량_3302545', 'label': '정읍시(죽림교)', 'children': [] },
            { 'value': '유량_3302558', 'label': '정읍시(초강리)', 'children': [] },
            { 'value': '유량_3302557', 'label': '정읍시(풍월교)', 'children': [] },
            { 'value': '유량_3302515', 'label': '정읍시(행정교)', 'children': [] },
            { 'value': '유량_3302505', 'label': '칠보', 'children': [] }]
        }]
        //  - 영산강
        r04_flux = [{
            'value': '유량_40',
            'label': '섬진강',
            'children': [{ 'value': '유량_4006560', 'label': '곡성군(고달교)', 'children': [] },
            { 'value': '유량_4004590', 'label': '곡성군(금곡교)', 'children': [] },
            { 'value': '유량_4008560', 'label': '곡성군(목사동1교)', 'children': [] },
            { 'value': '유량_4008555', 'label': '곡성군(목사동2교)', 'children': [] },
            { 'value': '유량_4006580', 'label': '곡성군(예성교)', 'children': [] },
            { 'value': '유량_4008570', 'label': '곡성군(태안교)', 'children': [] },
            { 'value': '유량_4004550', 'label': '곡성군(합강교)', 'children': [] },
            { 'value': '유량_4007520', 'label': '광곡교', 'children': [] },
            { 'value': '유량_4009550', 'label': '광양시(고사리)', 'children': [] },
            { 'value': '유량_4009540', 'label': '광양시(남도대교)', 'children': [] },
            { 'value': '유량_4009510', 'label': '구례군(구례교)', 'children': [] },
            { 'value': '유량_4009525', 'label': '구례군(서시교)', 'children': [] },
            { 'value': '유량_4009530', 'label': '구례군(송정리)', 'children': [] },
            { 'value': '유량_4005570', 'label': '남원시(동림교)', 'children': [] },
            { 'value': '유량_4004560', 'label': '남원시(신덕리)', 'children': [] },
            { 'value': '유량_4005560', 'label': '남원시(요천교)', 'children': [] },
            { 'value': '유량_4005590', 'label': '남원시(요천대교)', 'children': [] },
            { 'value': '유량_4005545', 'label': '남원시(월석교)', 'children': [] },
            { 'value': '유량_4005528', 'label': '동화', 'children': [] },
            { 'value': '유량_4005530', 'label': '동화', 'children': [] },
            { 'value': '유량_4007530', 'label': '보성군(가장교)', 'children': [] },
            { 'value': '유량_4007525', 'label': '보성군(보성강댐)', 'children': [] },
            { 'value': '유량_4004530', 'label': '순창군(옥천교)', 'children': [] },
            { 'value': '유량_4001560', 'label': '순창군(운암교)', 'children': [] },
            { 'value': '유량_4004515', 'label': '순창군(유적교)', 'children': [] },
            { 'value': '유량_4004540', 'label': '순창군(유풍교)', 'children': [] },
            { 'value': '유량_4002590', 'label': '순창군(평남리)', 'children': [] },
            { 'value': '유량_4003590', 'label': '순창군(현포리)', 'children': [] },
            { 'value': '유량_4008550', 'label': '순천시(광천교)', 'children': [] },
            { 'value': '유량_4009508', 'label': '순천시(용서교)', 'children': [] },
            { 'value': '유량_4007595', 'label': '순천시(주암댐)', 'children': [] },
            { 'value': '유량_4005524', 'label': '용림', 'children': [] },
            { 'value': '유량_4002505', 'label': '임실군(섬진강댐)', 'children': [] },
            { 'value': '유량_4003550', 'label': '임실군(신기교)', 'children': [] },
            { 'value': '유량_4002540', 'label': '임실군(일중리)', 'children': [] },
            { 'value': '유량_4001520', 'label': '임실군(호암교)', 'children': [] },
            { 'value': '유량_4002510', 'label': '임실군(회문리)', 'children': [] },
            { 'value': '유량_4003515', 'label': '장남', 'children': [] },
            { 'value': '유량_4005520', 'label': '장남', 'children': [] },
            { 'value': '유량_4007515', 'label': '죽동교', 'children': [] },
            { 'value': '유량_4001510', 'label': '진안군(좌포교)', 'children': [] },
            { 'value': '유량_4009568', 'label': '하동', 'children': [] },
            { 'value': '유량_4009538', 'label': '하동군(가탄교)', 'children': [] },
            { 'value': '유량_4009570', 'label': '하동군(대석교)', 'children': [] },
            { 'value': '유량_4009565', 'label': '하동군(읍내리)', 'children': [] },
            { 'value': '유량_4007560', 'label': '화순군(동복댐)', 'children': [] },
            { 'value': '유량_4007570', 'label': '화순군(용리교)', 'children': [] }]
        },
        {
            'value': '유량_41',
            'label': '섬진강남해',
            'children': [{ 'value': '유량_4105530', 'label': '광양시(서산교)', 'children': [] },
            { 'value': '유량_4105570', 'label': '광양시(수어천교)', 'children': [] },
            { 'value': '유량_4105540', 'label': '광양시(용강교)', 'children': [] },
            { 'value': '유량_4105565', 'label': '광양시(지원교)', 'children': [] },
            { 'value': '유량_4007523', 'label': '보성강댐', 'children': [] },
            { 'value': '유량_4105560', 'label': '수어댐', 'children': [] },
            { 'value': '유량_4104510', 'label': '순천시(노동교)', 'children': [] },
            { 'value': '유량_4104565', 'label': '순천시(노디목교)', 'children': [] },
            { 'value': '유량_4104580', 'label': '순천시(동천교)', 'children': [] },
            { 'value': '유량_4104503', 'label': '순천시(송전교)', 'children': [] },
            { 'value': '유량_4104585', 'label': '순천시(연동교)', 'children': [] },
            { 'value': '유량_4104520', 'label': '순천시(주암조절지댐)', 'children': [] },
            { 'value': '유량_4104525', 'label': '순천시(주암조절지방수로)', 'children': [] },
            { 'value': '유량_4104555', 'label': '순천시(주암조절지조정지댐)', 'children': [] }]
        },
        {
            'value': '유량_50',
            'label': '영산강',
            'children': [{ 'value': '유량_5001580', 'label': '광주광역시(극락교)', 'children': [] },
            { 'value': '유량_5001570', 'label': '광주광역시(설월교)', 'children': [] },
            { 'value': '유량_5004520', 'label': '광주광역시(승용교)', 'children': [] },
            { 'value': '유량_5001560', 'label': '광주광역시(어등대교)', 'children': [] },
            { 'value': '유량_5001540', 'label': '광주광역시(용산교)', 'children': [] },
            { 'value': '유량_5002560', 'label': '광주광역시(용진교)', 'children': [] },
            { 'value': '유량_5001550', 'label': '광주광역시(유촌교)', 'children': [] },
            { 'value': '유량_5002590', 'label': '광주광역시(장록교)', 'children': [] },
            { 'value': '유량_5001573', 'label': '광주광역시(천교)', 'children': [] },
            { 'value': '유량_5001545', 'label': '광주광역시(첨단대교)', 'children': [] },
            { 'value': '유량_5002577', 'label': '광주광역시(평림교)', 'children': [] },
            { 'value': '유량_5001555', 'label': '광주광역시(풍영정천2교)', 'children': [] },
            { 'value': '유량_5004550', 'label': '나주시(나주대교)', 'children': [] },
            { 'value': '유량_5003540', 'label': '나주시(나주댐)', 'children': [] },
            { 'value': '유량_5003580', 'label': '나주시(남평교)', 'children': [] },
            { 'value': '유량_5004555', 'label': '나주시(동곡리)', 'children': [] },
            { 'value': '유량_5004570', 'label': '나주시(영산교)', 'children': [] },
            { 'value': '유량_5003550', 'label': '나주시(우산교)', 'children': [] },
            { 'value': '유량_5001530', 'label': '담양군(광주댐)', 'children': [] },
            { 'value': '유량_5001515', 'label': '담양군(금월교)', 'children': [] },
            { 'value': '유량_5001510', 'label': '담양군(담양댐)', 'children': [] },
            { 'value': '유량_5001520', 'label': '담양군(덕용교)', 'children': [] },
            { 'value': '유량_5001525', 'label': '담양군(삼지교)', 'children': [] },
            { 'value': '유량_5001527', 'label': '담양군(양지교)', 'children': [] },
            { 'value': '유량_5001518', 'label': '담양군(장천교)', 'children': [] },
            { 'value': '유량_5006521', 'label': '대동', 'children': [] },
            { 'value': '유량_5006570', 'label': '무안군(몽탄대교)', 'children': [] },
            { 'value': '유량_5002567', 'label': '수양(함동)', 'children': [] },
            { 'value': '유량_5004530', 'label': '승촌보(하류)', 'children': [] },
            { 'value': '유량_5007540', 'label': '영암군(해창교)', 'children': [] },
            { 'value': '유량_5002543', 'label': '장성군(금계리)', 'children': [] },
            { 'value': '유량_5002510', 'label': '장성군(용동교)', 'children': [] },
            { 'value': '유량_5002520', 'label': '장성군(장성댐)', 'children': [] },
            { 'value': '유량_5002550', 'label': '장성군(제2황룡교)', 'children': [] },
            { 'value': '유량_5002570', 'label': '장성군(죽탄교)', 'children': [] },
            { 'value': '유량_5004598', 'label': '죽산보(하류)', 'children': [] },
            { 'value': '유량_5008590', 'label': '하구언(내)', 'children': [] },
            { 'value': '유량_5008595', 'label': '하구언(외)', 'children': [] },
            { 'value': '유량_5005550', 'label': '함평군(나산교)', 'children': [] },
            { 'value': '유량_5006510', 'label': '함평군(동강교)', 'children': [] },
            { 'value': '유량_5006520', 'label': '함평군(영수교)', 'children': [] },
            { 'value': '유량_5005580', 'label': '함평군(원고막교)', 'children': [] },
            { 'value': '유량_5006530', 'label': '함평군(학야교)', 'children': [] },
            { 'value': '유량_5003510', 'label': '화순군(능주교)', 'children': [] },
            { 'value': '유량_5003504', 'label': '화순군(세청교)', 'children': [] },
            { 'value': '유량_5003520', 'label': '화순군(신성교)', 'children': [] },
            { 'value': '유량_5003505', 'label': '화순군(용두교)', 'children': [] },
            { 'value': '유량_5003515', 'label': '화순군(주도교)', 'children': [] }]
        },
        {
            'value': '유량_51',
            'label': '탐진강',
            'children': [{ 'value': '유량_5101590', 'label': '강진군(석교교)', 'children': [] },
            { 'value': '유량_5101580', 'label': '강진군(풍동리)', 'children': [] },
            { 'value': '유량_5101575', 'label': '장흥군(감천교)', 'children': [] },
            { 'value': '유량_5101520', 'label': '장흥군(동산교)', 'children': [] },
            { 'value': '유량_5101550', 'label': '장흥군(별천교)', 'children': [] },
            { 'value': '유량_5101570', 'label': '장흥군(예양교)', 'children': [] },
            { 'value': '유량_5101531', 'label': '장흥군(장흥댐)', 'children': [] }]
        },
        {
            'value': '유량_53',
            'label': '영산강서해',
            'children': [{ 'value': '유량_5301560', 'label': '고창군(부정교)', 'children': [] },
            { 'value': '유량_5301590', 'label': '고창군(용선교)', 'children': [] },
            { 'value': '유량_5302540', 'label': '불갑', 'children': [] },
            { 'value': '유량_5302520', 'label': '영광군(반와교)', 'children': [] }]
        }]

        function add_flux_att(flux_list) {
            for (let i = 0; i < flux_list.length; i++) {
                const flux_emptyNodes = findEmptyLabel(flux_list[i]);
                for (const emptyNode of flux_emptyNodes) {
                    const att_list = [];
                    const att_flux_nm = ["유량(㎥/s)"]
                    // const att_flux_nm = ["유량"]
                    const att_flux_code = ["FLUX"]
                    for (let i = 0; i < att_flux_nm.length; i++) {
                        const att_node = {
                            value: emptyNode.value + '_' + att_flux_code[i],
                            label: att_flux_nm[i]
                        };
                        att_list.push(att_node);
                    }
                    emptyNode.children = att_list
                }
            }
        }
        add_flux_att([r01_flux, r02_flux, r03_flux, r04_flux])
        parentNodeList[0].children[4].children = r01_flux
        parentNodeList[1].children[4].children = r02_flux
        parentNodeList[2].children[4].children = r03_flux
        parentNodeList[3].children[4].children = r04_flux

        // 조류
        //  - 한강
        r01_swmn = [
            { 'value': '조류_1011G50', 'label': '의암호(신연교)', 'children': [] },
            { 'value': '조류_1007G20', 'label': '한강(이천)', 'children': [] },
            { 'value': '조류_1003G40', 'label': '충주호(댐앞)', 'children': [] },
            { 'value': '조류_1003G30', 'label': '충주호(황강나루)', 'children': [] },
            { 'value': '조류_1101G10', 'label': '광교지(취수탑)', 'children': [] },
            { 'value': '조류_1010G60', 'label': '춘천호(춘성교 교각)', 'children': [] },
            { 'value': '조류_1018G02', 'label': '한강(강동대교)', 'children': [] },
            { 'value': '조류_1018G03', 'label': '한강(구의)', 'children': [] },
            { 'value': '조류_1018G04', 'label': '한강(잠실철교)', 'children': [] },
            { 'value': '조류_1018G05', 'label': '한강(광진교)', 'children': [] },
            { 'value': '조류_1006G30', 'label': '횡성호(취수탑)', 'children': [] },
            { 'value': '조류_1017G20', 'label': '팔당호(댐앞)', 'children': [] },
            { 'value': '조류_1017G21', 'label': '팔당호(부용사앞)', 'children': [] },
            { 'value': '조류_1017G22', 'label': '팔당호(삼봉)', 'children': [] },
            { 'value': '조류_1003G20', 'label': '충주호(청풍교)', 'children': [] },
            { 'value': '조류_1010G50', 'label': '춘천호(용산취수장)', 'children': [] },
            { 'value': '조류_1018G01', 'label': '한강(미사대교)', 'children': [] },
            { 'value': '조류_1018G06', 'label': '한강(성수대교)', 'children': [] },
            { 'value': '조류_1018G07', 'label': '한강(한남대교)', 'children': [] },
            { 'value': '조류_1018G09', 'label': '한강(마포대교)', 'children': [] },
            { 'value': '조류_1018G08', 'label': '한강(한강대교)', 'children': [] },
            { 'value': '조류_1018G10', 'label': '한강(성산대교)', 'children': [] },
            { 'value': '조류_1007A20', 'label': '강천보(강천)', 'children': [] },
            { 'value': '조류_1007A27', 'label': '여주보(대신)', 'children': [] },
            { 'value': '조류_1007A60', 'label': '이포보(이포)', 'children': [] }
        ]
        //  - 낙동강
        r02_swmn = [
            { 'value': '조류_2011G26', 'label': '낙동강(해평)', 'children': [] },
            { 'value': '조류_2020G33', 'label': '낙동강(칠서)', 'children': [] },
            { 'value': '조류_2021G20', 'label': '운문호(댐앞)', 'children': [] },
            { 'value': '조류_2021G10', 'label': '운문호(취수탑2)', 'children': [] },
            { 'value': '조류_2012G20', 'label': '영천호(취수탑)', 'children': [] },
            { 'value': '조류_2018G20', 'label': '진양호(내동)', 'children': [] },
            { 'value': '조류_2101G30', 'label': '안계호(취수탑)', 'children': [] },
            { 'value': '조류_2012G55', 'label': '공산지(중앙부)', 'children': [] },
            { 'value': '조류_2012G56', 'label': '공산지(취수탑)', 'children': [] },
            { 'value': '조류_2101G70', 'label': '진전지(상류)', 'children': [] },
            { 'value': '조류_2101G71', 'label': '진전지(하류)', 'children': [] },
            { 'value': '조류_2201G40', 'label': '사연호(취수탑)', 'children': [] },
            { 'value': '조류_2201G30', 'label': '사연호(반연리)', 'children': [] },
            { 'value': '조류_2301G20', 'label': '회야호(취수탑)', 'children': [] },
            { 'value': '조류_2301G10', 'label': '회야호(여수로)', 'children': [] },
            { 'value': '조류_2101G31', 'label': '덕동호(댐앞)', 'children': [] },
            { 'value': '조류_2022G05', 'label': '낙동강(물금·매리)', 'children': [] },
            { 'value': '조류_2018G30', 'label': '진양호(판문)', 'children': [] },
            { 'value': '조류_2011G56', 'label': '낙동강(강정·고령)', 'children': [] },
            { 'value': '조류_2007A25', 'label': '상주보(도남)', 'children': [] },
            { 'value': '조류_2009A05', 'label': '낙단보(낙단)', 'children': [] },
            { 'value': '조류_2009A30', 'label': '구미보(선산)', 'children': [] },
            { 'value': '조류_2011A25', 'label': '칠곡보(칠곡)', 'children': [] },
            { 'value': '조류_2011A55', 'label': '강정고령보(다사)', 'children': [] },
            { 'value': '조류_2014A25', 'label': '달성보(논공)', 'children': [] },
            { 'value': '조류_2014A70', 'label': '합천창녕보(덕곡)', 'children': [] },
            { 'value': '조류_2011A26', 'label': '칠곡보(구미광역취수장)', 'children': [] },
            { 'value': '조류_2011A56', 'label': '강정고령보(고령광역취수장)', 'children': [] },
            { 'value': '조류_2020A33', 'label': '창녕함안보(창원칠서취수장)', 'children': [] },
            { 'value': '조류_9999A99', 'label': '낙동강_시범(고령 지점 표층)', 'children': [] },
            { 'value': '조류_9999A98', 'label': '낙동강_시범(고령 지점 혼합)', 'children': [] },
            { 'value': '조류_7777A77', 'label': '낙동강_시범(매리 지점 표층)', 'children': [] },
            { 'value': '조류_7777A76', 'label': '낙동강_시범(매리 지점 혼합)', 'children': [] },
            { 'value': '조류_6666A66', 'label': '낙동강_시범(레포츠밸리)', 'children': [] },
            { 'value': '조류_6666A55', 'label': '낙동강_시범(구미낙동강레포츠체험센터)', 'children': [] },
            { 'value': '조류_6666A77', 'label': '낙동강_시범(본포수변생태공원)', 'children': [] },
            { 'value': '조류_6666A88', 'label': '낙동강_시범(화명수상레포츠타운)', 'children': [] },
            { 'value': '조류_2020A32', 'label': '창녕함안보(함안)', 'children': [] }
        ]
        //  - 금강
        r03_swmn = [
            { 'value': '조류_3001G11', 'label': '용담호(모정리)', 'children': [] },
            { 'value': '조류_3008G50', 'label': '대청호(문의)', 'children': [] },
            { 'value': '조류_3008G30', 'label': '대청호(회남)', 'children': [] },
            { 'value': '조류_3001G40', 'label': '용담호(댐앞)', 'children': [] },
            { 'value': '조류_3001G20', 'label': '용담호(취수탑)', 'children': [] },
            { 'value': '조류_3001G10', 'label': '용담호(항동리)', 'children': [] },
            { 'value': '조류_3203G20', 'label': '보령호(취수탑)', 'children': [] },
            { 'value': '조류_3008G40', 'label': '대청호(추동)', 'children': [] },
            { 'value': '조류_3012A07', 'label': '세종보(연기)', 'children': [] },
            { 'value': '조류_3012A32', 'label': '공주보(금강)', 'children': [] },
            { 'value': '조류_3012A42', 'label': '백제보(부여)', 'children': [] },
            { 'value': '조류_5555A44', 'label': '금강_시범(서화천)', 'children': [] },
            { 'value': '조류_5555A55', 'label': '금강_시범(웅포대교)', 'children': [] }
        ]
        //  - 영산강
        r04_swmn = [
            { 'value': '조류_4002G12', 'label': '섬진강댐(운암도선장)', 'children': [] },
            { 'value': '조류_4007G40', 'label': '주암호(신평교)', 'children': [] },
            { 'value': '조류_4007G60', 'label': '동복호(취수탑)', 'children': [] },
            { 'value': '조류_4002G10', 'label': '옥정호(칠보취수구)', 'children': [] },
            { 'value': '조류_5101G40', 'label': '탐진호(유치천 합류)', 'children': [] },
            { 'value': '조류_4007G50', 'label': '동복호(중류)', 'children': [] },
            { 'value': '조류_5101G35', 'label': '탐진호(댐앞)', 'children': [] },
            { 'value': '조류_4002G11', 'label': '섬진강댐(사승나루터앞)', 'children': [] },
            { 'value': '조류_4007G70', 'label': '주암호(댐앞)', 'children': [] },
            { 'value': '조류_5004A10', 'label': '승촌보(광산)', 'children': [] },
            { 'value': '조류_5004A35', 'label': '죽산보(죽산)', 'children': [] }
        ]

        function add_swmn_att(swmn_list) {
            for (let i = 0; i < swmn_list.length; i++) {
                const swmn_emptyNodes = findEmptyLabel(swmn_list[i]);
                for (const emptyNode of swmn_emptyNodes) {
                    const att_list = [];
                    const att_swmn_nm = ["수온(℃)", "pH", "DO(㎎/L)", "투명도", "탁도", "Chl-a(㎎/㎥)", "유해남조류 세포수(cells/㎖)", "Microcystis", "Anabaena", "Oscillatoria", "Aphanizomenon", "지오스민(ng/L)", "2MIB(ng/L)", "Microcystin-LR(μg/L)"]
                    // const att_swmn_nm = ["수온", "pH", "DO", "투명도", "탁도", "Chl-a", "유해남조류 세포수", "Microcystis", "Anabaena", "Oscillatoria", "Aphanizomenon", "지오스민", "2MIB", "Microcystin-LR"]
                    const att_swmn_code = ["ITEM_TEMP_SURF", "ITEM_PH_SURF", "ITEM_DOC_SURF", "ITEM_TRANSPARENCY", "ITEM_TURBIDITY", "ITEM_SUF_CLOA", "ITEM_BLUE_GREEN_ALGAE", "ITEM_BGA_MICROCYSTIS", "ITEM_BGA_ANABAENA", "ITEM_BGA_OSILLATORIA", "ITEM_BGA_APHANIZOMENON", "ITEM_GEOSMIN", "ITEM_2MIB", "ITEM_MICROCYSTIN"]
                    for (let i = 0; i < att_swmn_nm.length; i++) {
                        const att_node = {
                            value: emptyNode.value + '_' + att_swmn_code[i],
                            label: att_swmn_nm[i]
                        };
                        att_list.push(att_node);
                    }
                    emptyNode.children = att_list
                }
            }
        }
        add_swmn_att([r01_swmn, r02_swmn, r03_swmn, r04_swmn])
        parentNodeList[0].children[5].children = r01_swmn
        parentNodeList[1].children[5].children = r02_swmn
        parentNodeList[2].children[5].children = r03_swmn
        parentNodeList[3].children[5].children = r04_swmn

        function addShowCheckboxRecursive(obj) {
            const newObj = { ...obj, showCheckbox: false }; // 새로운 객체 생성과 속성 추가
          
            if (newObj.children && newObj.children.length > 0) {
              // 자식 객체들에도 속성 추가
              newObj.children = newObj.children.map(child => addShowCheckboxRecursive(child));
            }
          
            return newObj;
        }

        const updatedRiverData = parentNodeList.map(river => addShowCheckboxRecursive(river));

        // console.log('3350', updatedRiverData)
        res.json({origin: parentNodeList, select: updatedRiverData});
        await connection.close()
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.post('/api/search', (req, res) => { // 데이터 검색
    const data = req.body;
    const select = data.select;
    const search = data.search;
    const dbdata = data.db;
    const result = SeachData(dbdata, select, search);
    if (result.length === 0) res.json({ error: "검색 결과가 없습니다." });
    else res.json(result);

})

// oracle에 맞게 커스터마이징
app.get('/api/chartdata/:val/:kind/:region/:st/:ed', async (req, res) => {
    /*
        return data for draw chart
        data type for chart library - chart.js
    */
    const v = decodeURI(req.params.val); // api 한글이 포함되어 decode 사용
    const k = decodeURI(req.params.kind); // api 한글이 포함되어 decode 사용
    const r = decodeURI(req.params.region);
    const s = decodeURI(req.params.st);
    const e = decodeURI(req.params.ed);
    const connection = await oracledb.getConnection(dbConfig)

    let sql = ''
    if (k == '수질'){
        const table = 'V_MSR_WQMN_DAY'
        sql = `
        SELECT WTRSMPLE_DE, ${v}
        FROM ${table}
        WHERE TO_DATE(WTRSMPLE_DE, 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND WQMN_CODE = '${r}'
        ORDER BY WTRSMPLE_DE
        `
    } else if (k == '수위'){
        const table = 'V_FLU_WLV_DAY'
        sql = `
        SELECT OBSR_DE, ${v}
        FROM ${table}
        WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
        ORDER BY OBSR_DE
        `
    } else if (k == '강수량'){
        const table = 'V_FLU_GDWETHER_DAY'
        sql = `
        SELECT OBSR_DE, ${v}
        FROM ${table}
        WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
        ORDER BY OBSR_DE
        `
    } else if (k == '댐'){
        const table = 'V_FLU_DAM_DAY'
        sql = `
        SELECT YEAR || MT || DE, ${v}
        FROM ${table}
        WHERE TO_DATE(YEAR || MT || DE, 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
        ORDER BY TO_DATE(YEAR || MT || DE, 'YYYYMMDD')
        `
    } else if (k == '유량'){
        const table = 'V_FLU_FLUX_DAY'
        sql = `
        SELECT replace(OBSR_DE, '/', ''), ${v}
        FROM ${table}
        WHERE TO_DATE(replace(OBSR_DE, '/', ''), 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND OBSRVT_CODE = '${r}'
        ORDER BY TO_DATE(replace(OBSR_DE, '/', ''), 'YYYYMMDD')
        `
    } else if (k == '조류'){
        const table = 'V_MSR_SWMN_DAY'
        sql = `
        SELECT CHCK_DE, ${v}
        FROM ${table}
        WHERE TO_DATE(CHCK_DE, 'YYYYMMDD') BETWEEN TO_DATE(${s}, 'YYYYMMDD') AND TO_DATE(${e}, 'YYYYMMDD') AND SWMN_CODE = '${r}'
        ORDER BY CHCK_DE
        `
    } 
    
    const result = await connection.execute(sql)
    const numall = result.rows.length;
    const numok = result.rows.filter(raw => raw[1]).length;
    const numnan = numall - numok;
    const numzero = result.rows.filter(raw => raw[1] === 0).length;
    const data = result.rows.map(raw => raw[1])
    const days = result.rows.map(raw => raw[0])
    await connection.close();
    res.json({ nall: numall, nok: numok, nnan: numnan, nzero: numzero, data: data, days: days})
})

// Using post, get region data => res dataframe
app.post('/api/dataframe', async(req, res) => {
    const data = req.body;
    
    const querys = makedfQuery(data);
    // 기존 지오시스템의 querys 구조
    /*querys [
        [ '기상_가곡' ],
        [
          `SELECT "일시","평균기온" FROM "가곡" as t(일시) WHERE 일시::TIMESTAMP BETWEEN '2023-04-30T00:00:00+09:00'::TIMESTAMP AND '2023-07-31T00:00:00+09:00'::TIMESTAMP;`
        ],
        [ '기상_가곡_평균기온' ]
      ]
    */
    // console.log('querys', querys)
    const regionName = querys[0];
    const query = querys[1];

    const result = {};
    const connection = await oracledb.getConnection(dbConfig)
    
    result['vals'] = regionName;
    result['dates'] = { 'start': data.stdate, 'end': data.eddate };
    const cleanedVars = querys[2].map((item) => item.split('_')[0] + '_' + item.split('_')[1] + '_' + item.split('_')[2].replace(/\(.*\)/g, ''));
    result['allvars'] = cleanedVars;

    if(query.length === 1){
        const sql_result = await connection.execute(query[0])
        row = []
                  
        sql_result.rows.map((r) => {
            // console.log('r', r)
            // const key = querys[2][0]
            // result[`${regionName[0]}`] = {'일시': r[0], [key]: r[1]};
            tmp = {}  
            r.map((v, idx)=>{
                if (idx===0){
                    tmp['일시'] = `${r[idx].substring(0, 4)}-${r[idx].substring(4, 6)}-${r[idx].substring(6, 8)}`
                } else{
                    tmp[cleanedVars[idx-1]] = r[idx]
                }
            }
            )
            row.push(tmp)
        })
        result[`${regionName[0]}`] = row
    }
    else
    {   start_idx = 0
        for (let idx = 0; idx < query.length; idx++) {
            const sql_result = await connection.execute(query[idx]);
            const row = [];
            let count = sql_result.metaData.length - 1
            sql_result.rows.map((r) => {
              const tmp = { '일시': `${r[0].substring(0, 4)}-${r[0].substring(4, 6)}-${r[0].substring(6, 8)}` };
              for (let i = 1; i < r.length; i++) {
                tmp[cleanedVars[start_idx + i - 1]] = r[i];
              }
              row.push(tmp);
            });
            start_idx += count
            result[regionName[idx]] = row;
          }
    }
    // console.log('result', result)
    var realresult = dataframes(result);

    var info = dataframes_info(realresult, cleanedVars);
    if (!Array.isArray(info)) res.json({ error: `Data Error, 선택한 변수의 기간에 데이터가 없습니다. 기간 및 변수를 변경해주세요. Error Var : ${info.error}` })
    // // // var graph = datagraph(result);
    const uniqueList = regionName.filter((item, index) => regionName.indexOf(item) === index);
    // console.log('3518 realresult', realresult)
    // console.log('info', info)
    res.json({ info: info, data: realresult, vals: uniqueList });
    await connection.close();
})

app.post('/api/dataframe/info', (req, res) => { // Data info return
    const data = req.body.data;
    const result = dataframes_info_for_process(data);
    res.json({ info: result });
})


app.post('/api/python/preprocessing/one', (req, res) => {
    const data = req.body;
    const passdata = processEncode(data);
    const func = data.request[0].split('-')[0];
    const method = data.request[0].split('-')[1];
    const att = data.request[1];
    const vals = data.request.filter((v, i) => i > 1);
    const id = data.id;
    const key = data.key;

    // Drop Nan
    if (method === 'any') {
        let result = data.data;
        vals.map((v, i) => {
            let tmpresult = result.filter(d => d[v] !== null && d[v] !== undefined);
            result = tmpresult;
        })
        if (result.length === 0) res.json({ error: 'error: 선택 데이터가 모두 결측값이므로 결측값 제거 기능(dropna any) 실행 시 모든 데이터가 제거됩니다. `dropna any`를 실행할 수 없습니다.' });
        else res.json({ result: result, info: dataframes_info_for_process(result) });
    } else if (method === 'all') {
        let result = data.data;
        vals.map((v, i) => {
            let tmpresult = result.filter(d => d[v] === null || d[v] === undefined);
            result = tmpresult;
        })
        let realresult = data.data.filter(d => !result.includes(d));
        if (realresult.length === 0) res.json({ error: 'error: 선택 데이터가 모두 결측값이므로 결측값 제거 기능(dropna all) 실행 시 모든 데이터가 제거됩니다. `dropna all`를 실행할 수 없습니다.' });
        else res.json({ result: realresult, info: dataframes_info_for_process(realresult) });
    } else {

        let errorcheck = false;

        // 예외처리
        if (func === 'InterpolUnivar' && (method === 'nearest' || method === 'quadratic' || method === 'cubic' || method === 'time' || method === 'slinear' || method === "piecewise_polynomial" || method === 'pchip' || method === 'akima' || method === 'cubicspline' || method === 'polynomial' || method === 'spline')) {

            switch (method) {
                case 'nearest':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error: nearest 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                    break;
                case 'time':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error: time 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                    break;
                case 'slinear':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error: slinear 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                    break;
                case 'piecewise_polynomial':
                for (let vidx = 0; vidx < vals.length; vidx++) {
                    let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                    if (useD.length <= 1) {
                        errorcheck = true;
                        res.json({ error: `error: piecewise_polynomial 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                        break;
                    }
                }
                break;
                case 'pchip':
                for (let vidx = 0; vidx < vals.length; vidx++) {
                    let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                    if (useD.length <= 1) {
                        errorcheck = true;
                        res.json({ error: `error:  pchip 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                        break;
                    }
                }
                break;
                case 'akima':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error:  akima 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                break;
                case 'cubicspline':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error:  cubicspline 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                break;
                case 'spline':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error:  spline 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                break;
                case 'polynomial':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 1) {
                            errorcheck = true;
                            res.json({ error: `error:  polynomial 보간법은 2개 이상의 데이터가 필요합니다. 데이터가 1개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                break;
                case 'quadratic':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 2) {
                            errorcheck = true;
                            res.json({ error: `error: quadratic 보간법은 3개 이상의 데이터가 필요합니다. 데이터가 2개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                    break;
                case 'cubic':
                    for (let vidx = 0; vidx < vals.length; vidx++) {
                        let useD = data.data.map(d => d[vals[vidx]]).filter(d => d !== null && d !== undefined);
                        if (useD.length <= 3) {
                            errorcheck = true;
                            res.json({ error: `error: cubic 보간법은 4개 이상의 데이터가 필요합니다. 데이터가 3개 이하인 변수가 존재합니다.[${vals[vidx]}]` });
                            break;
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        if (!errorcheck) {
            folderPath = './.share/.dataprocessing'
            if (!fs.existsSync(folderPath)) {
                // 폴더가 없으면 폴더 생성
                fs.mkdirSync(folderPath);
                console.log(`폴더가 생성되었습니다: ${folderPath}`);
            }
            const jsonContent = JSON.stringify(passdata);
            const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');
            const uniqueFilename = `${hash}.json`;
            console.log('uniqueFilename', uniqueFilename)

            if (!fs.existsSync(`./.share/.dataprocessing/${uniqueFilename}`)) {
                fs.writeFile(`./.share/.dataprocessing/${uniqueFilename}`, jsonContent, 'utf8', (err) => {
                    if (err) {
                      console.error('Error writing JSON file:', err);
                    } else {
                      console.log('JSON file saved successfully');
                    }
                });
            }
            passdataFilePath = `./.share/.dataprocessing/${uniqueFilename}`;
            let options = {
                pythonPath: pythonpath,
                scriptPath: `./script/`,
                args: [`${func}`, `${method}`, `${att}`, `${id}`, `${key}`, `${passdataFilePath}`]
            }
            // console.log('options', options)
            var pyshell = new PythonShell('processing.py', options);
            
            pyshell.on('message', function (message) {
                // received a message sent from the Python script (a simple "print" statement)
                // console.log('message', message)
                message = message.replaceAll('None', 'null');
                message = message.replaceAll('nan', 'null');
                message = message.replaceAll('NaN', 'null');
                message = message.replaceAll('Infinity', '999999');
                message = JSON.parse(message);
                message = message['result'];
                const returndata = message.map((obj, idx) => {
                    return Object.assign(data.data[idx], obj);
                });
                // console.log('returndata', returndata)
                res.json({ result: returndata, info: dataframes_info_for_process(returndata) });
            });

            // end the input stream and allow the process to exit
            pyshell.end(function (err) {
                if (err) {
                    console.log(err);
                    res.json({ error: err });
                };
            }
            );
        }
    }
})

app.post('/api/datasave/:name/:isf', (req, res) => { // Dataset 저장 api
    const data = req.body;
    const username = data.id;
    const savedata = data.data;
    const info = data.datainfo;
    // info = info.map(row => [row[0], row[2], row[4], row[6]])
    const pre = data.pre;
    const key = data.key;
    const isf = Boolean(Number(req.params.isf));
    // if(!isf&&fs.existsSync(`./.user/${username}/.data/${req.params.name}.csv`)){
    if (!isf && fs.existsSync(`./.user/${username}/.data/${req.params.name}`)) {
        res.json({ error: 'exist' });
    } else {
        // 폴더 삭제
        if (fs.existsSync(`./.user/${username}/.data/${req.params.name}`)) {
            fs.rmSync(`./.user/${username}/.data/${req.params.name}`, { recursive: true }, (err) => {
                if (err) console.log(err);
            })
        }
        fs.mkdir(`./.user/${username}/.data/${req.params.name}`, (err) => {
            // if(err) res.json({error:err});
            if (err) console.log(err);
            else {
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}info.json`, info, (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                });
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}_pre.json`, JSON.stringify(pre), (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                });
                fs.writeFile(`./.user/${username}/.data/${req.params.name}/${req.params.name}.csv`, '\uFEFF' + convertToCSV(savedata), 'utf8', (err) => {
                    // if (err) res.json({error:err});
                    if (err) console.log(err);
                    else {
                        console.log('saved.'); res.json({ result: 'success' })
                    }
                });
                fs.readdir(`./.user/${username}/.data/.tmp`, (err, files) => {
                    if (err) res.json({ error: err });
                    else {
                        files.map((v, i) => {
                            if (v.split('_')[0] === key) {
                                fs.rename(`./.user/${username}/.data/.tmp/${v}`, `./.user/${username}/.data/${req.params.name}/${v.replace(`${key}_`, '')}`, (err) => {
                                    if (err) res.json({ error: err });
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

app.get('/api/region/:regions', (req, res) => { // frontend Data>Database 지도 내 위치 표출 위한 위경도 데이터
    const regionId = decodeURI(req.params.regions).split('__');
    const data = regionId.at(2);
    const region = regionId.at(3);
    // 조류 데이터 없음
    const queryT = data.includes('수질') ? "nier" : data === '기상' ? "aws" : data === "수문" ? "dam" : "tmp";

    client.query(`select ${region} from points_${queryT} `, (err, result) => {
        if (err) {
            res.json({ error: 'no data' })
        } else {
            // res.json({ lat: Number(result.rows[0][region]), lon: Number(result.rows[1][region]) });
            res.json({ lat: 128.435988, lon: 37.4037668 });
        }
    })
})


// Make Pytorch model
app.post('/api/python/models/:isf', (req, res) => {
    const data = req.body;
    const projectName = data.prjname;
    const username = data.id;
    const isf = Boolean(Number(req.params.isf)); // 중복되는 이름의 모델이 존재할 때, 강제로 저장할지 여부

    if (!isf && fs.existsSync(`./.user/${username}/.model/${projectName}`)) {
        res.json({ error: 'exist' });
    } else {
        // 폴더 삭제
        if (fs.existsSync(`./.user/${username}/.model/${projectName}`)) {
            fs.rmSync(`./.user/${username}/.model/${projectName}`, { recursive: true }, (err) => {
                if (err) console.log(err);
            })
        }
        fs.mkdir(`./.user/${username}/.model/${projectName}`, (err) => {
            if (err) res.json({ error: err });
            else {
                fs.mkdir(`./.user/${username}/.model/${projectName}/.input`, (err) => {
                    if (err) res.json({ error: err });
                });
            }
        });
        const mergeinfo = data.merge;
        data.model.map(d => {
            if (d.type === 'Merge') {
                d.merge = mergeinfo[d.merge[0]];
            }
        })

        fs.writeFile(`./.user/${username}/.model/${projectName}/modelinfo.json`, JSON.stringify(data), (err) => {
            if (err) res.json({ error: err });
            else { console.log('saved.'); }
        })
        fs.writeFile(`./.user/${username}/.model/${projectName}/status.config`, ' ', (err) => {
            if (err) res.json({ error: err });
        })

        let options = {
            pythonPath: pythonpath,
            scriptPath: `./script/`,
            args: [`${username}`,`${projectName}`]
        }
        var pyshell = new PythonShell('make_model.py',options);
        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            message = message.replaceAll('None','null');
            message = message.replaceAll('nan','null');
            message = message.replaceAll('NaN','null');
            message = message.replaceAll('Infinity','999999');
            res.json({result:'success'});
        });
        pyshell.end(function (err) {
            if (err){
                console.log(err);
                fs.rmSync(`./.user/${username}/.model/${projectName}`,{recursive:true});
                res.json({error:err});
            };
        });
    }
})

// user list
app.get('/api/user/list', (req, res) => {
    fs.readdir('./.user', (error, filelist) => {
        if (error) res.json({ error: error });
        else {
            res.json({ result: filelist });
        }
    })
})

// 현재 user 파일 내 모델 정보 get
app.get('/api/user/modellist/:username', (req, res) => {
    const name = req.params.username;
    fs.readdir(`./.user/${name}/.model`, (error, filelist) => {
        if (error) res.json({ error: error });
        else {
            let result = {};
            filelist.map(d => {
                fs.readFile(`./.user/${name}/.model/${d}/status.config`, 'utf8', (error, data) => {
                    if (error) res.json({ error: error });
                    else {
                        result = { ...result, [d]: data };
                        if (Object.keys(result).length === filelist.length) {

                            res.json(result);
                        }
                    }
                })

            })
        };
    })
})

// 현재 user 파일 내 datalist 정보 get
app.get('/api/user/datalist/:user', (req, res) => {
    const username = req.params.user;
    fs.readdir(`./.user/${username}/.data`, (error, filelist) => {
        if (error) res.json({ error: error });
        else {
            filelist = filelist.filter(d => !d.startsWith('.'));
            res.json({ data: filelist })
        };
    })
})

// 현재 user 파일 내 datainfo 정보 get
app.get('/api/user/datainfo/:data/:user', (req, res) => {
    const username = req.params.user;
    const dataname = req.params.data;
    fs.readFile(`./.user/${username}/.data/${dataname}/${dataname}info.json`, (err, data) => {
        if (err) res.json({ error: err });
        else {
            data = JSON.parse(data)
            res.json({ data: data });
        }
    })
});

// model train
app.post('/api/python/train', (req, res) => {
    const data = req.body;
    const user = data.userid;
    const models = data.model;

    // data { userid: 'admin', model: [ 'abc' ] }
    
    models.map((d, idx) => {
        fs.writeFile(`./.user/${user}/.model/${d}/status.config`, 'running', (err) => {
            if (err) console.log(err);
            else { console.log('saved.'); }
        })

        let options = {
            pythonPath: pythonpath,
            scriptPath: `./script/`,
            args: [`${user}`,`${d}`]
        }
        console.log(`${user}`)
        console.log(`${d}`)
        var pyshell = new PythonShell('training.py',options);
        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            message = message.replaceAll('None','null');
            message = message.replaceAll('nan','null');
            message = message.replaceAll('NaN','null');
            message = message.replaceAll('Infinity','999999');
        });
        pyshell.end(function (err) {
            if (err){
                console.log(err);
                fs.writeFile(`./.user/${user}/.model/${d}/status.config`,'error',(err) => {
                    if (err) console.log(err);
                    else {console.log('saved.');}
                });
            };
        });
    })
})

app.post('/api/python/plot',(req,res)=>{
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
                const splitData = data.split('\r\n')
                splitData.pop()
                splitData.map((d,idx)=>{
                    let ds = d.split(',');
                    const pushloss =Number(ds[1].split(':').at(-1)); 
                    const pushvalloss = Number(ds[2].split(':').at(-1));
                    loss.push(pushloss);
                    valloss.push(pushvalloss);

                });
                res.json({data:data, loss:loss, valloss:valloss});
            }
        })
    } else {
        res.json({error:'no log file'})
    }
})

app.post('/api/python/yresult',(req,res)=>{
    const data = req.body;
    const user = data.userid;
    const model = data.model;

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
                            res.json(passdatas)
                        }
                    })
                }
            }
        })
    }
})

app.post('/api/python/forecast',(req,res)=>{
    const data = req.body;
    const user = data.user;
    const models = data.models.map(m=>m.model);
    const creaters = data.models.map(m=>m.creator);
    const std = data.std;
    const end = data.end;
    let results = [];
    models.map((model,idx)=>{
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
            // console.log(message);
            const d = JSON.parse(message);
            console.log('3967 d', d)
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
    })
})

// model delete
app.delete('/api/user/model', (req, res) => {
    const data = req.body;
    const user = data.userid;
    const modelnames = data.models;
    modelnames.map(d => {
        fs.rmSync(`./.user/${user}/.model/${d}`, { recursive: true }, (err) => {
            if (err) res.json({ error: err });
        });
    })
    res.json({ result: 'success' });
})

app.post('/api/user/config', (req, res) => { //모델 train config 저장
    const data = req.body;
    const user = data.userid;
    const model = data.model;
    const config = data.config;
    fs.writeFile(`./.user/${user}/.model/${model}/trainconfig.json`, JSON.stringify(config), (err) => {
        if (err) res.json({ error: err });
        else res.json({ result: 'success' });
    })
})

app.get('/api/user/configlist/:user', (req, res) => { // 해당 user 계정에 저장된 model train config file list return
    const user = req.params.user;
    fs.readdir(`./.user/${user}/.model`, (error, filelist) => {
        if (error) res.json({ error: error });
        else {
            filelist = filelist.map(d => {
                if (fs.existsSync(`./.user/${user}/.model/${d}/trainconfig.json`)) {
                    return d;
                }
            }).filter(d => d);
            let result = {};
            filelist.map(d => {
                fs.readFile(`./.user/${user}/.model/${d}/trainconfig.json`, 'utf8', (err, data) => {
                    if (err) res.json({ error: err });
                    else {
                        data = JSON.parse(data);
                        result[d] = data;
                        if (Object.keys(result).length === filelist.length) {
                            res.json(result);
                        }
                    }
                })
            })
        };
    })
})

app.get('/api/user/calresult/:user', (req, res) => { // 모델 학습 결과 도출 시 저장딘 모델 성능 파일 load
    const user = req.params.user;
    fs.readdir(`./.user/${user}/.model`, (error, filelist) => {
        if (error) res.json({ error: error });
        else {
            filelist = filelist.map(d => {
                if (fs.existsSync(`./.user/${user}/.model/${d}/calresult.json`)) {
                    return d;
                }
            }).filter(d => d);
            let result = {};
            filelist.map(d => {
                fs.readFile(`./.user/${user}/.model/${d}/calresult.json`, 'utf8', (err, data) => {
                    if (err) res.json({ error: err });
                    else {
                        data = data.replaceAll('None', 'null');
                        data = data.replaceAll('nan', 'null');
                        data = data.replaceAll('NaN', 'null');
                        data = data.replaceAll('Infinity', '999999');
                        data = JSON.parse(data);
                        result[d] = data;
                        if (Object.keys(result).length === filelist.length) {
                            res.json(result);
                        }
                    }
                })
            })
        };
    })
})

app.post('/api/share/save', (req, res) => { // forecast에 사용할 모델 (Model 화면에서 publish한 모델) 저장
    const data = req.body;
    const user = data.userid;
    const model = data.model;
    fs.readFile('./.share/.savemodel.json', 'utf8', (err, data) => {
        // if(err) res.json({error:err});
        if (err) console.log(err);
        else {
            data = JSON.parse(data);
            let result = {};
            model.map(d => {
                let loss = [];
                let valloss = [];
                fs.readFile(`./.user/${user}/.model/${d}/log.txt`, 'utf8', (err, config) => {
                    if (err) res.json({ error: err });
                    else {
                        const splitData = config.split('\r\n')
                        splitData.pop()
                        splitData.map(d=>{
                            let ds = d.split(',');
                            const pushloss =Number(ds[1].split(':').at(-1)); 
                            const pushvalloss =Number(ds[2].split(':').at(-1));
                            loss.push(pushloss);
                            valloss.push(pushvalloss);
                        });
                        fs.readFile(`./.user/${user}/.model/${d}/modelinfo.json`, 'utf8', (err, conf) => {
                            if (err) res.json({ error: err });
                            else {
                                conf = JSON.parse(conf);
                                result[d] = { creator: user, loss: loss, valloss: valloss, yval: conf['variable']['out'][0], Date: new Date() };
                            }
                        })
                        if (fs.existsSync(`./.user/${user}/.model/${d}/calresult.json`)) {
                            fs.readFile(`./.user/${user}/.model/${d}/calresult.json`, 'utf8', (err, conf) => {
                                if (err) res.json({ error: err });
                                else {
                                    conf = JSON.parse(conf);
                                    result[d] = { ...result[d], ...conf };
                                    if (Object.keys(result).length === model.length) {
                                        data = { ...data, ...result };
                                        fs.writeFile('./.share/.savemodel.json', JSON.stringify(data), (err) => {
                                            if (err) res.json({ error: err });
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
    res.json({ result: 'success' });
})

// share model list
app.get('/api/share/modellist', (req, res) => {
    fs.readFile('./.share/.savemodel.json', 'utf8', (err, data) => {
        if (err) res.json({ error: err });
        else {
            data = JSON.parse(data);
            res.json(data);
        }
    })
})


// share model delete
app.delete('/api/share/model', (req, res) => {
    const data = req.body;
    const modelnames = data.models;
    fs.readFile('./.share/.savemodel.json', 'utf8', (err, data) => {
        if (err) res.json({ error: err });
        else {
            data = JSON.parse(data);
            modelnames.map(d => {
                delete data[d];
            })
            fs.writeFile('./.share/.savemodel.json', JSON.stringify(data), (err) => {
                if (err) res.json({ error: err });
                else res.json({ result: 'success' });
            })
        }
    })
})

// share model info
app.post('/api/share/modelinfo', (req, res) => {
    const data = req.body;
    const model = data.model;
    const creator = data.creator;
    fs.readFile(`./.user/${creator}/.model/${model}/modelinfo.json`, 'utf8', (err, data) => {
        if (err) res.json({ error: err });
        else {
            data = JSON.parse(data);
            let tmp = {};
            tmp['dataset'] = data['input'];
            const { out, ...input } = data['variable'];
            tmp['input'] = input;
            tmp['output'] = out;
            tmp['descript'] = data['descript'];
            tmp['date'] = data['Date'];
            res.json(tmp);
        }
    })
})

// send models
app.post('/api/share/send', (req, res) => {
    const data = req.body;
    const sendid = data.userid;
    const models = data.model;
    const users = data.user;

    users.map(user => {
        models.map(model => {
            fs.readFile(`./.user/${sendid}/.model/${model}/modelinfo.json`, 'utf8', (err, data) => {
                if (err) res.json({ error: err });
                else {
                    data = JSON.parse(data);
                    const Dataset = data['input'];
                    fs.cp(`./.user/${sendid}/.data/${Dataset}`, `./.user/${user}/.data/${Dataset}`, { recursive: true }, (err) => {
                        if (err) res.json({ error: err });
                    })
                }
            })
            fs.cp(`./.user/${sendid}/.model/${model}`, `./.user/${user}/.model/${model}`, { recursive: true }, (err) => {
                if (err) res.json({ error: err });
            })
        })
    })
    res.json({ result: 'success' });
})

// get ref model list
app.get('/api/share/refmodels', (req, res) => {
    fs.readdir('./.share/.models', (err, files) => {
        if (err) res.json({ error: err });
        else {
            res.json({ data: files });
        }
    })
})

app.get('/api/share/refmodelinfo/:model', (req, res) => { // 가이던스 모델 정보 불러오기
    const model = req.params.model;
    fs.readFile(`./.share/.models/${model}/modelinfo.json`, 'utf8', (err, data) => {
        if (err) res.json({ error: err });
        else {
            data = JSON.parse(data);
            res.json(data);
        }
    })
})

// validation id and password from postsql database
app.post('/api/auth/login', (req, res) => {
    const data = req.body;
    const id = data.id;
    const password = data.password;
    var token = null;
    const query = `SELECT user_pw,user_name FROM "nier_user" WHERE "user_id" = '${id}'`;
    client.query(query, (err, result) => {
        if (err) res.json({ error: `qeury read error : ${err}` });
        // if(err) console.log(err);
        else {
            if (result.rows.length === 0) {
                res.json({ error: '등록되지않은 아이디입니다.' });
            } else {
                // 비밀번호 확인
                const username = result.rows[0].user_name;
                bcrypt.compare(password, result.rows[0].user_pw, (err, result) => {
                    if (err) { console.log(err); res.json({ error: 'something wrong' }); }
                    else {
                        if (!result) res.json({ error: '비밀번호가 틀렸습니다.' });
                        else {
                            // 7일 유효 토큰 발행
                            token = jwt.sign({ id: id }, secretKey, { expiresIn: '7d' });
                            reftoken = jwt.sign({ id: id }, refsecretKey, { expiresIn: '7d' });
                            const now = new Date().toISOString();
                            // 토큰 db에 저장
                            client.query(`UPDATE "nier_user" SET ("user_token", "last_date") = ('${token}', '${now}'::TIMESTAMP) WHERE "user_id" = '${id}'`, (err, result) => {
                                if (err) res.json({ error: `db update error : ${err}` });
                                // if(err) console.log(err);
                                else {
                                    // 토큰 쿠키에 저장 후 응답
                                    res.cookie('token', token, { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true });
                                    res.cookie('reftoken', reftoken, { maxAge: 1000 * 60 * 60 * 24 * 7 });
                                    res.cookie('name', username, { maxAge: 1000 * 60 * 60 * 24 * 7 });
                                    res.cookie('id', id, { maxAge: 1000 * 60 * 60 * 24 * 7 });
                                    res.json({ result: 'success', token: token });
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
app.post('/api/auth/signup', (req, res) => {
    const data = req.body;
    const id = data.id;
    const password = data.password;
    const email = data.email;
    const name = data.name;
    const phone = data.phone ? data.phone : null;
    const hashpw = bcrypt.hashSync(password, saltRounds);
    // const hashpw = bcrypt.hashSync(password);
    const now = new Date().toISOString();
    const query = `INSERT INTO "nier_user" ("user_id","user_pw","user_email","user_name","user_address", "join_date") VALUES ('${id}','${hashpw}','${email}','${name}','${phone}', '${now}'::TIMESTAMP)`;
    client.query(query, (err, result) => {
        if (err) { res.json({ error: err }); console.log(err) }
        else {
            fs.mkdir(`./.user/${id}`, (err) => {
                if (err) console.log(err);
                else {
                    fs.mkdir(`./.user/${id}/.data`, (err) => {
                        if (err) console.log(err);
                        else {
                            fs.mkdir(`./.user/${id}/.model`, (err) => {
                                if (err) console.log(err);
                            })
                            fs.mkdir(`./.user/${id}/.data/.tmp`, (err) => {
                                if (err) console.log(err);
                            })
                            fs.mkdir(`./.share/.notebook/${id}`, (err) => {
                                if (err) console.log(err);
                                else {
                                    fs.mkdir(`./.share/.notebook/${id}/Models`, (err) => {
                                        if (err) console.log(err);
                                    })
                                }
                            })
                        }
                    })
                }
            })
            res.json({ result: 'success' });
        }
    })
})

app.get('/api/auth/signup/checkid/:id', (req, res) => { // 아이디 중복 체크
    const id = req.params.id;
    const query = `SELECT * FROM "nier_user" WHERE "user_id" = '${id}'`;
    client.query(query, (err, result) => {
        if (err) res.json({ error: err });
        else {
            if (result.rows.length === 0) {
                res.json({ result: 'success' });
            } else {
                res.json({ result: '이미 존재하는 아이디입니다' });
            }
        }
    })
})

// logout
app.get('/api/auth/logout', (req, res) => {
    // delete cookie
    res.clearCookie('token');
    return res.redirect('/');
})

// check is user admin
app.post('/api/auth/admin', (req, res) => {
    const data = req.body;
    const id = data.id;

    if (id !== 'admin') {
        res.json({ error: '권한이 없습니다.' });
    } else {
        // read cookie
        const cookie = req.cookies;
        const token = cookie.token;

        // check token
        if (!token) {
            res.json({ error: 'not logged in' });
        } else {
            jwt.verify(token, secretKey, (err, decoded) => {
                if (err) res.json({ error: '토큰이 유효하지 않습니다.' });
                else {
                    client.query(`SELECT user_token FROM "nier_user" WHERE "user_id" = 'admin'`, (err, result) => {
                        if (err) console.log(err);
                        else {
                            if (result.rows.length === 0) {
                                res.json({ error: 'admin 계정이 존재하지 않습니다.' });
                            } else {
                                // compare user token and admin token
                                if (token === result.rows[0].user_token) {
                                    res.json({ result: 'success' });
                                } else {
                                    res.json({ error: '권한이 없습니다.' });
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
app.post('/api/auth/userlist', (req, res) => {
    const data = req.body;
    const id = data.id;

    if (id !== 'admin') {
        res.json({ error: '권한이 없습니다.' });
    } else {
        client.query(`SELECT user_id, user_name, user_email, user_address, last_date, join_date FROM "nier_user"`, (err, result) => {
            if (err) res.json({ error: `db load error: ${err}` });
            else {
                const users = result.rows.filter((user) => user.user_id !== 'admin');
                const admin = result.rows.filter((user) => user.user_id === 'admin');
                admin[0]['id'] = 1;
                users.map((user, idx) => {
                    user['id'] = idx + 2;
                    if (user['last_date'] !== null) user['last_date'] = new Date(user['last_date'].setHours(user['last_date'].getHours() + 18)).toISOString().split('Z')[0];
                    user['join_date'] = new Date(user['join_date'].setHours(user['join_date'].getHours() + 18)).toISOString().split('Z')[0];
                });
                res.json({ data: [...admin, ...users] });
            }
        })
    }
})

// user info change
app.post('/api/auth/userchange', (req, res) => {
    const data = req.body;
    const admin = data.isadmin;
    const user_id = data.id;
    const user_password = data.password;
    const user_name = data.name;
    const user_email = data.email;
    const user_address = data.phone;

    const query = user_password !== '' ? `UPDATE "nier_user" SET user_name = '${user_name}', user_pw = '${bcrypt.hashSync(user_password, saltRounds)}', user_email = '${user_email}', user_address = '${user_address}' WHERE user_id = '${user_id}'`
        : `UPDATE "nier_user" SET user_name = '${user_name}', user_email = '${user_email}', user_address = '${user_address}' WHERE user_id = '${user_id}'`

    if (admin !== 'admin') {
        res.json({ error: '권한이 없습니다.' });
    } else {
        client.query(query, (err, result) => {
            if (err) res.json({ error: `db update error: ${err}` });
            else {
                res.json({ result: 'success' });
            }
        })
    }
})

// user delete
app.delete('/api/auth/userdelete', (req, res) => {
    const data = req.body;
    const admin = data.isadmin;
    const user_id = data.id;

    if (admin !== 'admin') {
        res.json({ error: '권한이 없습니다.' });
    } else {
        client.query(`DELETE FROM "nier_user" WHERE user_id = '${user_id}'`, (err, result) => {
            if (err) res.json({ error: `db delete error: ${err}` });
            else {
                if (fs.existsSync(`./.user/${user_id}`)) {
                    fs.rmSync(`./.user/${user_id}`, { recursive: true }, (err) => {
                        if (err) console.log(err);
                    })
                    fs.rmSync(`./.share/.notebook/${user_id}`, { recursive: true }, (err) => {
                        if (err) console.log(err);
                    })
                }
                res.json({ result: 'success' });
            }
        })
    }
})

// user password change
app.post('/api/auth/changepwd', (req, res) => {
    const data = req.body;
    const id = data.id;
    const password = data.oldpasswd;
    const newpassword = data.newpasswd;

    client.query(`SELECT user_id, user_pw FROM "nier_user" WHERE user_id = '${id}'`, (err, result) => {
        if (err) res.json({ error: `db load error: ${err}` });
        else {
            if (result.rows.length === 0) {
                res.json({ error: '존재하지 않는 아이디입니다.' });
            } else {
                bcrypt.compare(password, result.rows[0].user_pw, (err, rest) => {
                    if (err) { console.log(err); res.json({ error: 'something wrong' }); }
                    else {
                        if (!rest) res.json({ error: '비밀번호가 일치하지 않습니다.' });
                        else {
                            client.query(`UPDATE "nier_user" SET user_pw = '${bcrypt.hashSync(newpassword, saltRounds)}' WHERE user_id = '${id}'`, (err, result) => {
                                if (err) res.json({ error: `db update error: ${err}` });
                                else {
                                    res.json({ result: 'success' });
                                }
                            })
                        }
                    }
                })
            }
        }
    })
})

// user info change
app.post('/api/auth/changeinfo', (req, res) => {
    const data = req.body;
    const id = data.id;
    const email = data.email;
    const phone = data.phone;

    const query = email !== '' && phone !== '' ? `UPDATE "nier_user" SET user_email = '${email}', user_address = '${phone}' WHERE user_id = '${id}'`
        : email !== '' ? `UPDATE "nier_user" SET user_email = '${email}' WHERE user_id = '${id}'`
            : `UPDATE "nier_user" SET user_address = '${phone}' WHERE user_id = '${id}'`;

    client.query(query, (err, result) => {
        if (err) res.json({ error: `db update error: ${err}` });
        else {
            res.json({ result: 'success' });
        }
    })
})

/**
 * return server information
 */
app.get('/api/serverinfo/:need', (req, res) => {
    const need = req.params.need;
    if (need == 'gpu') {
        const request = 'nvidia-smi -q | findstr /C:"GPU Current Temp" && nvidia-smi -q | findstr /C:"\%" | findstr /C:"Gpu" && nvidia-smi -q | findstr /C:"Memory" | findstr /C:"\%"'
        exec(request, (err, stdout, stderr) => {
            if (err) {
                console.log(err)
                res.json({ error: err });
            } else {
                let result = {};
                if (need === 'gpu') {
                    const data = stdout.split('\r\n').map((item) => item.split(':').at(-1).split(' ').at(1)).filter((item) => item);
                    result = {
                        temp: Number(data[0]),
                        use: Number(data[1]),
                        memory: Number(data[2])
                    }
                }
                res.json(result);
            }
        })
    } else {
        let result = {};
        let temp;
        let use;
        si.cpuTemperature()
            .then(data => {
                temp = Number(Math.round(Number(data['main']) * 100) / 100);

                si.currentLoad().then(data => {
                    use = Number(Math.round(Number(data.currentLoad) * 100) / 100)

                    result = {
                        temp: temp,
                        use: use
                    }
                    res.json(result);
                });
            });
    }

})

// Build & Connect FrontEnd - >Note : This code must be at the bottom.

app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
})