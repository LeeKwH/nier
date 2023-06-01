import { CircularProgress,Modal, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl,  Select, MenuItem, OutlinedInput, List, ListItem,ListItemText,ListItemButton, ListSubheader, Button, Grid, CssBaseline,  Paper, Checkbox,Tooltip, ListItemIcon } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import { useEffect, useState,useRef } from "react";
import useFetch from "../hooks/useFetch";
import useInterval from "../hooks/useInterval";
import { useCookies } from 'react-cookie';
import { configlist } from "./subTraining/config";
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
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
export default function Training(){
    const [cookies, setCookie, removeCookie] = useCookies(['id']);
    const userid = cookies.id;
    const scrollRef = useRef();
    const [listReload, setListReload] = useState(false);
    const [configReload, setConfigReload] = useState(false);
    
    const modalstyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        height:600,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        display:'flex',
        flexDirection:'column',
    };

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

    const [status, setStatus] = useState([0,0,0,0,0]);
    const [select, setSelect] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isresultLoading, setIsResultLoading] = useState(false);
    const [canirun, setCanirun] = useState(0);
    const [nowModel, setNowModel] = useState('');
    
    const [modelList, setModelList] = useState([]);
    const modelColumn = [
        {field:'id', headerName:' ', headerClassName:'datagrid-header',flex:0.1,align:'center'},
        {field:'model', headerName:'Model', headerClassName:'datagrid-header',flex:1},
        {field:'config', headerName:'Config', headerClassName:'datagrid-header',flex:0.5,align:'center', renderCell:(params)=>(
            params.value===true? <CheckRoundedIcon color="success"/>:<div/>)},
        {field:'cosine', headerName:'Cos_sim', headerClassName:'datagrid-header',flex:1},
        {field:'rmsle', headerName:'RMSLE', headerClassName:'datagrid-header',flex:1},
        {field:'mape', headerName:'MAPE', headerClassName:'datagrid-header',flex:1},
        {field:'status', headerName:'Status', headerClassName:'datagrid-header',flex:0.5,sortable:false, align:'center', renderCell:(params)=>(
            <Tooltip title={params.value} placement="right-start">
                {params.value==='running'?<CircularProgress size={20} color='primary'/>
                :params.value==='done'?<CheckCircleOutlineRoundedIcon color="success"/>
                :params.value==='error'?<ErrorOutlineRoundedIcon color="error"/>
                :params.value==='wait'?<PendingOutlinedIcon color="action"/>
                :<div/>}
            </Tooltip>
        )},
    ]
    const [modelRow,setModelRow] = useState([]);
    
    const debugColumn = [
        {field:'model', headerName:'Model', headerClassName:'datagrid-header',flex:1},
        {field:'date', headerName:'Date', headerClassName:'datagrid-header',flex:1},
        {field:'warning', headerName:'Warning', headerClassName:'datagrid-header',flex:1},
    ]
    const [debugRow, setDebugRow] = useState([]);

    const [log, setLog] = useState('');
    const [exlog, setExlog] = useState('.');
    const [loss, setLoss] = useState([]);
    const [valloss, setvalLoss] = useState([]);
    const [resultDataset, setResultDataset] = useState([]);
    const [resultLabel, setResultLabel] = useState([]);

    const [configSelect, setConfigSelect] = useState('');
    const defaultconfig = useFetch(`/api/user/configlist/${userid}`)
    const [config, setConfig] = useState(defaultconfig);
    const [tmpconfig, setTmpconfig] = useState({'epoch':100,'learning rate':0.01, 'optimizer':'RMSprop', 'loss function':'MSE','Train ratio':8, 'Validation ratio':1, 'Test ratio':1,});

    const [calresult, setCalresult] = useState({});

    const [userList, setUserList] = useState([]);
    const [userSelect, setUserSelect] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const handleModalOpen = () => setModalOpen(true);
    const handleModalClose = () => setModalOpen(false);

    const makeRow = (modellist)=>{
        let rowtmp = [];
        if(modellist.length!==0){
            let models = Object.keys(modellist).sort((a,b)=>a.localeCompare(b));
            setModelList(models);
            models.map(d=>{
                rowtmp.push({id:rowtmp.length, model:d, status:modellist[d]});
            })
        }
        setModelRow(rowtmp);
        setConfigReload(!configReload);
    }


    const train = ()=>{
        // setIsRunning(true);
        select.sort((a,b)=>a-b);
        const selectedModel = select.map(d=>modelRow[d].model);
        const errors = selectedModel.filter(d=>!Object.keys(config).includes(d));
        if(selectedModel.length===0) alert('모델을 선택해주세요.');
        else if(errors.length!==0) alert(`${errors} 모델의 config가 없습니다.`);
        else{
            fetch(`/api/python/train`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, model:selectedModel}),
            })
            setSelect([]);
            setListReload(!listReload);
        }
    }

    const plot = ()=>{
        if(select.length!==1) alert('한개의 모델만 선택해주세요.');
        else if(modelRow[select[0]].status.length<=1) alert('학습중이거나, 학습된 모델만 선택해주세요.');
        else{
            const selectedModel = modelRow[select[0]].model;
            if(modelRow[select[0]].status==='running'){
                setNowModel(selectedModel);
                setIsRunning(true);
            }
            fetch(`/api/python/plot`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, model:selectedModel}),
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.hasOwnProperty('error')) {alert(data.error);}
                else{
                        setLog(data.data);
                        setLoss(data.loss);
                        setvalLoss(data.valloss); 
                        setSelect([]);
                }
            })

            // get yhat, y
            if(modelRow[select[0]].status==='done'){
                setIsResultLoading(true);
                    fetch(`/api/python/yresult`,{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({userid:userid, model:selectedModel}),
                })
                .then(res=>res.json())
                .then(data=>{
                    if(data.hasOwnProperty('error')) {alert(data.error); setIsResultLoading(false); setSelect([]); setNowModel('');}
                    else{
                        setResultDataset(data.datasets);
                        setResultLabel(data.labels);
                        const tmp = {...calresult};
                        tmp[selectedModel] = {'RMSLE':data.RMSLE, 'MAPE':data.MAPE,'Cos_sim':data['Cos_sim']};
                        console.log(tmp)
                        setCalresult(tmp);
                        setIsResultLoading(false);
                    }
                })
            }
        }
    }

    const save = ()=>{
        if(select.length===0) alert('저장할 모델을 선택해주세요.');
        else{
            const selectedModel = select.map(d=>modelRow[d].model);
            for(let d of select){
                if(modelRow[d].status!=='done') {
                    alert(`학습이 완료되지 않은 모델이 포함되어있습니다.`);
                    return;
                }else if(modelRow[d].mape === undefined){
                    alert(`모델의 성능이 측정되지 않은 모델이 포함되어있습니다. Publish를 하기 위해 Plot을 먼저 해주세요.`);
                    return;
                }
            }
            fetch(`/api/share/save`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, model:selectedModel}),
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.hasOwnProperty('error')) alert(data.error);
                else{
                    alert('저장되었습니다.');
                    setSelect([]);
                    setListReload(!listReload);
                }
            })
        }
    }

    const send = ()=>{
        if(userSelect.length===0) alert('공유할 사용자를 선택해주세요.');
        else{
            if(!window.confirm('선택하신 사용자에게 모델을 공유하시겠습니까?')) return;
            else{
                const selectedModel = select.map(d=>modelRow[d].model);
                const selectedUser = userSelect.map(d=>userList[d]);
                fetch(`/api/share/send`,{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({userid:userid, model:selectedModel, user:selectedUser}),
                })
                .then(res=>res.json())
                .then(data=>{
                    if(data.hasOwnProperty('error')) alert(data.error);
                    else{
                        alert('공유되었습니다.');
                        setSelect([]);
                        setUserSelect([]);
                        handleModalClose();
                    }
                })
            }
        }
    }

    useEffect(()=>{
        // Model List 가져오기
        fetch(`/api/user/modellist/${userid}`)
        .then(res=>res.json())
        .then(data=>{
            const modellist = data;
            makeRow(modellist);
            // Model 결과 가져오기
            fetch(`/api/user/calresult/${userid}`)
            .then(res=>res.json())
            .then(d=>{
                const calresult = d;
                setCalresult(calresult);
            })
        })
    },[userid,listReload])

    useEffect(()=>{
        if(defaultconfig.length!==0){
            setConfig(defaultconfig);
        }
    },[defaultconfig])

    useEffect(()=>{
        console.log(tmpconfig)
    },[tmpconfig])

    useEffect(()=>{
        // if(config!==null&&modelRow.length!==0){
        if(config!==null){
            let tmp = [...modelRow]
            tmp.map(d=>{
                if(Object.keys(config).includes(d.model)){
                    d['config'] = true;
                }
                else{
                    d['config'] = false;
                }
            })
            setModelRow(tmp);
        }
        if(Object.keys(calresult).length!==0){
            let tmp = [...modelRow]
            tmp.map(d=>{
                if(Object.keys(calresult).includes(d.model)){
                    const tmpresult = calresult[d.model];
                    d['rmsle'] = tmpresult.RMSLE;
                    d['mape'] = tmpresult.MAPE;
                    d['cosine'] = tmpresult.Cos_sim;
                }
            })
            setModelRow(tmp);
        }
    },[config,configReload,calresult])

    useEffect(()=>{
        if(modelRow.length!==0){
            let statustmp = [...status];
            statustmp[0] = modelRow.length;
            statustmp[1] = modelRow.filter(d=>d.status==='error').length;
            statustmp[2] = modelRow.filter(d=>d.status==='done').length;
            statustmp[3] = modelRow.filter(d=>d.status==='running').length;
            statustmp[4] = modelRow.filter(d=>d.status==='wait').length;
            setStatus(statustmp);
        }
    },[modelRow])

    useInterval(()=>{
        setListReload(!listReload);
    },10000);

    // plot for running model
    useInterval(()=>{
        if(nowModel.length!==0){
            fetch(`/api/python/plot`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, model:nowModel}),
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.hasOwnProperty('error')) alert(data.error);
                else{    
                    setLog(data.data);
                    setLoss(data.loss);
                    setvalLoss(data.valloss);
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    // if(canirun===40) { setExlog(log); setCanirun(0);}
                    // for ref set
                    if(canirun===20) { setExlog(log); setCanirun(0);}
                    else{
                        setCanirun(canirun+1);
                        if(log===exlog) {setIsRunning(false); setCanirun(0); setExlog('.');scrollRef.current.scrollTop = 0;}
                    }
                }
            })
        }
    // },isRunning?500:null);
    // for ref set
    },isRunning?1000:null);


    // model delete
    const handleDelete = (modelIndexs)=>{
        if(!window.confirm('정말로 선택하신 모델을 삭제하시겠습니까?')){
            return;
        }else{
            let models = [...modelRow];
            let selectModels = [];
            modelIndexs.map(d=>{
                selectModels.push(models[d].model);
            })
            fetch(`/api/user/model`,{
                method:'DELETE',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, models:selectModels})
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.result==='success'){
                    let newModels = modelRow.map((d,idx)=>{if(!modelIndexs.includes(idx)) return d;}).filter(d=>d);
                    newModels.map((d,idx)=>{d.id=idx;});
                    setModelRow(newModels);
                    setSelect([]);
                    setListReload(!listReload);
                }
            })
        }
    }

    const handleConfigAtt = (att, value) =>{
        let tmp = config.hasOwnProperty(configSelect)?{...config[configSelect]}:{...tmpconfig};
        console.log(att)
        tmp[att] = att ==='epoch'||att==='learning rate'?Number(value):value;
        if(att === 'Train ratio') tmp.hasOwnProperty('Validation ratio')?tmp['Test ratio']=10-value-tmp['Validation ratio']:tmp['Test ratio']=10-value-1;
        else if(att === 'Validation ratio') tmp.hasOwnProperty('Train ratio')?tmp['Test ratio']=10-value-tmp['Train ratio']:tmp['Test ratio']=10-value-1;
        setTmpconfig(tmp);
    }

    const handleConfig = ()=>{
        
        if(modelRow.filter(d=>d.model === configSelect).at(0).status==='running') alert('학습중인 모델은 수정할 수 없습니다.');
        else if(tmpconfig['Test ratio']<=0||tmpconfig['Train ratio']<=0||tmpconfig['Validation ratio']<=0) alert('Train ratio, Validation ratio, Test ratio의 합은 10이어야 합니다.(Test ratio는 자동으로 계산됩니다.)');
        else{
            fetch('/api/user/config',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userid:userid, model:configSelect, config:tmpconfig})
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.hasOwnProperty('error')){
                    alert(`Config 저장에 실패했습니다. ${data.error}`);
                }else{
                    let tmp = {...config};
                    tmp[configSelect] = tmpconfig;
                    setConfig(tmp);
                    alert('적용되었습니다.');
                }
            })
        }
    }

    const handleSend = ()=>{
        if(select.length===0) alert('공유할 모델을 선택해주세요.');
        else{
            for(let d of select){
                if(modelRow[d].status==='running'||modelRow[d].status==='wait') {
                    alert(`학습중이거나 학습 대기중인 모델이 포함되어있습니다..`);
                    return;
                }
            }

            // user list 가져오기
            fetch(`/api/user/list`)
            .then(res=>res.json())
            .then(data=>{
                if(data.hasOwnProperty('error')) alert(data.error);
                else{
                    let tmp = data.result;
                    tmp = tmp.filter(d=>d!==userid);
                    tmp = tmp.sort((a,b)=>a>b?1:-1);
                    setUserList(tmp);
                    handleModalOpen();
                }
            })
        }
    }

    const handleToggle = (value) => () => {
        const currentIndex = userSelect.indexOf(value);
        const newChecked = [...userSelect];
    
        if (currentIndex === -1) {
          newChecked.push(value);
        } else {
          newChecked.splice(currentIndex, 1);
        }
    
        setUserSelect(newChecked);
      };


    return(
        <div className="train-page" style={{height:'95vh', width:'100%'}}>
            <CssBaseline/>
            <Grid container component="main" sx={{width:'100%',height:'95vh'}}>
                <Grid
                    item
                    className="train-left"
                    sm={6}
                    md={6}
                    sx={{height:'95vh', display:'flex', flexDirection:'column', padding:'1rem'}}
                >
                    <div className="config">
                        <b>Train Config</b>
                        <div style={{display:'flex', height:'25vh'}}>
                            <List
                                sx={{
                                    width:'40%',
                                    position:'relative',
                                    overflow:'auto',
                                    '& ul': { padding: 0 },
                                    marginTop:'0.5rem',
                                }}
                                component={Paper}
                                subheader={<li/>}
                            >
                                <li key = 'config'>
                                    <ul>
                                        <ListSubheader>Models</ListSubheader>
                                        {
                                            modelList.map(t=>(
                                                <ListItemButton key={t}  selected={configSelect===t} onClick={e=>setConfigSelect(t)} sx={{height:'3vh'}}>
                                                    <ListItemText primary={t} />
                                                </ListItemButton>
                                            ))
                                        }
                                    </ul>
                                </li>
                            </List>
                            <List
                                sx={{
                                    position:'relative',
                                    overflow:'auto',
                                    '& ul': { padding: 0 },
                                    marginTop:'0.5rem',
                                    marginLeft:'1rem',
                                    width:'60%',
                                }}
                                component={Paper}
                                subheader={<li/>}
                            >
                                {configSelect!==""?<li key = 'config-models'>
                                    <ul>
                                        <ListSubheader sx={{display:'flex',justifyContent:'end'}}>
                                            <Button onClick={handleConfig} size="small" variant="contained" sx={{marginY:'0.5rem'}}>Apply</Button>
                                        </ListSubheader>
                                        <ListItem>
                                            <ListItemText primary="epoch" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('epoch',e.target.valueAsNumber)} key={`${configSelect}-epoch`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['epoch']:100} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="learning rate" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('learning rate',e.target.valueAsNumber)} key={`${configSelect}-lr`}  size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['learning rate']:0.01} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="optimizer" />
                                            <FormControl key={`${configSelect}-form-opt`} variant="standard" size="small" sx={{width:'8rem', }}>
                                                <Select
                                                    key={`${configSelect}-optimizer`}
                                                    defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['optimizer']:"RMSprop"}
                                                    sx={{fontSize:'0.8rem'}}
                                                    onChange={e=>handleConfigAtt('optimizer',e.target.value)}
                                                >
                                                    {
                                                        configlist['optimizer'].map(v=>(
                                                            <MenuItem value={v}>{v}</MenuItem>
                                                        ))
                                                    }
                                                </Select>
                                            </FormControl>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="loss function" />
                                            <FormControl key={`${configSelect}-form-loss`} variant="standard" size="small" sx={{width:'8rem', }}>
                                                <Select
                                                    key={`${configSelect}-loss`}
                                                    defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['loss function']:"MSE"}
                                                    sx={{fontSize:'0.8rem'}}
                                                    onChange={e=>handleConfigAtt('loss function',e.target.value)}
                                                >
                                                    {
                                                        configlist['loss function'].map(v=>(
                                                            <MenuItem value={v}>{v}</MenuItem>
                                                        ))
                                                    }
                                                </Select>
                                            </FormControl>
                                        </ListItem>
                                        {/* <ListItem>
                                            <ListItemText primary="Input Sequence" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Input Sequence',e.target.valueAsNumber)} key={`${configSelect}-inseq`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Input Sequence']:7} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="Output Sequence" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Output Sequence',e.target.valueAsNumber)} key={`${configSelect}-outseq`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Output Sequence']:7} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="Input Shift" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Input Shift',e.target.valueAsNumber)} key={`${configSelect}-inshf`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Input Shift']:7} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="Output Shift" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Output Shift',e.target.valueAsNumber)} key={`${configSelect}-outshf`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Output Shift']:7} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem> */}
                                        <ListItem>
                                            <ListItemText primary="Train ratio" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Train ratio',e.target.valueAsNumber)} key={`${configSelect}-train`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Train ratio']:8} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText primary="Validation ratio" />
                                            <OutlinedInput type="number" onChange={e=>handleConfigAtt('Validation ratio',e.target.valueAsNumber)} key={`${configSelect}-Validation`} size="small" defaultValue={config.hasOwnProperty(configSelect)?config[`${configSelect}`]['Validation ratio']:1} sx={{width:'8rem',height:'2rem', fontSize:'0.8rem'}}/>
                                        </ListItem>
                
                                    </ul>
                                </li>:<></>}
                            </List>
                        </div>
                    </div>
                    <div className="Status" style={{marginTop:'0.8rem'}}>
                        <b>Status</b>
                        <TableContainer component={Paper} sx={{width:'100%', marginTop:'0.5rem',}}>
                            <Table size="small">
                                <TableHead><TableRow>{['Total','Skipped','Completed','On-going','Scheduled'].map(d=>(<TableCell align="center">{d}</TableCell>))}</TableRow></TableHead>
                                <TableBody><TableRow>{status.map(d=>(<TableCell align="center">{d}</TableCell>))}</TableRow></TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                    <div className="Evaluation" style={{marginTop:'0.8rem'}}>
                        <div className="evaluation-header" style={{display:'flex',justifyContent:'space-between'}}>
                            <b>Add evaluation</b>
                            <div style={{display:'flex', width:'27rem', justifyContent:'space-between'}}>
                                <Button variant="contained" color="error" size="small" onClick={e=>handleDelete(select)}>Model Delete</Button>
                                <Button variant="contained" size="small" onClick={handleSend}>Model Send</Button>
                                <Button variant="contained" size="small" onClick={train}>Train</Button>
                                <Button variant="contained" size="small" onClick={plot}>Plot</Button>
                                <Button variant="contained" color="success" size="small" onClick={save}>Publish Model</Button>
                            </div>
                        </div>
                        <div style={{height:'30vh', marginTop:'0.5rem', marginBottom:'0.5rem'}}>
                            <DataGrid
                                density="compact"
                                hideFooter
                                disableColumnMenu
                                checkboxSelection
                                onSelectionModelChange={(newSelectionModel) => {setSelect(newSelectionModel);}}
                                selectionModel={select}
                                rows={modelRow}
                                columns={modelColumn}
                            />
                        </div>
                        <b>Debug</b>
                        <div style={{height:'14vh', marginTop:'0.5rem'}}>
                            <DataGrid
                                density="compact"
                                hideFooter
                                disableColumnMenu
                                rows={debugRow}
                                columns={debugColumn}
                            />
                        </div>
                    </div>
                    <Modal
                        open={modalOpen}
                        onClose={handleModalClose}
                        aria-labelledby="modal-modal-title"
                        aria-describedby="modal-modal-description"
                    >
                        <Paper sx = {modalstyle}>
                            <b>User List</b>
                            {userList.length!==0?
                            <div style={{display:'flex', flexDirection:'column', }}>
                                <List
                                        sx={{
                                            marginTop:'1rem',
                                            position:'relative',
                                            overflow:'auto',
                                            '& ul': { padding: 0 },
                                            height:480
                                        }}
                                        component={Paper}
                                    >
                                        {userList.map((value,i)=>{
                                            return(
                                                <ListItem
                                                    key={i}
                                                    disablePadding
                                                >
                                                    <ListItemButton role={undefined} onClick={handleToggle(i)} dense>
                                                        <ListItemIcon>
                                                            <Checkbox
                                                                edge="start"
                                                                checked={userSelect.indexOf(i) !== -1}
                                                                tabIndex={-1}
                                                                disableRipple
                                                                inputProps={{ 'aria-labelledby': `${i}_${value}` }}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText id={`${i}_${value}`} primary={`${value}`} />
                                                    </ListItemButton>
                                                </ListItem>
                                            )
                                        })}
                                    </List>
                                    <div style={{display:'flex', justifyContent:'center',marginTop:'0.5rem'}}>
                                        <Button variant="contained" size="small" sx={{width:'40%',marginX:'0.2rem'}} onClick={send}>Send</Button>
                                        <Button variant="contained" size="small" sx={{width:'40%',marginX:'0.2rem'}} onClick={handleModalClose}>Cancle</Button>
                                    </div>
                            </div>:<>No User</>
                        }
                        </Paper>
                    </Modal>
                </Grid>
                <Grid
                    item
                    className="train-right"
                    sm={6}
                    md={6}
                    sx={{height:'95vh', display:'flex', flexDirection:'column', padding:'1rem', alignItems:'center'}}
                >
                    <div className="ongoing" style={{flex:0.33, width:'100%', display:'flex', flexDirection:'column', alignItems:'center'}}>
                        {/* <b style={{margin:'auto'}}>On-going</b> */}
                        <b>On-going</b>
                        <Paper sx={{paddingLeft:'0.3rem',width:'100%',height:'25vh', overflow:'auto',backgroundColor:'black',color:'white', fontSize:'0.8rem', whiteSpace:'pre-wrap'}} ref={scrollRef}>{log}</Paper>
                    </div>
                    <div className="loss" style={{flex:0.33, width:'100%', display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <b>Loss history</b>
                        <div style={{width:'100%', height:'25vh', }}>
                            {loss.length===0&&isRunning?<Skeleton variant="rectangular" animation="wave" width="99%" height="25vh" margin="0" />:<Line options={chartOptions} data={{
                                labels: Array.from({length:loss.length},(v,k)=>k+1),
                                datasets: [
                                    {
                                        label: 'Loss',
                                        data: loss,
                                        type: 'line',
                                        borderColor: 'rgb(0, 0, 0)',
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                        borderWidth: 1,
                                        pointRadius: 0.2,
                                    },
                                    {
                                        label: 'Validation Loss',
                                        data: valloss,
                                        type: 'line',
                                        borderColor: 'rgb(255, 0, 0)',
                                        backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                        borderWidth: 1,
                                        pointRadius: 0.2,
                                    }
                                ]
                            }}/>}
                        </div>
                    </div>
                    <div className="modeloutput" style={{flex:0.33, width:'100%', display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <b>Model Output</b>
                        <Paper style={{width:'100%', height:'25vh', overflow:'auto' }}>
                            {isresultLoading?
                            <Skeleton variant="rectangular" animation="wave" width="99%" height="25vh" margin="0" />:
                                // <Line options={chartOptions} data={{
                                //     labels: resultLabel,
                                //     datasets: resultDataset
                                // }}/>
                                Object.keys(resultDataset).map(key=>{
                                    return(
                                        <Line options={{...chartOptions,...{plugins:{
                                            title:{
                                                display:true,
                                                text:key,
                                                font:{
                                                    size:20,
                                                    family:"BasicEB",
                                                },
                                                color:'black'
                                            },
                                            legend:{display:true,position:'top'},
                                        }}}} data={{
                                            labels: resultLabel,
                                            datasets: resultDataset[key]
                                        }} style={{marginBottom:'2em'}} />
                                    )
                                })
                            }
                        </Paper>
                    </div>
                </Grid>
            </Grid>
        </div>

    )
}