import { useEffect, useState, useContext } from "react";
import { StateContext } from "../../context/Manage";
import { IconButton,FormControl,MenuItem,Select, Skeleton, InputLabel, Button, Grid, Card, CssBaseline, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,  Modal } from "@mui/material";
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';


// Tree Test
import CheckboxTree from "react-checkbox-tree";
import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import '../../subcss/font-awesome-4.7.0/css/font-awesome.min.css';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Title,
    Legend
} from "chart.js";
import { Line } from 'react-chartjs-2';

import ReactFileReader from "react-file-reader";

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

import L from "leaflet";
import { MapContainer, Marker, Popup } from "react-leaflet";
import "leaflet.offline";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

import useFetch from "../../hooks/useFetch";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
});

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Title, Legend);

export default function Database() {
    const { region, changeVal } = useContext(StateContext);

    const [dbData, setdbData] = useState([]);
    const [defaultData, setdefaultData] = useState([]);
    const [dbSelectData, setdbSelectData] = useState([]);
    const [defaultSelectData, setdefaultSelectData] = useState([]);


    // Map Mark
    const [mark, setMark] = useState([]);
    const [markRegion, setMarkRegion] = useState("");


    const [selected, setSelected] = useState([]);
    const [ShowSelected, setShowSelected] = useState([]);
    const [expanded, setExpanded] = useState([]);
    const [SelectExpanded, setSelectExpanded] = useState([]);

    // Show Chart Date
    const [ChartEnd, setChartEnd] = useState(dayjs());
    const [ChartStart, setChartStart] = useState(ChartEnd.subtract(3, "M"));
    const [Chartlabel, setChartlabel] = useState([""]);

    // Show Data 
    const [ShowKind, setShowKind] = useState("");
    const [ShowRegion, setShowRegion] = useState("");
    const [ShowChartRegion, setShowChartRegion] = useState("");
    const [ShowVal, setShowVal] = useState("");
    const [ShowValNM, setShowValNM] = useState("");
    const [ShowData, setShowData] = useState([0]);
    // table Data
    const [TableData, setTableData] = useState([]);

    // Loading control
    const [isvalLoading, setIsvalLoading] = useState(false);
    const [isdefaultLoading, setIsdefaultLoading] = useState(true);

    // search Data
    const [searchData, setSearchData] = useState('');
    const [searchSelect, setSearchSelect] = useState('지역명');
    const [map, setMap] = useState();

    const [fileName, setFileName] = useState('');
    const [dataopen, setDataopen] = useState(false);
    const handleOpen = () => setDataopen(true);
    const handleClose = () => {
        setFileName('');
        setAdds('');
        setAddc('');
        setAddcc('');
        setAddsi('');
        setAddData('');
        setDataopen(false);
    };

    const [reload,setReload] = useState(true);

    const [adds,setAdds] = useState('');
    const [addc,setAddc] = useState('');
    const [addcc,setAddcc] = useState('');
    const [addsi,setAddsi] = useState('');

    const [addData, setAddData] = useState('');


    const uploadFile = (files) =>{
        var read = new FileReader();
        var name = files[0].name;
        read.onload = function(e){
            FileSet(read.result,name)
        }
        read.readAsText(files[0],'euc-kr');
    }

    const FileSet = (file,name) =>{
        var splitData = file.split('\r\n');
        var headers = splitData[0].split(',');
        if(!['조사일자','일자','date'].includes(headers[0])){
            alert('일자(date, 일자, 조사일자) 열이 없습니다. 데이터 파일의 첫 번째 행은 헤더 정보로 지정해주세요.(e.g. date, 조류, 수온)\n')
            setFileName('');
            setAddData('');
        }else{
            setFileName(name);
            setAddData(splitData);
        }
    }

    const handleAddData = (e) =>{
        e.preventDefault();
        if(!window.confirm(`${adds}, ${addc}, ${addsi} 데이터베이스에 등록합니다. 등록하시겠습니까?`)){
            return;
        }else{
            fetch(`/api/updb`,{
                method:'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'system': adds,
                    'category':addc,
                    'category_s':addcc,
                    'name':addsi,
                    'data':addData
                })
            })
            .then(res => res.json())
            .then(res=>{
                if(res.hasOwnProperty('error')){
                    if(res.error === 'exist') alert('이미 존재하는 등록명입니다. 등록명 변경 후 등록해주세요.');
                    else{
                        alert('error : ', res.error);
                    }
                }else{
                    alert('등록완료');
                    setReload(!reload);
                    handleClose();
                }
            })
        }
    }

    // 데이터 종류 - 데이터 종류 세부 초기화
    useEffect(()=>{
        setAddcc('');
    },[addc])

    const getModifiedLabel = (node) => {
        const hasIconButton = /<IconButton[^>]*>.*<\/IconButton>/.test(node.label);
        if (hasIconButton) {
            return (
                <>
                    {node.label}
                </>
            );
        } else {
            return (
                <>
                    {node.label}
                    <IconButton size="small" onClick={e => handleRemoveBtn(node.value)}>
                        <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                </>
            );
        }
    };

    useEffect(()=>{
        let tmpdb = JSON.parse(JSON.stringify(defaultSelectData));
        function filterDataByKeys(list, targetKeys) {
            for (let i = list.length - 1; i >= 0; i--) {
                const data = list[i];
                if (targetKeys.includes(data.value)) {
                    list[i] = {
                        ...data,
                        label: getModifiedLabel(data)
                    };
                    
                    if (data.children && data.children.length > 0) {
                        list[i].children = filterDataByKeys(data.children, targetKeys);
                    }
                } else {
                    list.splice(i, 1);
                }
            }    
            return list;
        }
        const select_tree = filterDataByKeys(tmpdb, ShowSelected)
        setdbSelectData(select_tree);
    },[ShowSelected])

    useEffect(() => {
        setIsdefaultLoading(true);
        fetch('/api/tree/com_code')
            .then(res => {
                return res.json();
            })
            .then(data => {
                const origin = data.origin;
                const selecteddb = data.select;
                setdbData(origin);
                setdefaultData(origin);
                setdbSelectData(selecteddb);
                setdefaultSelectData(selecteddb);
                setIsdefaultLoading(false);
            })
    }, [])

    useEffect(() => {
        if (map) {
            const tileLayerOffline = L.tileLayer.offline(
                "/api/tile/{z}/{x}/{y}.png",
                // "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                }
            );

            tileLayerOffline.addTo(map);
            L.Marker.prototype.options.icon = DefaultIcon;

        }
    }, [map]);

    useEffect(() => {
        if (markRegion !== "" && markRegion !== "!") {
            const url = encodeURI(`/api/region/${markRegion}`);
            fetch(url)
                .then(res => {
                    return res.json();
                })
                .then(data => {
                    if (data.lat !== undefined && data.lon !== undefined) setMark([data.lon, data.lat]);
                    else setMarkRegion("!");
                })
        }
    }, [markRegion])


    useEffect(() => {
        const std = dayjs(ChartStart).startOf("D").format('YYYYMMDD');
        const end = dayjs(ChartEnd).startOf("D").format('YYYYMMDD');

        if (std > end) alert("조회 시작 일자가 종료 일자 이후로 선택되었습니다.");
        else if (std === end) alert("동일 일자가 선택되었습니다");
        else {
            if (!isdefaultLoading) setIsvalLoading(true);
            const url = encodeURI(`/api/chartdata/${ShowVal}/${ShowKind}/${ShowRegion}/${std}/${end}`);
            fetch(url)
                .then(res => {
                    return res.json();
                })
                .then(data => {
                    // TODO : error 처리 필요
                    setTableData([data.nall, data.nok, data.nnan, data.nzero]);
                    const result = data.data;
                    setChartlabel(data.days);
                    setShowData(result);
                    setIsvalLoading(false);
                })
        }
    }, [ChartStart, ChartEnd, ShowVal, ShowKind, ShowRegion])

    const chartOptions = {
        // responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            title: {
                display: true,
                text: ShowChartRegion,
                font: {
                    size: 24,
                    family: "BasicEB",
                },
                color: "rbg(0,0,0)",
                align: "start",
            },
            legend: { display: true, position: 'top' },
        },
        scales: { x: { grid: { display: false, } } },

    };

    // const filterTree = (node, checkedNodes, ancestors = []) => {
    //     if (node.children) {
    //         const filteredChildren = node.children
    //             .map(child => filterTree(child, checkedNodes, [...ancestors, node]))
    //             .filter(child => !!child);

    //         // Check if any descendant is checked or if the node itself is checked
    //         if (filteredChildren.length > 0 || checkedNodes.includes(node.value) || ancestors.some(ancestor => checkedNodes.includes(ancestor.value))) {
    //             return { ...node, label: getModifiedLabel(node), children: filteredChildren };
    //         }
    //     } else {
    //         if (checkedNodes.includes(node.value) || ancestors.some(ancestor => checkedNodes.includes(ancestor.value))) {
    //             return { ...node, label: getModifiedLabel(node) };
    //         }
    //     }
    // };

    const handleShowselected = (selected) => {
        function getParentKeysWithValue(list, targetValues, parents = []) {
            const result = [];
          
            for (const item of list) {
              if (targetValues.includes(item.value)) {
                result.push([...parents, item.value]);
              }
          
              if (item.children && item.children.length > 0) {
                const subResults = getParentKeysWithValue(item.children, targetValues, [...parents, item.value]);
                result.push(...subResults);
              }
            }
          
            return result;
        }
        const ParentList = getParentKeysWithValue(dbData, selected)
        const mergedArray = ParentList.flat();
        const uniqueList = [...new Set(mergedArray)];
        return uniqueList;
    }

    const handleShowselectedForProc = (selected) => {
        function getParentKeysWithValue(list, targetValues, parents = []) {
            const result = [];
          
            for (const item of list) {
              if (targetValues.includes(item.value)) {
                result.push([...parents, item.label,item.value]);
              }
          
              if (item.children && item.children.length > 0) {
                const subResults = getParentKeysWithValue(item.children, targetValues, [...parents, item.label, item.value]);
                result.push(...subResults);
              }
            }
          
            return result;
        }
        const ParentList = getParentKeysWithValue(dbData, selected)
        return ParentList;
    }

    

    const handleRemoveBtn = (value) => {
        let tmplist = ShowSelected.filter(data => data !== value);
        setShowSelected(tmplist);
    }

    const handleCheck = (checked) => {
        setSelected(checked);
    };

    // Select btn click handle
    const handleSelectBtn = () => {
        const tmpselect = [...new Set(ShowSelected.concat(handleShowselected(selected)))]
        const tmpprocselect = handleShowselectedForProc(selected)
        setShowSelected(tmpselect);
        changeVal(tmpprocselect)
        // changeVal(tmpselect, 0);
        // changeVal(select,0);
        // changeVal(tmpselect,0);
        setSelected([]);
    }

    // Reset btn handle
    const handleResetBtn = () => {
        setShowSelected([]);
        setExpanded([]);
        setSelectExpanded([]);
        setdbSelectData(defaultSelectData);
        setdbData(defaultData);
        // changeVal([], 1);
    }

    // Search btn handle
    const handleSearchBtn = () => {
        if (searchData === "") {
            alert("검색어를 입력해주세요.");
        } else {
            setIsdefaultLoading(true);
            fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    select: searchSelect,
                    search: searchData,
                    db: defaultData,
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.hasOwnProperty('error')) {
                        alert(data.error);
                        setIsdefaultLoading(false);
                    }
                    else {
                        setdbData(data);
                    }
                })
        }
    }

    const handleLabelClick = (e) => {
        const id = e.value;
        const validIdFormat_1 = /^[a-zA-Z가-힣]{1,3}_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;
        const validIdFormat_2 = /^[a-zA-Z가-힣]{1,3}_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;
        const validIdFormat_3 = /^[a-zA-Z가-힣]{1,3}_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;
        const validIdFormat_4 = /^[a-zA-Z가-힣]{1,3}_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;
        if (!validIdFormat_1.test(id) && !validIdFormat_2.test(id) && !validIdFormat_3.test(id) && !validIdFormat_4.test(id)) {
            return; // Exit the function early
        }
        const label = e.label;
        setIsvalLoading(true);
        setShowKind(id.split('_')[0])
        setShowRegion(id.split('_')[1])
        if (typeof label === 'string') {
            setShowValNM(label)
        } else {
            setShowValNM(label.props.children[0])
        }
        if (id.split('_').length >= 4) {
            setShowVal(id.split('_').slice(2).join('_'))
        } else {
            setShowVal(id.split('_')[2])
        }
        if (typeof label === 'string') {
            setShowChartRegion(e.parent.label)
        } else {
            setShowChartRegion(e.parent.label.props.children[0])
        }
        
        
    }

    return (
        <div className="database-page" style={{ height: '100%' }}>
            <CssBaseline />
            <Grid container component="main" sx={{ width: '100%', height: '88vh' }}>
                {/* Select Database Variable Start */}
                <Grid
                    item
                    className="select-var"
                    sm={4.5}
                    md={4.5}
                    sx={{ height: '100%' }}
                >
                    <div className="select-var-header" style={{display:'flex',alignItems:'center',justifyContent:'center',paddingRight:'3.5%',paddingLeft:'2%',paddingTop:'2%'}}>
                        <Button
                            className="select-reset-btn"
                            sx={{ mx:'0.2rem',width:'33%'}}
                            variant="contained"
                            size="small"
                            onClick={handleOpen}
                        >
                            Data Import
                        </Button>
                        <Button
                            className="select-mv-btn"
                            sx={{ mx:'0.2rem',width:'33%'}}
                            variant="outlined"
                            size="small"
                            onClick={handleSelectBtn}
                            aria-label="move selected"
                            >
                            &gt;
                        </Button>
                        <Button
                            className="select-reset-btn"
                            sx={{ mx:'0.2rem', width:'33%' }}
                            variant="contained"
                            size="small"
                            onClick={handleResetBtn}
                        >
                            초기화
                        </Button>
                    </div>
                    <div className="select-var-under">
                        {/* <TextField sx={{height:'3vh', width:'96%', marginLeft:'2%'}} label="Search"></TextField> */}
                        <Paper sx={{ width: '94%', marginTop: '2%', display: 'flex', alignItems: 'center', marginX: '2%', paddingX: '1rem', paddingY: '0.5rem', justifyContent: 'center' }}>
                            {/* <Tooltip followCursor title="수계명-낙동강,한강 등. 데이터종류-기상,조류,수질 등."> */}
                            <FormControl key={`select-search`} variant="standard" sx={{ width: '6rem', marginX: '0.2rem' }}>
                                {/* <FormControl key={`select-search`} variant="standard" sx={{flex:1, marginX:'0.2rem'}}> */}
                                <Select
                                    key={`select-search-selection`}
                                    defaultValue={searchSelect}
                                    sx={{ fontSize: '0.7rem' }}
                                    onChange={(e) => setSearchSelect(e.target.value)}
                                >
                                    {
                                        ['지역명', '변수명'].map(v => (
                                            <MenuItem value={v}>{v}</MenuItem>
                                        ))
                                    }
                                </Select>
                            </FormControl>
                            {/* </Tooltip> */}
                            {/* <TextField sx={{marginX:'0.2rem'}} size="small" label="Search" onChange={e=>setSearchData(e.target.value)}></TextField> */}
                            <TextField sx={{ marginX: '0.2rem', flex: 1 }} size="small" label="Search" onChange={e => setSearchData(e.target.value)}></TextField>
                            <Button sx={{ marginX: '0.2rem' }} variant="contained" onClick={handleSearchBtn}>검색</Button>
                            <Button sx={{ marginX: '0.2rem' }} variant="outlined" onClick={() => { setdbData(defaultData) }}>초기화</Button>
                        </Paper>
                        <div style={{ display: 'flex' }}>
                            <Card className="select-var-card">
                                {dbData.length !== 0 ? <CheckboxTree
                                    nodes={dbData}
                                    checked={selected}
                                    expanded={expanded}
                                    onCheck={handleCheck}
                                    onExpand={expanded => setExpanded(expanded)}
                                    showNodeIcon={false}
                                    onClick={e => { handleLabelClick(e) }}
                                /> : <p>준비중</p>}
                            </Card>
                            <Card className="select-var-card selected">
                                {ShowSelected.length !== 0 ? <CheckboxTree
                                    nodes={dbSelectData}
                                    expanded={SelectExpanded}
                                    onExpand={expanded => setSelectExpanded(expanded)}
                                    showNodeIcon={false}
                                    onClick={e => { handleLabelClick(e) }}
                                /> : null}
                            </Card>
                        </div>
                    </div>
                </Grid>
                {/* Select Database Variable End */}
                {/* Draw Map and Data Start */}
                <Grid
                    item
                    className="draw-map"
                    sm={7.5}
                    md={7.5}
                    sx={{ paddingRight: '1rem' }}
                >
                    <div className="drawmap" style={{ marginTop: '1rem' }}>
                        {/* <div id="map" style={{ height: "100%" }}></div> */}
                        <MapContainer
                            style={{ height: "100%" }}
                            center={[35.56667, 127.97806]}
                            zoom={7}
                            maxZoom={10}
                            minZoom={6}
                            whenCreated={setMap}
                        >
                            {mark[0] !== undefined ?
                                <Marker position={mark}>
                                    <Popup>
                                        {markRegion !== "!" ?
                                            <span>{markRegion.split('__').at(3)}</span>
                                            : <span>{"위치 데이터 없음"}</span>
                                        }
                                    </Popup>
                                </Marker>
                                : null}
                        </MapContainer>
                    </div>
                    <div className="drawchart">
                        <div className="chart-header" style={{ marginTop: '0.5rem' }}>
                            <div className="datepick">
                                {/* <div className="datepick-header"><h5 style={{fontWeight:'600'}}>기간</h5><div><Button size="small" variant="contained" onClick={ResetdrawData}>초기화</Button></div></div> */}
                                <div className="datepick-header"><h5 style={{ fontWeight: '600' }}>기간</h5></div>
                                <div className="datepick-picker">
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="시작일"
                                            value={ChartStart}
                                            onChange={(newValue) => {
                                                setChartStart(newValue);
                                            }}
                                            renderInput={(params) => <TextField {...params} />}
                                        />
                                    </LocalizationProvider>
                                    <h4 style={{ "margin": "0.5rem", "color": "rgba(0,0,0,0.6)" }}> ~ </h4>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="종료일"
                                            value={ChartEnd}
                                            onChange={(newValue) => {
                                                setChartEnd(newValue);
                                            }}
                                            renderInput={(params) => <TextField {...params} />}
                                        />
                                    </LocalizationProvider>
                                </div>
                            </div>
                            <div className="datainfo">
                                <TableContainer sx={{ "m": "1rem", "width": "20rem" }} component={Paper}>
                                    <Table size="small">
                                        <TableHead><TableRow><TableCell align="center">전체</TableCell><TableCell align="center">관측</TableCell ><TableCell align="center">결측</TableCell><TableCell align="center">0값</TableCell></TableRow></TableHead>
                                        <TableBody><TableRow>{TableData.length === 0 ? <TableCell /> : TableData.map(data => (<TableCell align="center">{data}</TableCell>))}</TableRow></TableBody>
                                    </Table>
                                </TableContainer>
                            </div>
                        </div>
                        <div className="chart">
                            {/* {isvalLoading?<Skeleton variant="rectangular" animation="wave" width="100%" height="100%" />: ShowData.length!==0? */}
                            {isvalLoading ? <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" /> : ShowData !== null ?
                                <Line options={chartOptions} data={{
                                    labels: Chartlabel,
                                    datasets: [
                                        {
                                            type: 'line',
                                            label: ShowValNM,
                                            data: ShowData,
                                            borderColor: 'rgb(0, 0, 0)',
                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                            borderWidth: 1,
                                            pointRadius: 1,
                                        }
                                    ]
                                }} /> : <div>데이터없음</div>}
                        </div>
                    </div>
                </Grid>

                {/* Draw Map and Data End */}
            </Grid>
            {/* Data Import Modal Start */}
            <Modal
                open={dataopen}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Paper className="user-add-modal" style={{display:'flex',flexDirection:'column',width:'40vw',height:'35vh',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',padding:'1rem'}}>
                    <h4><b>Data Import</b></h4>
                    <div className="data-import-page" style={{width:'100%',height:'26vh',display:'flex',flexDirection:'column',alignItems:'center', padding:'0.5rem'}}>
                        <div className="data-import-notice" style={{display:'flex',flexDirection:'column',width:'100%',height:'6rem',backgroundColor:'#FDFAEB',padding:'0.5rem'}}>
                            <b style={{fontFamily:'Basic',marginBottom:'0.3rem'}}> ⁕ .csv 파일을 선택한 다음 수계 및 데이터 종류를 선택하고 등록명(지역명)을 입력하면 해당 데이터가 데이터베이스에 추가됩니다.</b>
                            <b style={{fontFamily:'Basic', color:'#FA584E'}}> ⁕ 이미 데이터베이스에 추가된 등록명으로는 등록할 수 없습니다.</b>
                            <b style={{fontFamily:'Basic', color:'#FA584E'}}> ⁕ 데이터의 첫 번째 행은 'date', '변수명1', '변수명2'와 같은 형식이 되어야 합니다.</b>
                        </div>
                        <div className="data-import-path" style={{width:'100%', display:'flex',alignItems:'center',justifyContent:'space-around'}}>
                            <Paper sx={{width:'30vw',height:'2.2rem', marginTop:'0.5rem',paddingLeft:'1rem',paddingY:'0.3rem'}}>{fileName}</Paper>
                            <ReactFileReader handleFiles = {uploadFile} fileTypes={'.csv'}>
                                <Button
                                    sx={{width:'7.5vw',marginTop:'0.5rem',height:'2.2rem'}}
                                    variant="contained"
                                    size="small"
                                >
                                    데이터 파일 불러오기
                                </Button>
                            </ReactFileReader>
                        </div>
                        <Paper className="data-import-set" sx={{width:'100%',height:'12vh',marginTop:'1rem', padding:'1rem',display:'flex', flexDirection:'column'}}  elevation={3}>
                            <h6><b>Import Data Options</b></h6>
                            <div className="data-import-set-under" style={{width:'100%',height:'100%',display:'flex', padding:'1rem'}}>
                                <FormControl sx={{minWidth:150}}>
                                    <InputLabel id="data-import-system-label">수계</InputLabel>
                                    <Select
                                        labelId="data-import-system"
                                        id="data-import-system-id"
                                        value={adds}
                                        label="수계"
                                        onChange={(e)=>setAdds(e.target.value)}
                                    >
                                        <MenuItem value={"금강"}>금강</MenuItem>
                                        <MenuItem value={"낙동강"}>낙동강</MenuItem>
                                        <MenuItem value={"영산강"}>영산강</MenuItem>
                                        <MenuItem value={"한강"}>한강</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl sx={{minWidth:150,marginX:'1rem'}}>
                                    <InputLabel id="data-import-category-label">데이터 종류</InputLabel>
                                    <Select
                                        labelId="data-import-category"
                                        id="data-import-category-id"
                                        value={addc}
                                        label="데이터 종류"
                                        onChange={(e)=>setAddc(e.target.value)}
                                    >
                                        <MenuItem value={"기상"}>기상</MenuItem>
                                        <MenuItem value={"댐"}>댐</MenuItem>
                                        <MenuItem value={"보"}>보</MenuItem>
                                        <MenuItem value={"수문"}>수문</MenuItem>
                                        <MenuItem value={"수질"}>수질</MenuItem>
                                        <MenuItem value={"조류"}>조류</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl sx={{minWidth:150, marginRight:'1rem'}} disabled={['기상','조류'].includes(addc)}>
                                    <InputLabel id="data-import-category-label">데이터 간격</InputLabel>
                                    <Select
                                        labelId="data-import-category-2"
                                        id="data-import-category-2-id"
                                        value={addcc}
                                        label="데이터 간격"
                                        onChange={(e)=>setAddcc(e.target.value)}
                                    >
                                        <MenuItem value={"일간"}>일간</MenuItem>
                                        {addc === '수질'?<MenuItem value={"주간"}>주간</MenuItem>:null}
                                    </Select>
                                </FormControl>
                                <TextField 
                                    sx={{width:'100%'}}
                                    label="등록명(지역명)"
                                    onChange={e=>setAddsi(e.target.value)}
                                />
                            </div>
                        </Paper>
                    </div>
                    <div className="data-import-foot" style={{height:'4vh', display:'flex',flexDirection:'row-reverse'}}>
                        <Button variant="outlined" size="small" sx={{margin:'0.5rem'}} onClick={handleClose}>취소</Button>
                        <Button variant="contained" size="small" sx={{margin:'0.5rem'}} disabled={fileName===''||adds===''||addsi===''||(['댐','보','수질'].includes(addc)&&addcc==='')||addc===''} onClick={handleAddData}>등록</Button>
                    </div>
                </Paper>
            </Modal>
            {/* Data Import Modal End */}
        </div>

    )
}