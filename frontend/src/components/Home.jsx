import { useEffect, useState } from "react";
import useInterval from "../hooks/useInterval";
import { Skeleton, Checkbox, FormControlLabel, Button, Grid, Card, CssBaseline, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { styled } from '@mui/material/styles';
import { teal } from '@mui/material/colors';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import { useCookies } from 'react-cookie';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
    Title,
    BarElement,
    Legend
  } from "chart.js";
import { Line,Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,Filler,Tooltip,Title,Legend,BarElement);
const chartOptions = {
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            min:0,
        },
    },
    plugins:{
        legend:{display:false},
    },
    animation: {
        duration: 0,
    }
}

const barChartOptions = {
    maintainAspectRatio: false,
    scales:{
        'y-region':{
            type:'linear',
            position:'left',
            title:{
                display:true,
                text:'지역 수',
            },
            grid:{
                display:false,
            }
        },
        'y-data':{
            type:'linear',
            position:'right',
            title:{
                display:true,
                text:'데이터 수',
            },
            grid:{
                display:false,
            }
        }
    },
    plugins:{
        legend:{
            position:'top'
        }
    }
}

const CardButton = styled(Button)(({ theme }) => ({
    color: theme.palette.getContrastText(teal[500]),
    backgroundColor: teal[500],
    '&:hover': {
      backgroundColor: teal[700],
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
      border: 0,
    },
  }));

export default function Home(){
    const [cookies, setCookie, removeCookie] = useCookies(['id']);
    const userid = cookies.id;
    const [gpudata, setGpuData] = useState({
        temp : Array.from({ length: 40 }, (i) => { return 0}),
        use : Array.from({ length: 40 }, (i) => { return 0}),
        memory : Array.from({ length: 40 }, (i) => { return 0}),
    });
    const[cpudata, setCpuData] = useState({
        temp : Array.from({ length: 40 }, (i) => { return 0}),
        use : Array.from({ length: 40 }, (i) => { return 0}),
    });

    const [models, setModels] = useState([]);
    const [barData, setBarData] = useState({
        'region':[0,0,0,0],
        'var':[0,0,0,0],
    });

    const menualPath = '/api/menual/플랫폼매뉴얼.pdf';

    useInterval(() => {
        fetch('/api/serverinfo/gpu')
        .then(res => res.json())
        .then(data => {
            if(data.hasOwnProperty('error')){
                
                console.log(data.error);
            }else{
                let temptmp = [...gpudata.temp];
                let usetmp = [...gpudata.use];
                let memorytmp = [...gpudata.memory];
                temptmp.shift();
                usetmp.shift();
                memorytmp.shift();
                temptmp.push(data.temp);
                usetmp.push(data.use);
                memorytmp.push(data.memory);
                setGpuData({
                    temp : temptmp,
                    use : usetmp,
                    memory : memorytmp,
                });
            }
        })

        fetch('/api/serverinfo/cpu')
        .then(res => res.json())
        .then(data => {
            if(data.hasOwnProperty('error')){
                console.log(data.error);
            }else{
                let temptmp = [...cpudata.temp];
                let usetmp = [...cpudata.use];
                temptmp.shift();
                usetmp.shift();
                temptmp.push(data.temp);
                usetmp.push(data.use);
                setCpuData({
                    temp : temptmp,
                    use : usetmp,
                });
            }
        })
    }, 2000);

    useEffect(() => {
        fetch('/api/share/modellist')
        .then(res => res.json())
        .then(data => {
            if(data.hasOwnProperty('error')){
                alert('여기 에러');
                alert('Error: '+data.error);
            } 
            else {
                const models = Object.keys(data).sort((a,b)=>a.localeCompare(b));
                if(models.length!==0){
                    let tmp = [];
                    models.map(d=>{
                        tmp.push({
                            creator:data[d].creator,
                            model:d,
                        })
                    })
                    setModels(tmp);
                }else{
                    setModels([]);
                }
            }
        })

        fetch('/api/list/alldata')
        .then(res=>res.json())
        .then(data=>{
            if(data.hasOwnProperty('error')) alert('Error: '+data.error);
            else {
                const datas = Object.values(data);
                setBarData({
                    'region':datas.map(d=>d['regionNum']),
                    'var':datas.map(d=>d['valueNum']),
                })
            }
        })
    },[userid]);

    return(
        <div className="home-page" style={{height:'95vh', width:'100%'}}>
            <CssBaseline />
            <Grid container component="main" sx={{ width:'100%',height: '95vh' }}>
                <Grid item sm={6} md={6} sx={{height:'95vh',display:'flex',flexDirection:'column', padding:'1rem'}}>
                    <Card elevation={2}  sx={{marginTop:'1rem', borderRadius:'20px',backgroundColor:'#fcfcff',height:'27vh',display:'flex',flexDirection:'column',justifyContent:'space-between', padding:'32px'}}>
                        <b style={{color:'#0eaa77', }}>Nier AI Platform V0</b>
                        <div>
                            <h5><b>{userid}님, 환영합니다!</b></h5>
                            <p style={{margin:0}}>물환경 정보시스템 AI 플랫폼 입니다.</p>
                            <p>자세한 사용법은 아래의 매뉴얼을 참고해주세요.</p>
                        </div>
                        <CardButton variant="contained" onClick={e=>window.open(menualPath)} startIcon={<DoubleArrowIcon sx={{ color:'#ffffff' }}/>} sx={{width:'13rem', borderRadius:'10px'}}>
                            <b style={{fontSize:'1rem', fontFamily:'Basic'}}>Open Menual</b>
                        </CardButton>
                    </Card>
                    <div style={{marginTop:'2rem',flex:1,display:'flex',justifyContent:'space-between'}}>
                        <Card sx={{flex:0.68,padding:'1rem',display:'flex',flexDirection:'column'}}>
                            <b>수계별 데이터 현황</b>
                            <div style={{flex:0.8, marginTop:'0.5rem'}}>
                            {/* <div style={{flex:0.8}}> */}
                                {barData.region.length>0&&barData.var.length>0?<Bar
                                    data={{
                                        labels:['금강','낙동강','영산강','한강'],
                                        datasets:[
                                            {
                                                label:'지역 수(Left)',
                                                yAxisID:'y-region',
                                                fill: true,
                                                data:barData.region,
                                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                                borderColor: 'rgba(255, 99, 132)',
                                                borderWidth: 1,
                                            },
                                            {
                                                label:'데이터 수(Right)',
                                                yAxisID:'y-data',
                                                fill: true,
                                                data:barData.var,
                                                backgroundColor: 'rgba(17, 125, 187, 0.2)',
                                                borderColor: 'rgba(17, 125, 187)',
                                                borderWidth: 1,
                                            }
                                        ]
                                    }}
                                    options={barChartOptions}
                                />:null}
                            </div>
                        </Card>
                        <Card sx={{flex:0.3,padding:'1rem'}}>
                            <b>학습 모델 현황</b>
                                <Table size="small" stickyHeader sx={{width:'100%', marginTop:'0.5rem'}} aria-label="val-table">
                                    <TableHead><TableRow>{['Model','Creator'].map(d=><TableCell sx={{width:'50%', fontSize:'0.8rem', fontFamily:'Basic'}}><b>{d}</b></TableCell>)}</TableRow></TableHead>
                                    <TableBody>
                                        {models.map((d,i)=><StyledTableRow key={i}>{[d.model,d.creator].map((d,i)=><TableCell sx={{fontSize:'0.8rem', fontFamily:'Basic'}}>{d}</TableCell>)}</StyledTableRow>)}
                                    </TableBody>
                                </Table>
                        </Card>
                    </div>
                </Grid>
                <Grid item sm={6} md={6} sx={{height:'95vh',display:'flex',flexDirection:'column', padding:'1rem'}}>
                    <Paper>
                        <div className="home-page-info">
                            <b>GPU Temperature [{gpudata.temp.at(-1)}°C]</b>
                            <div className="home-page-graph">
                                <Line
                                    data={{
                                        labels: Array.from({ length: 40 }, (i) => { return 'temp'}),
                                        datasets: [
                                            {
                                                data: gpudata.temp,
                                                fill: true,
                                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                                borderColor: 'rgba(255, 99, 132)',
                                                borderWidth: 1,
                                                pointRadius:0,
                                                lineTension: .4, 
                                            },
                                        ],
                                    }}
                                    options={{...chartOptions,...{scales:{x:{display:false},y:{max:85,min:0,ticks:{display:false, stepSize:17,}}}}}}
                                />
                            </div>
                        </div>
                        <div className="home-page-info">
                            <b>GPU Usage [{gpudata.use.at(-1)}%]</b>
                            <div className="home-page-graph">
                                <Line
                                    data={{
                                        labels: Array.from({ length: 40 }, (i) => { return 'use'}),
                                        datasets: [
                                            {
                                                data: gpudata.use,
                                                fill: true,
                                                backgroundColor: 'rgba(17, 125, 187, 0.2)',
                                                borderColor: 'rgba(17, 125, 187)',
                                                borderWidth: 1,
                                                pointRadius:0,
                                                lineTension: .4, 
                                            },
                                        ],
                                    }}
                                    options={{...chartOptions,...{scales:{x:{display:false},y:{max:100,min:0, ticks:{display:false, stepSize:20,}}}}}}
                                />
                            </div>
                        </div>
                        <div className="home-page-info">
                            <b>GPU Memory Usage [{gpudata.memory.at(-1)}%]</b>
                            <div className="home-page-graph">
                                <Line
                                    data={{
                                        labels: Array.from({ length: 40 }, (i) => { return 'memory'}),
                                        datasets: [
                                            {
                                                data: gpudata.memory,
                                                fill: true,
                                                backgroundColor: 'rgba(17, 125, 187, 0.2)',
                                                borderColor: 'rgba(17, 125, 187)',
                                                borderWidth: 1,
                                                pointRadius:0,
                                                lineTension: .4, 
                                            },
                                        ],
                                    }}
                                    options={{...chartOptions,...{scales:{x:{display:false},y:{max:100,min:0, ticks:{display:false, stepSize:20,}}}}}}
                                />
                            </div>
                        </div>
                        <div className="home-page-info">
                            <b>CPU Temperature [{cpudata.temp.at(-1)}°C]</b>
                            <div className="home-page-graph">
                                <Line
                                    data={{
                                        labels: Array.from({ length: 40 }, (i) => { return 'temp'}),
                                        datasets: [
                                            {
                                                data: cpudata.temp,
                                                fill: true,
                                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                                borderColor: 'rgba(255, 99, 132)',
                                                borderWidth: 1,
                                                pointRadius:0,
                                                lineTension: .4, 
                                            },
                                        ],
                                    }}
                                    options={{...chartOptions,...{scales:{x:{display:false},y:{max:75,min:0, ticks:{display:false, stepSize:15,}}}}}}
                                />
                            </div>
                        </div>
                        <div className="home-page-info">
                            <b>CPU Usage [{cpudata.use.at(-1)}%]</b>
                            <div className="home-page-graph">
                                <Line
                                    data={{
                                        labels: Array.from({ length: 40 }, (i) => { return 'use'}),
                                        datasets: [
                                            {
                                                data: cpudata.use,
                                                fill: true,
                                                backgroundColor: 'rgba(17, 125, 187, 0.2)',
                                                borderColor: 'rgba(17, 125, 187)',
                                                borderWidth: 1,
                                                pointRadius:0,
                                                lineTension: .4, 
                                            },
                                        ],
                                    }}
                                    options={{...chartOptions,...{scales:{x:{display:false},y:{max:100,min:0, ticks:{display:false, stepSize:20,}}}}}}
                                />
                            </div>
                        </div>
                    </Paper>
                </Grid>
            </Grid>
        </div>

    )
}