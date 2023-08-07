import { useContext, useState, useCallback, useEffect } from "react";
import { StateContext } from "../../context/Manage";
import { useCookies } from 'react-cookie';
import { Skeleton, Tooltip, ListItem, FormControl, MenuItem, Select, ListSubheader, ListItemButton, ListItemText, TextField, Button, Grid, CssBaseline, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, List, OutlinedInput } from "@mui/material";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
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
import * as descript from './descriptfunc';
// var funcs = Object.keys(descript);
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Legend);


export default function Preprocessing() {
    const { region, ProcChart, makeChartfromProc } = useContext(StateContext);
    const [cookies, setCookie, removeCookie] = useCookies(['id']);

    // Date
    const [endDate, setendDate] = useState(dayjs());
    const [startDate, setstartDate] = useState(endDate.subtract(3, "M"));

    // dataframe columnrows
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [changerow, setChangerow] = useState();

    const [infocolumns, setInfocolumns] = useState([]);
    const [inforows, setInforows] = useState([]);
    const [funcs, setFuncs] = useState(Object.keys(descript));


    const [checkBox, setCheckBox] = useState(Array(region.length).fill(false));


    const [proselectval, setProselectval] = useState([]);

    // loading control
    const [Isimport, setIsimport] = useState(false);
    const [IsloadRow, setIsloadRow] = useState(false);

    const [saveDataName, setSaveDataName] = useState('');

    const [selectedIdx, setSelectedIdx] = useState('');
    const [att, setAtt] = useState('');

    // history
    const [history, setHistory] = useState([]);
    const [uniqKey, setUniqKey] = useState(0);

    const makeSelectVal = (checks) => {
        let valtmp = [...proselectval];
        console.log('64 valtmp', valtmp)
        checks.map((c, idx) => {
            if (!c) {
                const taget = `${region[idx][2]}_${region[idx][4]}_${region[idx][6].replace(/\(.*\)/g, '')}`;
                if (proselectval.includes(taget)) valtmp = valtmp.filter((v) => v !== taget);
            } else {
                const taget = `${region[idx][2]}_${region[idx][4]}_${region[idx][6].replace(/\(.*\)/g, '')}`;
                if (!proselectval.includes(taget)) valtmp.push(taget);
            }
        })
        valtmp = [...new Set(valtmp)];
        valtmp = valtmp.map((item) => item.replace(/\(.*\)/g, ''))
        console.log('75 valtmp', valtmp)
        if (valtmp !== proselectval) setProselectval(valtmp);
    }

    const handleCheck = (event, idx, region) => {
        // let tmp = proselectval.length!==0?[...checkBox]:Array(region.length).fill(false);
        let tmp = [...checkBox];
        console.log('81 tmp', tmp)
        tmp[idx] = event.target.checked;
        makeSelectVal(tmp);
        setCheckBox(tmp);
    }

    const handleCheckAll = (event) => {
        let tmp = Array(region.length).fill(event.target.checked);
        console.log('90 tmp', tmp)
        if (event.target.checked) {
            let tmpregion = region.map(d => `${d[2]}_${d[4]}_${d[6].replace(/\(.*\)/g, '')}`);
            console.log('93 tmpregion', tmpregion)
            setProselectval(tmpregion);
        }
        else setProselectval([]);
        setCheckBox(tmp);
    }



    const handleProcess = () => {
        setIsloadRow(true);
        if (rows.length === 0) {
            alert("데이터를 불러와주세요");
            setIsloadRow(false);
            return;
        } else if (proselectval.length === 0) {
            alert("Processing Column을 선택해주세요");
            setIsloadRow(false);
            return;
        } else if (selectedIdx === '') {
            alert("Processing Method를 선택해주세요");
            setIsloadRow(false);
            return;
        } else {
            const func = selectedIdx.split('-')[0];
            const method = selectedIdx.split('-')[1];
            const tmpatt = descript[func][method];

            if (tmpatt !== "" && att === "") {
                if (tmpatt === "column") setAtt(proselectval[0]);
                else setAtt("1");
            } else if (tmpatt === "strnumrow" && (Number(att) > rows.length || Number(att) < 1)) {
                alert("1 미만 또는 데이터 개수보다 큰 수를 입력하셨습니다.");
                setAtt("1");
                setIsloadRow(false);
                return;
            } else if (tmpatt === "strnum" && (Number(att) > proselectval.length || Number(att) < 1)) {
                alert("1 미만 또는 선택 변수 개수보다 큰 수를 입력하셨습니다.");
                setAtt("1");
                setIsloadRow(false);
                return;
            } else if (tmpatt === "strnum" && (Number(att) > 10 || Number(att) < 1)) {
                alert("1 미만 또는 10 초과의 수를 입력하셨습니다.");
                setAtt("1");
                setIsloadRow(false);
                return;
            } else if (!['InterpolUnivar', 'fillna', 'dropna'].includes(func)) {
                let iserror = false;
                for (let d of proselectval) {
                    if (inforows[1][d] !== 0) {
                        alert("결측치가 존재하는 변수는 처리할 수 없습니다.");
                        iserror = true;
                        break;
                    }
                }
                if (iserror) {
                    setIsloadRow(false);
                    return;
                }
            }
            const historyAtt = func === "InterpolUnivar" && (method !== "spline" && method !== "polynomial") ? "0" : att;
            console.log('selectedIdx', selectedIdx)
            console.log('historyAtt', historyAtt)
            console.log('...proselectval', ...proselectval)
            let oneprocess = [selectedIdx, historyAtt, ...proselectval];
            fetch('/api/python/preprocessing/one', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: cookies.id, data: rows, key: uniqKey, request: oneprocess })
            })
                .then(response => response.json())
                .then(response => {
                    if (response.hasOwnProperty('error')) {
                        alert(response.error);
                        setAtt('');
                        setCheckBox(Array(region.length).fill(false));
                        setProselectval([]);
                        setSelectedIdx('');
                        setIsloadRow(false);
                    } else {
                        const resultrow = response.result;
                        let tmphistory = [...history];
                        tmphistory.push({
                            'var': proselectval,
                            'function': func,
                            'method': method,
                            'attributes': historyAtt,
                        });
                        setHistory(tmphistory);
                        setRows(resultrow);
                        makeChartfromProc(resultrow);
                        setInforows(response.info);
                        setCheckBox(Array(region.length).fill(false));
                        setIsloadRow(false);
                        setProselectval([]);
                        setAtt('');
                        setSelectedIdx('');
                    }
                })
        }

    }

    const chartOptions = {
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            title: {
                display: true,
                // text:ShowRegion,
                font: {
                    size: 24,
                    family: "BasicEB",
                },
                color: "rbg(0,0,0)",
                align: "start",
            },
            legend: {
                position: 'top'
            }
        },
        scales: { x: { grid: { display: false, } } }
    };

    useEffect(() => {
        makeChartfromProc([]); const defaultChecks = Array(region.length).fill(false); setCheckBox(defaultChecks); setIsimport(false);
        // 오류 function 처리
        let tmpfuncs = [...funcs];
        let errorfuncs = tmpfuncs.filter(d => ['ColumnPCA', 'ColumnSummary', 'Sampling', 'FeatureSelection'].includes(d));
        let nonerrorfuncs = tmpfuncs.filter(d => !['ColumnPCA', 'ColumnSummary', 'Sampling', 'FeatureSelection'].includes(d));
        setFuncs([...nonerrorfuncs, ...errorfuncs]);
    }, [region])


    useEffect(() => {
        const arraycls = [];
        const arrayinfocls = [];
        const cls = [{ field: 'date', headerName: 'Date', width: 90, minWidth: 75, headerClassName: 'datagrid-header' }];
        const infocls = [{ field: 'id', headerName: 'Summary', width: 90, minWidth: 80, headerClassName: 'datagrid-header' }];
        region.map((r, idx) => {
            arrayinfocls.push({ field: `${r[2]}_${r[4]}_${r[6].replace(/\(.*\)/g, '')}`, width: 75, minWidth: 75, sortable: false, headerAlign: 'left', headerName: `x${idx}`, type: 'number', headerClassName: 'datagrid-header' });
            arraycls.push({ field: `${r[2]}_${r[4]}_${r[6].replace(/\(.*\)/g, '')}`, width: 75, minWidth: 75, headerAlign: 'left', sortable: false, type: 'number', editable: true, headerClassName: 'datagrid-header', renderHeader: () => (<span><Checkbox key={idx} checked={!!checkBox[idx]} onChange={(e) => handleCheck(e, idx, `${r[2]}_${r[4]}_${r[6]}`)} size="small" />{`x${idx}`}</span>) });
        })
        setColumns([...cls, ...arraycls]);
        setInfocolumns([...infocls, ...arrayinfocls]);


    }, [region, checkBox])

    useEffect(() => {
        console.log(rows);
    }, [rows])


    useEffect(() => {
        if (changerow !== undefined) {
            let tmp = [...rows];
            let idx = changerow.id;
            tmp[idx] = changerow;
            setRows(tmp);
            makeChartfromProc(tmp);
        }
    }, [changerow])


    useEffect(() => {
        if (selectedIdx !== '') {
            const target = descript[selectedIdx.split('-')[0]][selectedIdx.split('-')[1]];
            switch (target) {
                case 'strnumrow':
                    setAtt(1);
                    break;
                case 'strnum':
                    setAtt(1);
                    break;
                case 'column':
                    setAtt(proselectval[0]);
                    break;
                case 'strnum10':
                    setAtt(1);
                    break;
                default:
                    setAtt('');
            }
        }
    }, [selectedIdx])

    useEffect(() => {
        if (att !== '') {
            console.log(att);
        }
    }, [att])


    const LoadData = () => {
        const std = dayjs(startDate).startOf("D").format('YYYYMMDD');
        const end = dayjs(endDate).startOf("D").format('YYYYMMDD');
        setUniqKey(Math.random().toString(36).split('.')[1]);
        if (std > end) alert("조회 시작 일자가 종료 일자 이후로 선택되었습니다.");
        else if (std === end) alert("동일 일자가 선택되었습니다");
        else if (region.length === 0) alert("조회 변수 및 지역이 선택되지 않았습니다.");
        else {
            setIsloadRow(true);
            fetch('/api/dataframe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: region,
                    stdate: std,
                    eddate: end
                })
            })
                .then(response => response.json())
                .then(response => {
                    if (response.hasOwnProperty('error')) { alert(response.error); setIsloadRow(false); setProselectval([]); }
                    else {
                        console.log('response.data', response.data)
                        setRows(response.data);
                        makeChartfromProc(response.data);
                        setInforows(response.info);
                        setIsimport(true);
                        setIsloadRow(false);
                        setProselectval([]);
                    }
                })
        }
    }

    const Confirm = (message = null, onConfirm, onCancel) => {
        if (!onConfirm || typeof onConfirm !== "function") {
            return;
        }
        if (onCancel && typeof onCancel !== "function") {
            return;
        }

        const confirmAction = () => {
            if (window.confirm(message)) {
                onConfirm();
            } else {
                onCancel();
            }
        };

        return confirmAction;
    };

    const apply = (force) => {
        if (saveDataName.length === 0) alert("저장할 이름을 입력해주세요.");
        else if (rows.length === 0) alert("저장할 데이터가 없습니다.");
        else {

            // ------------- 누락된 변수 데이터가 있는지 확인하는 코드 ----------------
            // let tmprows = [...rows];
            // const lenmax = tmprows.sort((a,b)=>Object.keys(b).length-Object.keys(a).length)[0];
            // if(Object.keys(lenmax).length !== region.length+2){
            //     alert("누락된 변수 데이터가 있습니다. 데이터를 채우거나 변수를 삭제해주세요.");
            //     return;
            // }

            fetch(`/api/datasave/${saveDataName}/${force}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: cookies.id, key: uniqKey, data: rows, datainfo: JSON.stringify(region.map(row=> [row[0], row[2], row[4], row[6].replace(/\(.*\)/g, '')])), pre: history })
            })
                .then(response => response.json())
                .then(response => {
                    if (response.hasOwnProperty('error')) {
                        if (response.error === "exist") {
                            const confirmAction = Confirm("이미 존재하는 이름입니다. 덮어쓰시겠습니까?", () => {
                                apply(1);
                            }, () => {
                            });
                            confirmAction();
                        }
                        else alert(response.error);
                    }
                    else alert("저장되었습니다.");
                })
        }
    }

    const inforeload = () => {
        if (rows.length !== 0) {
            fetch('/api/dataframe/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: rows })
            })
            .then(response => response.json())
            .then(response => {
                if (response.hasOwnProperty('error')) alert(response.error);
                else setInforows(response.info);
            })
        }
    }


    const toolbar = () => {
        return (
            <GridToolbarContainer style={{ justifyContent: 'space-between' }}>
                <div>
                    <GridToolbarColumnsButton />
                    <GridToolbarExport
                        csvOptions={{
                            fileName: `${dayjs(startDate).startOf("D").format().split('T')[0]}_${dayjs(endDate).startOf("D").format().split('T')[0]}_data`,
                            utf8WithBom: true,
                        }}
                    />
                </div>
                <div className="datagrid-select" style={{ display: 'flex', alignItems: 'center' }}>
                    <span>Select All Columns</span><Checkbox onChange={handleCheckAll} checked={!checkBox.includes(false)} />
                </div>
            </GridToolbarContainer>
        );
    }

    const info_Toolbar = () => {
        return (
            <GridToolbarContainer style={{ justifyContent: 'end', margin: 0, padding: '0.2rem', height: '2rem' }}>
                <Button variant="contained" color="primary" size="small" onClick={inforeload} style={{ marginRight: '0.5rem' }}>Info Reload</Button>
            </GridToolbarContainer>
        );
    }

    const useFakeMutation = () => {
        return useCallback(
            (data) =>
                new Promise((resolve, reject) =>
                    setTimeout(() => {
                        if (data.date?.trim() === '') {
                            reject(new Error("Data date is empty."));
                        } else {
                            resolve({ ...data });
                        }
                    }, 200),
                ),
            [],
        );
    };

    const mutateRow = useFakeMutation();

    const handleProcessRowUpdate = useCallback(
        async (newRow) => {
            setChangerow(newRow);
            const response = await mutateRow(newRow);
            return response;
        },
        [mutateRow],
    );

    console.log('columns', columns)

    return (
        <div className="preprocessing-page" style={{ height: "100%" }}>
            <CssBaseline />
            <Grid container component="main" sx={{ width: '100%', height: '100%' }}>
                {/* management Start */}
                <Grid
                    item
                    className="management"
                    sm={3}
                    md={3}
                    sx={{ height: '88vh', display: 'flex', flexDirection: 'column' }}
                >
                    <div className="val-table-wrap">
                        <TableContainer component={Paper} sx={{ height: '100%', overflow: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ width: '100%' }} aria-label="val-table">
                                <TableHead><TableRow><TableCell sx={{ width: '5px' }}><b>id</b></TableCell>{['System', 'Category', 'Site', 'Variable'].map((v) => <TableCell align="center"><b>{v}</b></TableCell>)}</TableRow></TableHead>
                                <TableBody>
                                    {region.map((data, idx) => (
                                        <TableRow>
                                            <TableCell>x{idx}</TableCell>
                                            {data.map((d, innerIdx) => (
                                                innerIdx % 2 === 0 ? <TableCell align="center">{d}</TableCell> : null
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                </Grid>
                {/* management End */}
                {/* datatable Start */}
                <Grid
                    item
                    className="datatable"
                    sm={9}
                    md={9}
                    sx={{ height: '88vh', display: 'flex', flexDirection: 'column' }}
                >
                    <div className="processing-header">
                        {/* <div className="datepick-header"> */}
                        <div className="datepick-picker">
                            <h5 style={{ marginRight: '2rem', fontWeight: '600' }}>기간 설정</h5>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="시작일"
                                    value={startDate}
                                    onChange={(newValue) => {
                                        setstartDate(newValue);
                                    }}
                                    renderInput={(params) => <TextField {...params} />}
                                />
                            </LocalizationProvider>
                            <h4 style={{ "margin": "0.5rem", "color": "rgba(0,0,0,0.6)" }}> ~ </h4>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="종료일"
                                    value={endDate}
                                    onChange={(newValue) => {
                                        setendDate(newValue);
                                    }}
                                    renderInput={(params) => <TextField {...params} />}
                                />
                            </LocalizationProvider>
                            <Button size="small" variant="contained" style={{ marginLeft: '0.5rem' }} onClick={LoadData}>Import</Button>
                            {Isimport ? <Button size="small" variant="contained" onClick={e => { LoadData(); setAtt(''); setCheckBox(Array(region.length).fill(false)); setProselectval([]); setSelectedIdx(''); }} style={{ marginLeft: '1rem' }}>Reset</Button> : <Button size="small" variant="contained" disabled style={{ marginLeft: '1rem' }}>Reset</Button>}
                        </div>
                        <div>
                            {<TextField
                                required
                                id="dataset-name"
                                label="Dataset Name"
                                size="small"
                                onChange={e => setSaveDataName(e.target.value)}
                            />}
                            {Isimport ? <Button size="large" variant="contained" className="apply-btn" onClick={e => apply(0)} style={{ marginRight: '1rem', marginLeft: '1rem' }}>Save</Button> : <Button size="large" variant="contained" disabled className="apply-btn" style={{ marginRight: '1rem', marginLeft: '1rem' }}>Save</Button>}
                        </div>
                    </div>
                    <div className="dataframe">
                        <div className="dataframe-left" style={{ width: '77%' }}>
                            {IsloadRow ? <Skeleton variant="rectangular" animation="wave" width="99%" height="40vh" margin="0" /> : <DataGrid
                                density="compact"
                                processRowUpdate={handleProcessRowUpdate}
                                onCell
                                rows={rows}
                                columns={columns}
                                experimentalFeatures={{ newEditingApi: true }}
                                sx={{ width: '99%', height: '40vh' }}
                                components={{ Toolbar: toolbar }}
                                disableSelectionOnClick
                            />}
                            {IsloadRow ? <Skeleton variant="rectangular" animation="wave" width="99%" height="18.8vh" style={{ marginTop: "1rem" }} /> : <DataGrid
                                density="compact"
                                hideFooter
                                rows={inforows}
                                columns={infocolumns}
                                components={{ Toolbar: info_Toolbar }}
                                sx={{ marginTop: '0.5rem', width: '99%', height: '18.8vh' }}
                            />}
                            {/* <Paper sx={{marginTop:'1rem',marginBottom:'1rem', flex:'1', marginRight:'1rem',overflow: 'auto', display:'flex',flexDirection:'column', alignItems:'center'}}> */}
                            {IsloadRow ? <Skeleton variant="rectangular" animation="wave" width="99%" height="18vh" style={{ marginTop: "1rem" }} /> : <Paper sx={{ marginTop: '1rem', marginBottom: '1rem', height: '18vh', marginRight: '1rem', overflow: 'auto' }}>
                                {ProcChart.length !== 0 ? ProcChart['vals'].map(r => {
                                    return (<div style={{ height: '13rem', marginLeft: '5%', marginRight: '5%' }}><Line options={chartOptions} data={{
                                        labels: ProcChart['date'],
                                        datasets: [
                                            {
                                                type: 'line',
                                                label: `${r}`,
                                                data: ProcChart[r],
                                                borderColor: 'rgb(0, 0, 0)',
                                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                borderWidth: 1,
                                                pointRadius: 1,
                                            }
                                        ]
                                    }} /></div>)
                                }) : <div>데이터없음</div>}
                            </Paper>
                            }
                        </div>
                        {/* <div className="dataframe-right" style={{width:'23%', display:'flex', flexDirection:'column', alignItems:'center', paddingRight:'1rem'}}> */}
                        <div className="dataframe-right" style={{ width: '23%', paddingRight: '1rem' }}>
                            <List
                                sx={{
                                    width: '100%',
                                    height: '70%',
                                    position: 'relative',
                                    overflow: 'auto',
                                    '& ul': { padding: 0 },
                                    marginBottom: '0.5rem'
                                }}
                                component={Paper}
                                subheader={<li />}
                            >
                                {
                                    funcs.map(d => {
                                        return (
                                            <li key={d} className="list-section">
                                                <ul>
                                                    {['ColumnPCA', 'ColumnSummary', 'Sampling', 'FeatureSelection'].includes(d) ? <ListSubheader sx={{ color: '#da4f49' }}>{d}</ListSubheader> : <ListSubheader>{d}</ListSubheader>}
                                                    {
                                                        Object.keys(descript[d]).map(f => (
                                                            <ListItemButton key={`${d}_${f}`} selected={selectedIdx === `${d}-${f}`} onClick={(e) => { setSelectedIdx(`${d}-${f}`); }} sx={{ height: '2vh', paddingLeft: '2rem' }}>
                                                                <ListItemText primary={f} />
                                                            </ListItemButton>
                                                        ))
                                                    }
                                                </ul>
                                            </li>
                                        )
                                    })
                                }
                            </List>
                            <b>Attributes</b>
                            <List
                                sx={{
                                    width: '100%',
                                    height: '19%',
                                    position: 'relative',
                                    overflow: 'auto',
                                    '& ul': { padding: 0 },
                                    marginTop: '0.5rem'
                                }}
                                component={Paper}
                            >
                                {
                                    selectedIdx !== '' ?
                                        descript[selectedIdx.split('-')[0]][selectedIdx.split('-')[1]] === "strnumrow" ?
                                            <ListItem>
                                                <ListItemText primary="attribute" />
                                                <Tooltip followCursor title={`1-${rows.length}(데이터 개수) 사이의 값을 입력하세요`}><OutlinedInput key={`${selectedIdx}-numrow`} type="number" onChange={e => setAtt(e.target.value)} defaultValue={1} sx={{ width: '8rem', height: '2rem', fontSize: '0.8rem' }} /></Tooltip>
                                            </ListItem> :
                                            descript[selectedIdx.split('-')[0]][selectedIdx.split('-')[1]] === "column" ?
                                                <ListItem>
                                                    <ListItemText primary="attribute" />
                                                    <FormControl key={`${selectedIdx}-col`} variant="standard" size="small" sx={{ width: '8rem', }}>
                                                        <Select
                                                            key={`${selectedIdx}-col-select`}
                                                            defaultValue={proselectval[0]}
                                                            sx={{ fontSize: '0.8rem' }}
                                                            onChange={(e) => setAtt(e.target.value)}
                                                        >
                                                            {
                                                                proselectval.map(v => (
                                                                    <MenuItem value={v}>{v}</MenuItem>
                                                                ))
                                                            }
                                                        </Select>
                                                    </FormControl>
                                                </ListItem> :
                                                descript[selectedIdx.split('-')[0]][selectedIdx.split('-')[1]] === "strnum" ?
                                                    <ListItem>
                                                        <ListItemText primary="attribute" />
                                                        <Tooltip followCursor title={`1-${proselectval.length}(선택 변수 개수) 사이의 값을 입력하세요`}><OutlinedInput key={`${selectedIdx}-num`} type="number" onChange={e => setAtt(e.target.value)} defaultValue={1} sx={{ width: '8rem', height: '2rem', fontSize: '0.8rem' }} /></Tooltip>
                                                    </ListItem> :
                                                    descript[selectedIdx.split('-')[0]][selectedIdx.split('-')[1]] === "strnum10" ?
                                                        <ListItem>
                                                            <ListItemText primary="attribute" />
                                                            <Tooltip followCursor title="1-10 사이의 값을 입력하세요"><OutlinedInput key={`${selectedIdx}-num10`} type="number" onChange={e => setAtt(e.target.value)} defaultValue={1} sx={{ width: '8rem', height: '2rem', fontSize: '0.8rem' }} /></Tooltip>
                                                        </ListItem>
                                                        : <></> : <></>
                                }
                            </List>
                            <div style={{ display: 'flex', justifyContent: 'center', }}><Button variant="contained" size="small" onClick={handleProcess} sx={{ marginY: '0.5rem', width: '50%' }}>적용</Button></div>
                        </div>
                    </div>

                </Grid>
                {/* datatable End */}
            </Grid>
        </div>
    )
}