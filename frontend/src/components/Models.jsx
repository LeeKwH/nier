import { Radio,RadioGroup,FormControlLabel,CircularProgress , Modal, TextField, FormControl, IconButton , Select, MenuItem, Divider, OutlinedInput, List, ListItem,ListItemText,ListItemButton, ListSubheader, Button, Grid, CssBaseline,  Paper, Tooltip } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import { useState,useCallback } from "react";
import {layers} from './subModel/layers';
import { useEffect } from "react";
import { useCookies } from 'react-cookie';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  updateEdge,
} from 'reactflow';

import './subModel/flow/flowstyle.css';
import DownloadButton from './subModel/flow/flowdownload';
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

const Confirm = (message = null, onConfirm, onCancel) => {
    if (!onConfirm || typeof onConfirm !== "function") {
        return;
    }
    if (onCancel && typeof onCancel !== "function") {
        return;
    }

    const confirmAction = () => {
        if (window.confirm(message)) {
            onConfirm( );
        } else {
            onCancel();
        }
    };

    return confirmAction;
};
 
export default function Models(){
    const [cookies, setCookie, removeCookie] = useCookies(['id']);
    const [nodes, setNodes, onNodesChange] = useNodesState([{ id: 'input_col1', type:'input',position: { x: 10, y: 10 }, data: { label: 'Input_1' }, sourcePosition:'bottom' },]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const onEdgeUpdate = useCallback(
        (oldEdge, newConnection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
        []
    );
    const [nodeError, setNodeError] = useState([]);
    const [edgeError, setEdgeError] = useState([]);
    const [mergeError, setMergeError] = useState([]);
    const [mergeLayerError, setMergeLayerError] = useState([]);
    const [convWarning, setConvWarning] = useState([]);

    const [viewRows,setViewRows] = useState([{id:0, set:'System'},{id:1, set:'Category'},{id:2, set:'Site'},{id:3,set:'Variable'}]);
    const [viewColumns,setViewColumns] = useState([{field:'set',headerName:' ',headerClassName:'datagrid-header', sortable:false,width:70},]);

    const [selectedIdx, setSelectedIdx] = useState();

    const [layerDefaultName, setlayerDefaultName] = useState("Layer Name");
    const [tmpMergeValue, setTmpMergeValue] = useState([]);
    const columns = [
        {field: 'id',headerName:' ',headerClassName: 'datagrid-header',width: 10,},
        {field: 'newc',headerName:'new Column',headerClassName: 'datagrid-header',flex:1,sortable: false,},
        {field: 'column',headerName:'Column',headerClassName: 'datagrid-header',flex:1,sortable: false, align:'center', renderCell:(params)=>{if(params.row.type !=="Merge") return (
            <div><TextField variant="standard" margin="dense" onChange={(e)=>handleEnterColrow(e,params.value,0)} defaultValue={colrow[params.value]?colrow[params.value][0]:0} value={colrow[params.value]?colrow[params.value][0]:0} key={`${params.value}_col`} type="number" size="small" className="layer-input" sx={{width:'50%'}}/><IconButton aria-label="minus" onClick={(e)=>handlePlMiClick(params.value,0,0)}><ArrowLeftIcon/></IconButton><IconButton aria-label="plus" onClick={(e)=>handlePlMiClick(params.value,1,0)}><ArrowRightIcon/></IconButton></div>)
            else return (<></>)
        }},
        {field: 'row',headerName:'Row',headerClassName: 'datagrid-header',flex:1,sortable: false, renderCell:(params)=>{if(params.row.type !=="Merge") return(
            <div><TextField variant="standard" margin="dense" onChange={(e)=>handleEnterColrow(e,params.value,1)} defaultValue={colrow[params.value]?colrow[params.value][1]:0} value={colrow[params.value]?colrow[params.value][1]:0} key={`${params.value}_row`} type="number" size="small" className="layer-input" sx={{width:'50%'}}/><IconButton aria-label="minus" onClick={(e)=>handlePlMiClick(params.value,0,1)}><ArrowLeftIcon/></IconButton><IconButton aria-label="plus" onClick={(e)=>handlePlMiClick(params.value,1,1)}><ArrowRightIcon/></IconButton></div>)
            else return (<></>)
        }},
        {field: 'merge', headerName:'Merge',headerClassName: 'datagrid-header', flex:1,sortable: false,renderCell:(params)=>{if(params.row.type ==="Merge") return (<><Tooltip followCursor title="Merge 레이어 Column값을 입력하세요. '적용'버튼 클릭 시 적용됩니다. Column은 ','로 구분됩니다. 연속된 Column은 '-'로 구분됩니다. ex) 1,2,3 or 1-3"><TextField variant="standard" margin="dense" onChange={(e)=>handleMergeChange(e,params.value[0])} defaultValue={merge[params.value[0]]?merge[params.value[0]].toString():"0,"}  key={`${params.value[0]}_merge`} size="small" sx={{width:'80%'}}/></Tooltip>
        <Button onClick={(e)=>handleMergeClick(params.value)} size="small" variant="contained">적용</Button></>)
            else return (<></>)
        }},
        {field: 'del',headerName:' ',headerClassName: 'datagrid-header',width:10,sortable: false,align:'center',renderCell:(params)=>(
            <Button color="error" onClick={(e)=>handleDelLayer(params.value)}>X</Button>)
        },
    ];
    const [rows,setRows] = useState([]);
    const layerlist = Object.keys(layers);
    const [attlist,setAttlist] = useState({
        att:{},
        attlists:[],
    });
    const [LayerObj, setLayerObj] = useState({});
    const [colrow, setColrow] = useState([]);
    const [infoLayerMax, setInfoLayerMax] = useState([]); // infoLayerMax[0] = number of col infoLayerMax[1] = max of row
    const [merge, setMerge] = useState([]);

    const [allVars, setAllVars] = useState([]);
    const [SeqShf, setSeqShf] = useState({'Input Sequence':7,'Output Sequence':7,'Input Shift':1,'Output Shift':1});
    
    const inputCol =[
        {field:'name', headerName:' ', headerClassName:'datagrid-header', flex:0.5, sortable:false,},
        {field:'input', headerName:'Input Variables', headerClassName:'datagrid-header', flex:1, sortable:false,
            renderCell:(params)=>{if(params.row.id<9999) return(<>
            <Tooltip followCursor title="Variables를 숫자, 숫자-숫자 형태로 입력하세요. Variables는 중복될 수 없습니다. ex)1,2-5"><TextField variant="standard" margin="dense" onChange={(e)=>handleInout(e,params.value)} size="small" sx={{width:'80%'}}/></Tooltip>
            </>)
            else return (<></>)
        }},
        {field:'output', headerName:'Output Variables', headerClassName:'datagrid-header', flex:1, sortable:false,
            renderCell:(params)=>{if(params.row.id===9999) return(<><Tooltip followCursor title="Variables를 숫자, 숫자-숫자 형태로 입력하세요. Variables는 중복될 수 없습니다. ex)1,2-5"><TextField variant="standard" margin="dense" onChange={(e)=>handleInout(e,params.value)} size="small" sx={{width:'80%'}}/></Tooltip></>)
            else return (<></>)
        }},
];
    const [inputRow, setInputRow] = useState([{id:9999, name:'Output',output:9999}]);

    const [inputList, setInputList] = useState([]);
    const [inoutData, setInoutData] = useState({'out':""});

    const [saveName, setSaveName] = useState("");
    const [saveLoad, setSaveLoad] = useState(false);
    
    const [modalShow, setModalShow] = useState(false);
    const handleOpen = () => setModalShow(true);
    const handleClose = () => setModalShow(false);
    const [ModelModalShow, setModelModalShow] = useState(false);
    const handleMOpen = () => setModelModalShow(true);
    const handleMClose = () => setModelModalShow(false);

    const [dataList, setDataList] = useState([]);
    const [ModelsList, setModelsList] = useState([]);
    const [selectedData, setSelectedData] = useState("");
    const [selectedModels, setSelectedModels] = useState("");
    const handleDataSelect = (idx) => setSelectedData(dataList[idx]);
    const handleModelsSelect = (idx) => setSelectedModels(ModelsList[idx]);
    
    const [dataInfo, setDataInfo] = useState([]);

    const [modelDescript, setModelDescript] = useState("");

    const [isImportRef, setIsImportRef] = useState(false);
    const [refSetting, setRefSetting] = useState("default");

    useEffect(() => {
        window.addEventListener('error', e => {
            if (e.message === 'ResizeObserver loop limit exceeded') {
                const resizeObserverErrDiv = document.getElementById(
                    'webpack-dev-server-client-overlay-div'
                );
                const resizeObserverErr = document.getElementById(
                    'webpack-dev-server-client-overlay'
                );
                if (resizeObserverErr) {
                    resizeObserverErr.setAttribute('style', 'display: none');
                }
                if (resizeObserverErrDiv) {
                    resizeObserverErrDiv.setAttribute('style', 'display: none');
                }
            }
        });
    }, []);

    useEffect(()=>{
        if(dataInfo.length!==0){
            let cols = [{field:'set',headerName:' ',headerClassName:'datagrid-header', sortable:false,width:70},];
            let ros = [{id:0, set:'System'},{id:1, set:'Category'},{id:2, set:'Site'},{id:3,set:'Variable'}];

            dataInfo.map((r,idx)=>{
                cols.push({field:`x${idx}`,sortable:false,width:150,headerName:`x${idx}`,headerClassName:'datagrid-header'});
                r.map((v,i)=>ros[i][`x${idx}`]=v);
            })
            setViewColumns([...cols]);
            setViewRows([...ros]);
        }
    },[dataInfo])

    // handle row data for draw flowmap
    useEffect(()=>{
        if(!isImportRef){// set Node (change position and validation column, row value)
        let nodetmp = [...nodes];
        let tmp = nodetmp.filter((d)=>d.type!=='input'&&d.type!=='default');
        if(tmp.length!==0){
            tmp.map((d,i)=>{
                colrow[i][0]<=0||colrow[i][1]<=0?
                Object.assign(d,{position:{x:10+((colrow[i][0]-1)*150),y:10+((colrow[i][1])*50)}, hidden:true}):
                Object.assign(d,{position:{x:10+((colrow[i][0]-1)*150),y:10+((colrow[i][1])*50)}, hidden:false})
            });
        }
        nodetmp = [nodetmp[0],...tmp]
        setNodes(nodetmp);

        // set Edge
        const colvalue = colrow.map(d=>{if(d[0]>=1&&d[1]>=1) return d[0]}).filter(d=>d);
        const rowvalue = colrow.map(d=>{if(d[0]>=1&&d[1]>=1) return d[1]}).filter(d=>d);
        const set = new Set(colvalue);
        const maxrow = rowvalue.length===0?0:Math.max.apply(null,rowvalue);
        setInfoLayerMax([set.size,maxrow]);

        let sortData = {};
        if(colvalue){
        colvalue.map(c=>{
            sortData[`${c}`] = colrow.filter(d=>d[0]===c).sort((a,b)=>a[1]-b[1]);
        });
        setInputList(Object.keys(sortData));
        const edgetmp = [];
        const mercolrow = colrow.filter(m => m[2].includes('merge')||m[2].includes('Merge'));
        Object.entries(sortData).map(c=>{
            if(c[0]==='1') edgetmp.push({id:'init1', source:`input_col1`,target:`${c[1][0][2]}`, })
            else{
                nodetmp.push({id: `input_col${c[0]}`, type:'input',position: { x: 10+((Number(c[0])-1)*150), y: 10 }, data: { label: `Input_${Number(c[0])}` }, sourcePosition:'bottom'})
                setNodes(nodetmp);
                edgetmp.push({id:`init${c[0]}`, source:`input_col${c[0]}`,target:`${c[1][0][2]}`, })
            }
            let lastidx = c[1].length-1;
            for(let i= lastidx; i>0; i--) {
                edgetmp.push({id:`e${c}${i-1}_${i}`,source:`${c[1][i-1][2]}`,target:`${c[1][i][2]}`,});
            }
        })
        mercolrow.map((m,idx)=>{
            merge[idx].map((d,id)=>{
                if(id!==0&&sortData[`${d}`]){
                    // let source = sortData[`${d}`].filter(tmp=>!tmp[2].includes(`${m[2]}`)&&!(tmp[2].includes('Merge')&&tmp[1]>=m[1])).at(-1);
                    let source = sortData[`${d}`].filter(tmp=>!tmp[2].includes(`${m[2]}`)&&!(tmp[1]>=m[1])).at(-1);
                    if(source) edgetmp.push({id:`merge_${d}_${m[2]}`,source:`${source[2]}`, target:`${m[2]}`, },);
                }
            })
        });
        setEdges(edgetmp);}

        // Error Validation for Node
        let errortmp = [];
        let warningtmp = [];
        colrow.map((m,idx)=>{
            let strcolrow = [...colrow];
            strcolrow.splice(idx,1);
            strcolrow = JSON.stringify(strcolrow);
            if(m[0]>=1&&m[1]>=1){
                if (strcolrow.includes(JSON.stringify(m).slice(0,5))) errortmp.push(`${m[0]},${m[1]}`);
                if (m[2].includes('Conv')) warningtmp.push(`${m[0]},${m[1]}`);
            }
        });
        errortmp = [...new Set(errortmp)].map((v) => v.split(",")).map((v) => v.map((a) => +a));
        warningtmp = [...new Set(warningtmp)].map((v) => v.split(",")).map((v) => v.map((a) => +a));
        setNodeError(errortmp);
        setConvWarning(warningtmp);
        }
    },[colrow,merge])

    // Input handler
    useEffect(()=>{
        let tmpinputrow = [...inputRow];
        let tmpinoutdata = {...inoutData};
        if(inputList.length!==0){
            let output = tmpinputrow.pop();
            if(tmpinputrow.length===0){
                inputList.map(d=>{tmpinputrow.push({id:d, name:`Input_${d}`,input:d});})
            }else{
                let excol = tmpinputrow.map(d=>d.id);
                excol.map((d,idx)=>{if(!inputList.includes(d)) {
                    tmpinputrow.splice(idx,1);
                    tmpinoutdata[`${d}`] = ""; 
                }});
                inputList.map(d=>{if(!excol.includes(d)) tmpinputrow.push({id:d, name:`Input_${d}`,input:d});})
            }
            
            setInoutData(tmpinoutdata);
            setInputRow([...tmpinputrow,output]);
        }else{
            let init = tmpinputrow.at(-1);
            setInoutData({'out':inoutData['out']});
            setInputRow([init]);
        }
    },[inputList])

    
    useEffect(()=>{
        console.log(SeqShf)
    },[SeqShf])


    // Error Validation for Edge
    useEffect(()=>{
        let errortmpedge = [];
        const edsources = edges.map(d=>d.source);
        // edsources.map(x=>{if(edsources.indexOf(x)!==edsources.lastIndexOf(x)) errortmpedge.push(x)});
        edsources.map(x=>{if(edsources.indexOf(x)!==edsources.lastIndexOf(x)) errortmpedge.push(x)});
        setEdgeError([...new Set(errortmpedge)]);

        let errortmpmerge = [];
        const merges = edges.filter(d=>d.source.includes('Merge')||d.source.includes('merge'));
        merges.map(x=>{if(x.target.includes('Merge')||x.target.includes('merge')) errortmpmerge.push(x.source)});
        setMergeError([...new Set(errortmpmerge)]);

        let errortmpmergelayer = [];
        const mergelayers = rows.map(d=>d.newc).filter(d=>d.includes('Merge')||d.includes('merge'));
        mergelayers.map(x=>{if(!edsources.includes(x)) errortmpmergelayer.push(x)});
        setMergeLayerError([...new Set(errortmpmergelayer)]);
    },[edges])

    // Error handle Node
    useEffect(()=>{
        if(nodeError.length!==0){
            let nodetmp = [...nodes];
            nodetmp = nodetmp.filter((d)=>d.type!=='default');
            nodeError.map((n,i)=>nodetmp.push({id:`error_${i}`,type:'default',className:'error-node', data:{label:(<Tooltip title={`여러개의 레이어가 겹쳤습니다. 레이어를 제거하거나 Column 혹은 Row 값을 변경해주세요.[column-${n[0]}, row-${n[1]}]`} followCursor><ErrorIcon color='error'/></Tooltip>),},draggable:false,position:{x:((n[0]-1)*150)-15, y:10+((n[1])*50)}}))
            setNodes(nodetmp);
        }
    },[nodeError])

    // Warning handle Node
    useEffect(()=>{
        if(convWarning.length!==0){
            let nodetmp = [...nodes];
            nodetmp = nodetmp.filter((d)=>d.type!=='default');
            convWarning.map((n,i)=>nodetmp.push({id:`warning_${i}`,type:'default',className:'warning-node', data:{label:(<Tooltip title={`Conv 레이어는 모델 구조에 따라 Flatten Layer를 추가로 필요로 할 수 있습니다.[column-${n[0]}, row-${n[1]}]`} followCursor><WarningAmberIcon color='warning'/></Tooltip>),},draggable:false,position:{x:((n[0])*150)-30, y:10+((n[1])*50)}}))
            setNodes(nodetmp);
        }
    },[convWarning])

    // Error handle Edge
    useEffect(()=>{
        let nodetmp = [...nodes];
        if(edgeError.length!==0){
            edgeError.map(d=>{
                nodes.map(k=>{
                    if(d === k.id) nodetmp.push({id:`error_${d}`,type:'default',className:'error-node',data:{label:(<Tooltip title={`Merge가 중복되었거나 Merge된 Column에 layer가 추가되었습니다. Merge를 제거하거나 Column에 추가된 레이어를 제거해주세요.`} followCursor><ErrorIcon color='error'/></Tooltip>)}, draggable:false,position:{x:k.position.x+45, y:k.position.y+25}})
                })
            })
        }
        if(mergeError.length!==0){
            mergeError.map(d=>{
                nodes.map(k=>{
                    if(d === k.id) nodetmp.push({id:`error_${d}`,type:'default',className:'error-node',data:{label:(<Tooltip title={`Merge 레이어와 Merge 레이어는 연결될 수 없습니다. Merge를 제거하거나 Merge 레이어 사이에 레이어를 추가해주세요.`} followCursor><ErrorIcon color='error'/></Tooltip>)}, draggable:false,position:{x:k.position.x+45, y:k.position.y+25}})
                })
            })
        }
        if(mergeLayerError.length!==0){
            mergeLayerError.map(d=>{
                nodes.map(k=>{
                    if(d === k.id) nodetmp.push({id:`error_${d}`,type:'default',className:'error-node',data:{label:(<Tooltip title={`Merge 레이어 아래에는 반드시 1개 이상의 레이어가 추가되어야합니다. Merge를 제거하거나 Merge 레이어 아래에 레이어를 추가해주세요.`} followCursor><ErrorIcon color='error'/></Tooltip>)}, draggable:false,position:{x:k.position.x+45, y:k.position.y+25}})
                })
            })
        }
        setNodes(nodetmp);
    },[edgeError,mergeError,mergeLayerError])

    // handle Import ref model
    useEffect(()=>{
        if(isImportRef){
            let tmp = [...nodes];
            // tmp = tmp.filter(d=>d.type!=='default'&&d.type!=='input');
            if(colrow.lenth!==0){
                colrow.map(d=>{
                    tmp.push({id:d[2],position:{x:10+((d[0]-1)*150),y:10+((d[1])*50)},data:{label:d[2]},sourcePosition:'bottom'})
                })
                setNodes(tmp);
            }
        }
    },[isImportRef])

    const handleMergeChange  = (e,idx)=>{
        let tmp = [...tmpMergeValue];
        tmp[idx] = e.target.value;
        setTmpMergeValue(tmp);
    }

    const handleMergeClick = (param)=>{
        const idx = param[0];
        const rootidx = param[1];
        let data = tmpMergeValue[idx].split(','); //string
        let result = [];
        let tmp = data.filter(d=>!d.includes("-"));
        let sptmp = data.filter(d=> d.includes('-'));
        
        
        if(tmp.length!==0) result = [...result,...tmp];           
        if(sptmp.length!==0){
            sptmp.map(d=>{
                let tmpstr = d.split('-');
                let len = Number(tmpstr.at(-1)) - Number(tmpstr[0]) +1;
                let tmparr = Array.from({length:len},(v,i)=>i+Number(tmpstr[0]));
                result = [...result,...tmparr];
            })
        }
        if(result.length!==0){
            result = result.map(i=>Number(i));
            let setresult = new Set(result);
            result = [...setresult];
        }
        let merges = [...merge];
        merges[idx] = result;
        setMerge(merges);
        
        let tmpcolrow = [...colrow];
        tmpcolrow[rootidx][0] = result[0];
        setColrow(tmpcolrow);
    }



    /**
     *  handle Layer Object, make Object to add layer
     * @param {event} e 
     * @param {string} att 
     */
    const handleLayerObj = (e,att,type) =>{
        let tmp = {...LayerObj};
        const input = type==="select"? e.target.value : Number(e.target.value);
        tmp[att] = input;
        setLayerObj(tmp);
    }


    /**
     * if click layer, set Layer Object to add 
     * @param {string} l name of layer
     * @param {string} item name of attribute
     */
    const handleLayerClick = (l, item)=>{
        const att = layers[l][item];
        const {descript, ...value} = att;
        let tmp = {};
        setAttlist({att: att,attlists:Object.keys(value)});
        for(let key in value){
            if(Array.isArray(value[key])) tmp[key] = value[key][0];
            else tmp[key] = value[key];
        }

        // item==="Merge"?setlayerDefaultName(`${Object.keys(descript)[0]}_${rows.length}`):setlayerDefaultName(Object.keys(descript)[0]);
        setlayerDefaultName(layername(item));
        setLayerObj(tmp);
    }

    const layername = (name) =>{
        let layers = rows.filter(d=>d.type===name);
        let length = layers.length!==0?Number(layers.at(-1).newc.split('_').at(-1))+1:1;
        return `${name}_${length}`;
    }


    /**
     * if click add button, add layer
     */
    const handleAddClick = () =>{
        if(isImportRef) alert("Reference Model을 Import한 경우에는 레이어를 추가할 수 없습니다.");
        else if(!selectedIdx) alert("레이어가 선택되지 않았습니다.");
        else if(selectedIdx.endsWith('Merge')&&infoLayerMax[0]<=1) alert("Merge Error: 병합할 레이어가 없습니다. 먼저 레이어를 추가해주세요.");
        else if(selectedIdx.endsWith('Merge')&&!layerDefaultName.includes('Merge')) alert("Merge Error: Merge 레이어 이름은 반드시 'Merge'를 포함하여야합니다.");
        else if(selectedIdx.endsWith('Merge')&&rows.map(d=>d.newc).includes(layerDefaultName)) alert(`Merge Error: Merge 레이어 이름이 중복되었습니다. (${layerDefaultName}) Merge 레이어 이름은 중복될 수 없습니다.`);
        else{
            let tmp = [...rows];
            let idx = tmp.length;
            let type = selectedIdx.split('-')[1];
            let rowtmp ={id:idx, newc:layerDefaultName, column:idx, row:idx ,data:LayerObj, type:type, del:idx}; 
            
            let crtmp = [...colrow];
            let nodetmp = [...nodes];
            
            const isMergerow = type==='Merge'?infoLayerMax[1]:nodetmp.length;
            // const isMergeidx = type==='Merge'?infoLayerMax[1]+1:nodetmp.length;
            const isMergeidx = infoLayerMax[1]+1;
            if(nodetmp.map(d=>d.id).includes(`${layerDefaultName}`)){
                nodetmp.push({ id: `${layerDefaultName}_${idx}`,position: { x: 10, y: 20+(isMergerow*50) }, data: { label: `${layerDefaultName}` },hidden:true });
                crtmp.push([1,isMergeidx,`${layerDefaultName}_${idx}`]);
            } else {
                nodetmp.push({ id: `${layerDefaultName}`,position: { x: 10, y: 20+(isMergerow*50) }, data: { label: `${layerDefaultName}` },hidden:true });
                crtmp.push([1,isMergeidx,`${layerDefaultName}`]);
            }
            
            if(type==='Merge'){
                let mergetmp = [...merge];
                let i = mergetmp.length;
                let tmparr = Array.from({length:infoLayerMax[0]}, (v,i)=>i+1);
                mergetmp.push(tmparr);
                rowtmp['merge'] = [i,idx];
                setMerge(mergetmp);
            }
            tmp.push(rowtmp);
            setRows(tmp);
            setColrow(crtmp);
            setNodes(nodetmp);
            setLayerObj({});
            setlayerDefaultName("Layer Name");
            setSelectedIdx();
        }
    }

    /**
     * delete layer from index
     * @param {int} idx index of layer which delete 
     */
    const handleDelLayer = (idx) =>{
        let tmp = [...rows];
        let mergetmp = [...merge];

        if(tmp[idx].type==="Merge"){
            const mergeidx = tmp[idx].merge[0];
            mergetmp.splice(mergeidx,1);
            setMerge(mergetmp);
        }

        tmp.splice(idx,1);
        let mergeidx = -1;
        let ttmp = tmp.map((d,i)=>{
            if (d.type === "Merge"){
                mergeidx +=1;
                return Object.assign(d,{id:i,del:i,column:i,row:i,merge:[mergeidx,i]});
            }else return Object.assign(d,{id:i,del:i,column:i,row:i});
        });
        setRows(ttmp);
        
        let crtmp = [...colrow];
        crtmp.splice(idx,1);
        setColrow(crtmp);

        let nodetmp = [...nodes];
        nodetmp.splice(idx+1,1);
        setNodes(nodetmp);

        // let ncoltmp = [...nodeColrow[0]];
        // ncoltmp.splice
    }


    /**
     * reset all layer
     */
    const handleLayerReset = () =>{
        setRows([]);
        setColrow([]);
        setNodes([{ id: 'input_col1', type:'input',position: { x: 10, y: 10 }, data: { label: 'Input_1' }, sourcePosition:'bottom' },]);
        setEdges([]);
        setMerge([]);
        setTmpMergeValue([]);
        let tmprow = [{id:9999, name:'Output',output:9999, 'out':inputRow['out']}];
        setInputRow(tmprow);
        setInputList([]);
        setIsImportRef(false);
        // setInputSeq([]);
    }

    /**
     * handle plus minus button
     * @param {int} idx colrow index 
     * @param {int} is 0 : is minus 1 : is plus
     * @param {int} cridx 0 : is col 1 : is row
     */
    const handlePlMiClick = (idx,is,cridx) =>{
        let tmp = [...colrow];
        let target = tmp[idx];
        
        // minus
        if(is === 0) target[cridx] = target[cridx] -1 <= 0?1:target[cridx]-1;
        // plus
        else target[cridx] = target[cridx] +1;

        tmp[idx] = target;
        setColrow(tmp);
    }

    const handleEnterColrow = (e, idx, cridx) =>{
        let tmp = [...colrow];
        let target = tmp[idx];
        target[cridx] = Number(e.target.value)<=0?1:Number(e.target.value);
        tmp[idx] = target;
        setColrow(tmp);
    }

    const handleInout = (e, id) =>{
        let tmpinout = {...inoutData};
        if(id === 9999)tmpinout['out'] = e.target.value;
        else{
            tmpinout[`${id}`] = e.target.value; 
        }
        Object.keys(tmpinout).map(d=>{if(tmpinout[d]===""&&d!=='out') delete tmpinout[d];});
        //sort tmpinout by key
        let tmpinoutsort = Object.keys(tmpinout).sort().reduce((r, k) => (r[k] = tmpinout[k], r), {});
        setInoutData(tmpinoutsort);
    }

    function isObject(val) {
        if (val === null) { return false;}
        return ( (typeof val === 'function') || (typeof val === 'object') );
    }

    const valiInout = (data)=>{
        let inoutdata = {...data};
        let keys = Object.keys(inoutdata);
        if(inputRow.length!==keys.length) return 'input variable이 입력되지 않은 Column이 있습니다.';
        let values = keys.map(d=>inoutdata[d].split(','));
        let resultvalues = [];
        values.map((d,idx)=>{
            let retmp = [];
            d.map(e=>{
                if(e.includes('-')){
                    let tmp = e.split('-');
                    let len = Number(tmp[1])-Number(tmp[0])+1;
                    let tmparr = Array.from({length:len}, (v,i)=>i+Number(tmp[0]));
                    retmp = retmp.concat(tmparr);
                }else retmp.push(Number(e));
            })
            resultvalues.push(retmp);
            inoutdata[keys[idx]] = resultvalues[idx];
        });
        let result = resultvalues.reduce((a,b)=>a.concat(b));
        let set = [...new Set(result)];
        if(set.length > dataInfo.length) return '입력된 변수가 데이터의 변수보다 많습니다.';
        if(result.length!==set.length) return '중복된 변수가 존재합니다.';
        else{
            let tmpall = [...allVars];
            keys.map(d=>{
                let tmp = [];
                inoutdata[d].map(e=>{
                    tmp.push(`${dataInfo[e][1]}_${dataInfo[e][2]}_${dataInfo[e][3]}`)
                    tmpall.push(`${dataInfo[e][1]}-${dataInfo[e][2]}-${dataInfo[e][3]}`)
                });
                inoutdata[d] = tmp;
            });
            tmpall = [...new Set(tmpall)];
            setAllVars(tmpall);
            return {'inout':inoutdata,'all':tmpall};
        }
    }

    const handleSaveProject = (isForce)=>{
        if(nodeError.length!==0||edgeError.length!==0) alert("모델 구조에 Error가 존재합니다.");
        else if(inoutData['out'].length===0) alert("Output Variables가 입력되지 않았습니다.");
        else if(saveName.length===0) alert("Model Name을 입력하세요");
        // else if(valiInout(inoutData)!=='success') alert(valiInout(inoutData));
        else if(!isObject(valiInout(inoutData))) alert(valiInout(inoutData));
        // else if (Object.keys(inputSeq).length !== inputRow.length-1) alert("Input Sequence가 입력되지 않은 Column이 있습니다.");
        else{
            setSaveLoad(true);
            const results = valiInout(inoutData);
            const inoutdatas = results['inout'];
            const alldatas = results['all'];
            const passDatas = isImportRef?JSON.stringify({id:cookies.id, prjname:saveName,model:rows,colrow:colrow,link:edges,merge:merge,input:selectedData,allVariables:alldatas,variable:inoutdatas,descript:modelDescript,isref:true,seqshf:SeqShf}):JSON.stringify({id:cookies.id, prjname:saveName,model:rows,colrow:colrow,link:edges,merge:merge,input:selectedData,allVariables:alldatas,variable:inoutdatas,descript:modelDescript,seqshf:SeqShf});
            fetch(`/api/python/models/${isForce}`,{
                method:'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body: passDatas
            })
            .then(res => res.json())
            .then(res=>{
                if(res.hasOwnProperty('error')){
                    if(res.error === "exist") {
                        const confirmAction = Confirm("이미 존재하는 프로젝트입니다. 덮어쓰시겠습니까?", () => {
                            handleSaveProject(1);
                        }, () => {
                            setSaveLoad(false);
                        });
                        confirmAction();
                    }else {alert(res.error); setSaveLoad(false);}
                }   
                else{
                    alert("저장되었습니다.");
                    setSaveLoad(false);
                }
            })
        }
    }

    const hadleImportData = () =>{
        fetch(`/api/user/datalist/${cookies.id}`)
        .then(res => res.json())
        .then(res=>{
            if(res.hasOwnProperty('error')) alert(res.error);
            else{
                setDataList(res.data);
            }
        })
        handleOpen();
    }

    const handleImport = ()=>{
        if(selectedData.length===0) alert("데이터를 선택해주세요.");
        else{
            fetch(`/api/user/datainfo/${selectedData}/${cookies.id}`)
            .then(res => res.json())
            .then(res=>{
                if(res.hasOwnProperty('error')) alert(res.error);
                else{
                    let datas = res.data;
                    if(datas.length===0) alert("Data Error:데이터가 존재하지 않습니다.");
                    else {setDataInfo(datas);
                    handleClose();}
                }
            })
        }
    }

    const handleImportModel = ()=>{
        fetch('/api/share/refmodels')
        .then(res => res.json())
        .then(res=>{
            if(res.hasOwnProperty('error')) alert(res.error);
            else{
                setModelsList(res.data);
            }
        })
        handleMOpen();
    }

    const handleMImport = ()=>{
        if(selectedModels.length===0) alert("모델을 선택해주세요.");
        else{
            const confirms = Confirm("모델을 불러오면 기존의 모델은 삭제됩니다. 불러오시겠습니까?",()=>{
                setSaveLoad(true);
                fetch(`/api/share/refmodelinfo/${selectedModels}`)
                .then(res => res.json())
                .then(res=>{
                    if(res.hasOwnProperty('error')) {alert(res.error); setSaveLoad(false);}
                    else{
                        setRows(res.model);
                        setEdges(res.link);
                        setColrow(res.colrow);
                        setMerge(res.merge);
                        setIsImportRef(true);
                        setSaveLoad(false);
                        // setViewRows([{id:0, set:'System'},{id:1, set:'Category'},{id:2, set:'Site'},{id:3,set:'Variable'}]);
                        // setViewColumns([{field:'set',headerName:' ',headerClassName:'datagrid-header', sortable:false,width:70},]);
                    }
                })
                handleMClose();
            },()=>{
                //false func
            }
            );
            confirms();
        }
    }



    return(
        
        <div className="models-page" style={{height:'95vh', width:'100%'}}>
            <CssBaseline/>
            
            <Grid container component="main" sx={{width:'100%', height:'95vh'}}>
                {/* select layer start */}
                <Grid
                    item
                    className="models-left"
                    sm={5.25}
                    md={5.25}
                    sx={{height:'95vh',display:'flex',flexDirection:'column'}}
                >
                    <div className="select-layer-container" style={{height:'50%',display:'flex', flexDirection:'column'}}>
                        <div className="select-layer-header" style={{display:'flex',padding:'0.8rem', height:'5%'}}>
                            <b style={{width:'43%'}}>Layer</b>
                            <b>Layer attributes</b>
                        </div>
                        <div className="select-layer" style={{display:'flex',height:'85%'}}>
                            <List
                                sx={{
                                    width:'40%',
                                    position:'relative',
                                    overflow:'auto',
                                    '& ul': { padding: 0 },
                                    marginY:'1rem',
                                    marginLeft:'1rem'
                                }}
                                component={Paper}
                                subheader={<li/>}
                            >
                                {layerlist.map((l,idx)=>{
                                    const layerfunclist = Object.keys(layers[l]);
                                    return (<li key={`${l}`}>
                                        <ul>
                                            <ListSubheader sx={{height:'4.5vh'}}>{`${l}`}</ListSubheader>
                                            {
                                                layerfunclist.map((item,i)=>(
                                                    <ListItemButton key={`${l}_${item}`} selected={selectedIdx===`${idx}-${item}`} onClick={(e)=>{setSelectedIdx(`${idx}-${item}`);handleLayerClick(l,item);}} sx={{height:'2vh'}}>
                                                        <ListItemText primary={item}/>
                                                    </ListItemButton>))
                                            }
                                        </ul>
                                    </li>)
                            })}
                            </List>
                            <div style={{flex:1}}>
                                <List
                                    sx={{
                                        position:'relative',
                                        overflow:'auto',
                                        '& ul': { padding: 0 },
                                        marginX:'1rem',
                                        marginTop:'1rem',
                                        marginBottom:'0.3rem',
                                        flex:1,
                                        height:'53%',
                                        width:'93%',
                                    }}
                                    component={Paper}
                                >
                                    {
                                    selectedIdx?attlist.attlists.map(att=>{
                                        return (
                                        <ListItem>
                                            <Tooltip title={attlist.att.descript[att]} followCursor><ListItemText primary={att}/></Tooltip>
                                            {
                                                Array.isArray(attlist.att[att])?
                                                <FormControl key={Object.keys(attlist.att.descript)[0]} variant="standard" size="small" sx={{width:'5rem', }}>
                                                    <Select
                                                        key={`${Object.keys(attlist.att.descript)[0]}_${att}`}
                                                        defaultValue={LayerObj[att]}
                                                        sx={{fontSize:'0.8rem'}}
                                                        onChange={(e)=>handleLayerObj(e,att,'select')}
                                                    >
                                                        {
                                                            attlist.att[att].map(v=>(
                                                                <MenuItem value={v}>{v}</MenuItem>
                                                            ))
                                                        }
                                                    </Select>
                                                </FormControl>
                                                :<OutlinedInput key={`${Object.keys(attlist.att.descript)[0]}_${att}`} type="number" onChange={(e)=>handleLayerObj(e,att,'input')} defaultValue={LayerObj[att]} size="small" sx={{width:'5rem',height:'2rem', fontSize:'0.8rem'}}/>
                                            }
                                        </ListItem>)
                                    }):<div></div>
                                    }
                                </List>
                                <b style={{marginLeft:'3%', }}>Artificial attributes</b>
                                <List
                                    sx={{
                                        position:'relative',
                                        overflow:'auto',
                                        '& ul': { padding: 0 },
                                        marginX:'1rem',
                                        marginTop:'0.3rem',
                                        marginBottom:'1rem',
                                        flex:1,
                                        height:'30%',
                                        width:'93%',
                                    }}
                                    component={Paper}
                                >
                                    <ListItem></ListItem>
                                </List>
                            </div>
                        </div>
                        <div className="layer-add" style={{display:'flex',justifyContent:'right', paddingRight:'1rem', alignItems:'center'}}>
                            <Button variant="contained" size="small" color="success" onClick={handleImportModel} style={{height:'3vh',marginLeft:'0.5rem'}}>Import Model</Button>
                            <Button variant="contained" disabled={saveLoad} onClick={handleAddClick} size="small" style={{height:'3vh',marginLeft:'0.5rem'}}>Add</Button>
                            {/* <Button variant="contained" size="small" style={{height:'3vh',marginLeft:'2rem'}}>Save as</Button>*/}
                        </div>
                    </div>
                    <div className="layer-info-container" style={{flex:1, padding:'1rem', display:'flex',flexDirection:'column'}}>
                        <Divider variant="middle" sx={{marginBottom:'1rem',bgcolor: "lightgray"}} />
                        <div className="layer-info-header" style={{display:'flex', justifyContent:'space-between',marginBottom:'0.4rem'}}><b>Units</b>{rows.length!==0?<Button onClick={handleLayerReset} disabled={saveLoad} variant="contained" size="small" style={{height:'3vh'}}>Reset</Button>:<Button disabled variant="contained" size="small" style={{height:'3vh'}}>Reset</Button>}</div>
                        <DataGrid
                            density="compact"
                            hideFooter
                            disableColumnMenu 
                            disableSelectionOnClick
                            rows={rows}
                            columns={columns}
                        />

                    </div>
                </Grid>
                {/* select layer end */}
                {/* model view start */}
                <Grid
                    item
                    className="models-right"
                    sm={5.25}
                    md={5.25}
                    sx={{height:'95vh',display:'flex',flexDirection:'column',padding:'1rem'}}
                >
                    <div className="var-select-container" style={{height:'26rem'}}>
                        <div className="var-select-header" style={{display:'flex',flexDirection:'row-reverse',marginBottom:'0.2rem'}}><Button disabled={saveLoad} variant="contained" size="small" onClick={hadleImportData}>Import Data</Button></div>
                        <Modal
                            open={modalShow}
                            onClose={handleClose}
                            aria-labelledby="modal-modal-title"
                            aria-describedby="modal-modal-description"
                        >
                            <Paper sx={modalstyle}>
                                <b>Data List</b>
                                {dataList.length!==0?
                                <div style={{display:'flex',flexDirection:'column',}}>
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
                                        {dataList.map((item,index)=>(
                                            <ListItemButton key={`${index}-${item}`} selected={selectedData===item} onClick={()=>handleDataSelect(index)}>
                                                <ListItemText primary={item}/>
                                            </ListItemButton>))
                                        }
                                    </List>
                                    <div style={{display:'flex', justifyContent:'center',marginTop:'0.5rem'}}>
                                        <Button variant="contained" size="small" sx={{width:'40%',marginX:'0.2rem'}} onClick={handleImport}>Import</Button>
                                        <Button variant="contained" size="small" sx={{width:'40%',marginX:'0.2rem'}} onClick={handleClose}>Cancle</Button>
                                    </div>
                                </div>
                                
                                :<div style={{height:'85%'}}><Paper style={{display:'flex',flexDirection:'column',justifyContent:'space-between', margin:'1rem', height:'100%'}}>no data</Paper><Button variant="contained" size="small" sx={{width:'40%',marginLeft:'60%'}} onClick={handleClose}>Cancle</Button></div>}
                            </Paper>
                        </Modal>
                        <Modal
                            open={ModelModalShow}
                            onClose={handleMClose}
                            aria-labelledby="modal-modal-title"
                            aria-describedby="modal-modal-description"
                        >
                            <Paper sx={modalstyle}>
                                <b>Reference Model List</b>
                                {ModelsList.length!==0?
                                <div style={{display:'flex',flexDirection:'column',}}>
                                    <List
                                        sx={{
                                            marginTop:'1rem',
                                            position:'relative',
                                            overflow:'auto',
                                            '& ul': { padding: 0 },
                                            height:460
                                        }}
                                        component={Paper}
                                    >
                                        {ModelsList.map((item,index)=>(
                                            <ListItemButton key={`${index}-${item}-models`} selected={selectedModels===item} onClick={()=>handleModelsSelect(index)}>
                                                <ListItemText primary={item}/>
                                            </ListItemButton>))
                                        }
                                    </List>
                                    <div style={{display:'flex', justifyContent:'center',marginTop:'0.5rem'}}>
                                        <FormControl>
                                            <RadioGroup
                                                row
                                                aria-label="ModelSet"
                                                name="ModelSet"
                                                value={refSetting}
                                                onChange={(e)=>{setRefSetting(e.target.value)}}
                                            >
                                                <FormControlLabel size="small" value="default" control={<Radio />} label="Default" />
                                                <FormControlLabel size="small" disabled value="custom" control={<Radio />} label="Custom" />
                                            </RadioGroup>
                                        </FormControl>
                                        <Button variant="contained" size="small" sx={{width:'20%',marginX:'0.2rem'}} onClick={handleMImport}>Import</Button>
                                        <Button variant="contained" size="small" sx={{width:'20%',marginX:'0.2rem'}} onClick={(e)=>{handleMClose(); setSelectedModels("");}}>Cancle</Button>
                                    </div>
                                </div>
                                
                                :<div style={{height:'85%'}}><Paper style={{display:'flex',flexDirection:'column',justifyContent:'space-between', margin:'1rem', height:'100%'}}>no data</Paper><Button variant="contained" size="small" sx={{width:'40%',marginLeft:'60%'}} onClick={handleClose}>Cancle</Button></div>}
                            </Paper>
                        </Modal>
                        <DataGrid
                            density="compact"
                            hideFooter
                            disableColumnMenu 
                            disableSelectionOnClick
                            rows={viewRows}
                            columns={viewColumns}
                            style={{height:'11rem'}}
                            />
                        <DataGrid 
                            density="compact"
                            hideFooter
                            disableColumnMenu 
                            disableSelectionOnClick
                            rows={inputRow}
                            columns={inputCol}
                            sx={{height:'11.2rem',marginTop:'0.5rem'}}
                        />
                    </div>
                    <div className="layer-view-container" style={{flex:1,display:'flex',flexDirection:'column'}}>
                        <Divider variant="middle" sx={{marginBottom:'1rem',bgcolor: "lightgray"}} />
                        <Paper style={{flex:1}}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                // onConnect={onConnect}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onEdgeUpdate={onEdgeUpdate}
                                >
                                {/* <DownloadButton/> */}
                                <MiniMap />
                                {/* <Controls /> */}
                                <Controls>
                                    <DownloadButton/>
                                </Controls>
                                <Background />
                            </ReactFlow>
                        </Paper>
                    </div>
                </Grid>
                {/* model view end */}
                
                <Grid item sm={1.5} md={1.5} sx={{height:'95vh', padding:'1rem'}}>
                    <Paper className="engine-right">
                        <TextField
                        required
                        id="model-name"
                        label="Model Name"
                        size="small"
                        onChange={e=>setSaveName(e.target.value)}
                        style={{marginTop:'1rem'}}
                        />
                        {Object.keys(SeqShf).map(item=>(
                            <ListItem>
                                <ListItemText primary={item} sx={{width:'100%'}}/>
                                <OutlinedInput key={`${item}-model`} id={`${item}-model`} type="number" size="small" defaultValue={SeqShf[item]} onChange={e=>{
                                    let temp = SeqShf;
                                    temp[item] = e.target.valueAsNumber;
                                    setSeqShf(temp);
                                }} style={{}}/>
                            </ListItem>
                        ))}
                        <TextField
                        id="model-description"
                        label="Model Description"
                        size="small"
                        onChange={e=>setModelDescript(e.target.value)}
                        style={{marginTop:'0.8rem', fontSize:'0.8rem'}}
                        rows={6}
                        multiline
                        />
                        {inputList.length>=1?<Button variant="contained" disabled={saveLoad} style={{marginTop:'1rem'}} onClick={e=>handleSaveProject(0)}> Save </Button>:<Button variant="contained" disabled style={{marginTop:'1rem'}}> Save </Button>}
                    </Paper>
                </Grid>
            </Grid>
            {saveLoad&&
                <div style={{width:'100vw',height:'100vh',position:'absolute',top:0,left:0, backgroundColor:"rgba(255,255,255,0.5)"}}>
                    <CircularProgress size={60} sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        // marginTop: '-12px',
                        // marginLeft: '-12px',
                        }}
                    />
                </div>
            }
        </div>

    )
}