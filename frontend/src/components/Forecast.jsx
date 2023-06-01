import { Card,TextField, Skeleton, List, ListItem,ListItemText, ListSubheader, Button, Grid, CssBaseline,  Paper, Tooltip } from "@mui/material";
import { DataGrid,GridToolbarColumnsButton, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import { useCookies } from 'react-cookie';
import { useEffect, useState } from 'react';
import useFetch from "../hooks/useFetch";

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Legend
  } from "chart.js";
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,Title,Legend);

const chartOptions ={
    // responsive: true,
    maintainAspectRatio: false,
    interaction:{
        mode: "index",
        intersect:false,
    },
    plugins:{
        legend:{display:false,},
    },
    scales:{x:{grid:{display:false,}}},
    
};
const ForecastChartOptions ={
    // responsive: true,
    maintainAspectRatio: false,
    interaction:{
        mode: "index",
        intersect:false,
    },
    scales:{x:{grid:{display:false,}}},
    
};

export default function Forecast(){
    const [cookies, setCookie, removeCookie] = useCookies(['id']);
    const userid = cookies.id;
    const [modelList, setModelList] = useState([]);
    const [modelRow, setModelRow] = useState([]);
    const [select, setSelect] = useState([]);
    const [forecastStd, setForecastStd] = useState(dayjs().subtract(3,'month'));
    const [forecastEnd, setForecastEnd] = useState(dayjs().add(3,'month'));
    const modelCol = [
        {field:'id', headerName:' ', flex:0.1, align:'center', headerAlign:'center',}, // 순서
        {field:'model', headerName:'Model', flex:0.6}, // 모델명
        {field:'yval', headerName:'Y Valuable', flex:1}, // 모델 yvar 
        {field:'creator', headerName:'Creator', flex:0.5}, // 모델 생성자 
        {field:'cosine', headerName:'Cos_sim', flex:0.5}, // 코사인 유사도
        {field:'rmsle', headerName:'RMSLE', flex:0.5}, // RMSLE
        {field:'mape', headerName:'MAPE', flex:0.5}, // MAP
    ];
    const [debugRow, setDebugRow] = useState([]);
    const debugColumn = [
        {field:'model', headerName:'Model', headerClassName:'datagrid-header',flex:0.5},
        {field:'date', headerName:'Date', headerClassName:'datagrid-header',flex:0.8},
        {field:'warning', headerName:'Warning', headerClassName:'datagrid-header',flex:1},
    ];

    const [forecastRow, setForecastRow] = useState([]);
    const [forecastColumn, setForecastColumn] = useState([]);

    const [modelReload, setModelReload] = useState(false);
    const [modelInfo, setModelInfo] = useState({});

    const [forecastGraph, setForecastGraph] = useState([]);
    const [forecastGraphLabel, setForecastGraphLabel] = useState([]);

    const [isForecast, setIsForecast] = useState(false);

    // 모델 리스트 가져오기
    useEffect(() => {
        fetch('/api/share/modellist')
        .then(res => res.json())
        .then(data => {
            if(data.hasOwnProperty('error')) alert('Error: '+data.error);
            else {
                setModelList(data);
                const models = Object.keys(data).sort((a,b)=>a.localeCompare(b));
                if(models.length!==0){
                    let tmp = [];
                    models.map(d=>{
                        tmp.push({
                            id:tmp.length+1,
                            creator:data[d].creator,
                            model:d,
                            yval:data[d].yval,
                            cosine:data[d].Cos_sim,
                            rmsle:data[d].RMSLE,
                            mape:data[d].MAPE,
                        })
                    })
                    setModelRow(tmp);
                }else{
                    setModelRow([]);
                }
            }
        })
    },[userid,modelReload]);

    // 모델 info 표시
    useEffect(() => {
        if(select.length!==0){
            const model = modelRow[select.at(-1)-1].model;
            fetch('/api/share/modelinfo',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    },
                    body:JSON.stringify({
                        model:model,
                        creator:modelList[model].creator,
                        })
            })
            .then(res => res.json())
            .then(data => {
                if(data.hasOwnProperty('error')) alert('Error: '+data.error);
                else {
                    setModelInfo({model:model,...data});
                }
            })
        }else{setModelInfo({});}
    },[select]);

    // 모델 삭제
    const handleDelete = () => {
        let delselect = select.filter(d=>modelRow[d-1].creator!==userid);
        if(delselect.length!==0){
            alert('본인이 생성한 모델만 삭제할 수 있습니다.');
            return;
        }
        if(!window.confirm('정말로 선택하신 모델을 삭제하시겠습니까?')){
            return;
        }else{
            let models = [...modelRow];
            let selectModels = select.map(d=>models[d-1].model);
            fetch('/api/share/model',{
                method:'DELETE',
                headers:{
                    'Content-Type':'application/json',
                    },
                    body:JSON.stringify({
                        models:selectModels,
                        })
            })
            .then(res => res.json())
            .then(data => {
                if(data.hasOwnProperty('error')) alert('Error: '+data.error);
                else {
                    setSelect([]);
                    setModelReload(!modelReload);
                }
            })
        }
    }


    // forecast
    const handleForecast = () => {
        if(select.length===0){
            alert('모델을 선택해주세요.');
            return;
        }else{
            setIsForecast(true);
            const models = select.map(d=>modelRow[d-1]);
            // const models = select.map(d=>modelRow[d-1]);
            
            fetch('api/python/forecast',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    },
                    body:JSON.stringify({
                        user:userid,
                        models:models,
                        std : forecastStd.format('YYYY-MM-DD'),
                        end : forecastEnd.format('YYYY-MM-DD'),
                        })
            })
            .then(res => res.json())
            .then(data => {
                if(data.hasOwnProperty('error')) {
                    if(data.error==='no data') alert('데이터가 없습니다. 예측기간을 다시 설정해주세요.');
                    else alert('Error: '+data.error);
                    setIsForecast(false);
                }
                else {
                    console.log(data);
                    setForecastColumn([
                        {field:'date', headerName:'Date',},
                        // ...models.map(d=>{return {field:d, headerName:d,flex:1}})
                        ...Object.keys(data.table[0]).filter(d=>d!=='date'&&d!=='id').map(d=>{return {field:d, headerName:d,flex:1}})
                    ])
                    setForecastRow(data.table);
                    setForecastGraphLabel(data.date);
                    setForecastGraph(data.graph);
                    setIsForecast(false);
                }
            })
        }
    }


    const toolbar = ()=>{
        return(
            <GridToolbarContainer style={{margin:0,height:'auto'}}>
                <GridToolbarColumnsButton/>
                <GridToolbarExport
                    csvOptions={{
                        fileName: `${dayjs(forecastStd).startOf("D").format().split('T')[0]}_${dayjs(forecastEnd).startOf("D").format().split('T')[0]}_Forecast(${dayjs().startOf("D").format().split('T')[0]})`,
                        utf8WithBom: true,
                    }}
                />
            </GridToolbarContainer>
        );
    }

    return(
        <div className="forecast-page" style={{height:'95vh', width:'100%'}}>
            <CssBaseline/>
            <Grid container component="main" sx={{width:'100%',height:'95vh'}}>
                <Grid
                    item
                    className="forecast-left"
                    sm={4.5}
                    md={4.5}
                    sx={{height:'95vh', display:'flex', flexDirection:'column', padding:'1rem'}}
                >
                    <div className="forecast-left-top" style={{height:'34vh'}}>
                        <b>Model Information</b>
                        <Paper className="info" sx={{height:'30vh', padding:'0.8rem', overflow:'auto'}}>
                            {modelInfo.hasOwnProperty('model')&&
                            <div>
                                <div style={{display:'flex'}}>
                                    <div style={{flex:0.5}}>
                                        <b>▶ Model Name</b>
                                        <Card variant="outlined" className="info-card" sx={{marginRight:'0.8rem'}}><b>{modelInfo.model}</b></Card>
                                    </div>
                                    <div style={{flex:0.5}}>
                                        <b>▶ Model Publish Date</b>
                                        <Card variant="outlined" className="info-card"><b>{modelList[modelInfo.model].Date.split('T')[0]}</b></Card>
                                    </div>
                                </div>
                                <b>▶ Model Descript</b>
                                <Card variant="outlined" className="info-card descript"><b>{modelInfo.descript}</b></Card>
                                <b>▶ Dataset Name</b>
                                <Card variant="outlined" className="info-card"><b>{modelInfo.dataset}</b></Card>
                                <div style={{display:'flex'}}>
                                    {/* <div style={{width:'50%'}}> */}
                                    <div style={{flex:0.5}}>
                                        <b>▶ Data Input</b>
                                        <Card variant="outlined" className="info-card datainfos" style={{marginRight:'0.8rem', overflow:'auto'}}>
                                            <List
                                                sx={{
                                                    width: '100%',
                                                    position: 'relative',
                                                    overflow: 'auto',
                                                    '& ul': { padding: 0 },
                                                }}
                                                subheader={<li />}
                                            >
                                                {
                                                    Object.keys(modelInfo.input).map((d,i)=>{
                                                        return(
                                                            <li key={`section-${i}`}>
                                                                <ul>
                                                                    <ListSubheader style={{height:'4vh'}}><b>Input {d}</b></ListSubheader>
                                                                    {
                                                                        modelInfo.input[d].map((dd,ii)=>{
                                                                            return(
                                                                                <ListItem key={`item-${ii}`} style={{height:'2.8vh'}}>
                                                                                    <ListItemText primary={dd} />
                                                                                </ListItem>
                                                                            )
                                                                        })
                                                                    }
                                                                </ul>
                                                            </li>
                                                        )
                                                    })
                                                }
                                            </List>
                                        </Card>
                                    </div>
                                    {/* <div style={{width:'50%'}}> */}
                                    <div style={{flex:0.5}}>
                                        <b>▶ Data Output</b>
                                        <Card variant="outlined" className="info-card datainfos"><b>{modelInfo.output[0]}</b></Card>
                                    </div>
                                </div>
                                <b>▶ Loss</b>
                                <Card variant="outlined" className="info-card loss-chart">
                                    <Line options={chartOptions} data={{
                                        labels:modelList[modelInfo.model].loss.map((d,i)=>i+1),
                                        datasets:[{
                                            label:'loss',
                                            data:modelList[modelInfo.model].loss,
                                            fill:false,
                                            borderColor:'rgb(75, 192, 192)',
                                            tension:0.1,
                                            borderWidth: 1,
                                            pointRadius: 0.2,
                                        },
                                        {
                                            label:'val_loss',
                                            data:modelList[modelInfo.model].valloss,
                                            fill:false,
                                            borderColor:'rgb(255, 99, 132)',
                                            tension:0.1,
                                            borderWidth: 1,
                                            pointRadius: 0.2,
                                        }]
                                    }}/>
                                </Card>
                            </div>
                            }
                        </Paper>
                    </div>
                    <div className="forecast-left-middle" style={{height:'45vh'}}>
                        <div className="left-header" style={{display:'flex',justifyContent:'space-between'}}>
                            <b>Model List</b>
                            <div style={{display:'flex', width:'28%', justifyContent:'end'}}>
                                    <Button variant="contained" color="error" size="small" onClick={handleDelete}>Model Delete</Button>
                            </div>
                        </div>
                        <DataGrid
                            density="compact"
                            hideFooter
                            disableColumnMenu
                            rows={modelRow}
                            columns={modelCol}
                            checkboxSelection
                            onSelectionModelChange={(newSelectionModel) => {setSelect(newSelectionModel);}}
                            selectionModel={select}
                            sx={{ marginTop:'0.5rem',height:'40vh'}}
                        />
                    </div>
                    <div className="forecast-left-bottom" style={{height:'10vh'}}>
                        <b>Debug</b>
                        <div style={{height:'10vh', marginTop:'0.5rem'}}>
                            <DataGrid
                                density="compact"
                                hideFooter
                                disableColumnMenu
                                rows={debugRow}
                                columns={debugColumn}
                            />
                        </div>
                    </div>
                </Grid>
                <Grid
                    item
                    className="forecast-left"
                    sm={7.5}
                    md={7.5}
                    sx={{height:'95vh', display:'flex', flexDirection:'column', padding:'1rem'}}
                >
                    <div style={{display:'flex', alignItems:'center'}}>
                        <h5 style={{fontWeight:600, marginRight:'1rem'}}>예측 기간</h5>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="시작일"
                                value={forecastStd}
                                onChange={(newValue) => {
                                    setForecastStd(newValue);
                                }}
                                renderInput={(params) => <TextField {...params} />}
                            />
                        </LocalizationProvider>
                        <h4 style={{"margin":"0.5rem","color":"rgba(0,0,0,0.6)"}}> ~ </h4>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="종료일"
                                value={forecastEnd}
                                onChange={(newValue) => {
                                    setForecastEnd(newValue);
                                }}
                                renderInput={(params) => <TextField {...params} />}
                            />
                        </LocalizationProvider>
                        <Button variant="contained"  style={{marginLeft:'1rem'}} onClick={handleForecast}>Forecast</Button>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between',width:'100%',alignItems:'center'}}>
                        <b>예측 결과</b>
                        {/* <Button variant="contained" size="small" >Save</Button> */}
                    </div>
                    {isForecast?<Skeleton variant="rectangular" animation="wave" width="99%" style={{marginTop:"0.5rem",flex:1}} />
                    :<DataGrid
                        density="compact"
                        rows={forecastRow}
                        columns={forecastColumn}
                        components={{Toolbar:toolbar}}
                        sx={{ marginTop:'0.5rem',height:'30vh'}}
                    />}
                    {isForecast?<Skeleton variant="rectangular" animation="wave" width="99%" height="30vh"style={{marginTop:"0.5rem"}} />
                    :<Paper style={{height:'30vh', marginTop:'0.5rem', overflow:'auto'}}>
                        {forecastGraph.length!==0 &&
                            forecastGraph.map((d,i)=>{
                                return(
                                    <div key={i} style={{width:'90%',height:'20vh', marginBottom:'1rem',marginLeft:'5%'}}>
                                        <Line options={ForecastChartOptions} data={{
                                            labels:forecastGraphLabel,
                                            datasets:d,
                                        }}/>
                                    </div>
                                )
                            })
                        }
                    </Paper>}
                </Grid>
            </Grid>
        </div>

    )
}