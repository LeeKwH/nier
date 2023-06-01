import { Modal, TextField, FormControl, IconButton , Select, MenuItem, Divider, OutlinedInput, List, ListItem,ListItemText,ListItemButton, ListSubheader, Button, Grid, CssBaseline,  Paper, Tooltip } from "@mui/material";
import { Box } from "@mui/system";
import { alpha, styled } from '@mui/material/styles';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { useEffect, useState } from "react";
import { useCookies } from 'react-cookie';

const regex = /^[ㄱ-ㅎ|가-힣|]+$/;
const ODD_OPACITY = 0.2;
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
    [`& .${gridClasses.row}.even`]: {
      backgroundColor: theme.palette.grey[200],
      '&:hover, &.Mui-hovered': {
        backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
        '@media (hover: none)': {
          backgroundColor: 'transparent',
        },
      },
      '&.Mui-selected': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          ODD_OPACITY + theme.palette.action.selectedOpacity,
        ),
        '&:hover, &.Mui-hovered': {
          backgroundColor: alpha(
            theme.palette.primary.main,
            ODD_OPACITY +
              theme.palette.action.selectedOpacity +
              theme.palette.action.hoverOpacity,
          ),
          // Reset on touch devices, it doesn't add specificity
          '@media (hover: none)': {
            backgroundColor: alpha(
              theme.palette.primary.main,
              ODD_OPACITY + theme.palette.action.selectedOpacity,
            ),
          },
        },
      },
    },
  }));

export default function User(){
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const [openUserSetting, setOpenUserSetting] = useState(false);
    const handleOpenUserSetting = (id) => {setOpenUserSetting(true); setUserSettingId(id)};
    const handleCloseUserSetting = () => setOpenUserSetting(false);
    const [userSettingId, setUserSettingId] = useState('');

    const [signupIdCheck, setSignupIdCheck] = useState(false);
    const [signupId, setSignupId] = useState('');
    const [cookie, setCookie, removeCookie] = useCookies(['id']);
    const [isAddmin, setIsAdmin] = useState(false);
    const [reload, setReload] = useState(false);

    const [pageSize, setPageSize] = useState(15);

    const columns = [
        { field: 'id', headerName: '#', width: 10 },
        { field: 'user_id', headerName: '아이디', flex: 1, renderCell: (params) => (
            <strong className="user-id" onClick={e=>handleOpenUserSetting(params.value)}>
              {params.value}
            </strong>
          ) },
        { field: 'user_name', headerName: '사용자명', flex: 1 },
        { field: 'user_email', headerName: '이메일', flex: 1 },
        { field: 'user_address', headerName: '연락처', flex: 1 },
        { field: 'last_date', headerName: '접속일', flex: 1 },
        { field: 'join_date', headerName: '가입일', flex: 1 },

    ];

    const [rows, setRows] = useState([]);

    useEffect(() => {
        fetch('/api/auth/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'id': cookie.id,
            })
        })
            .then(res => res.json())
            .then(res => {
                if (res.hasOwnProperty('error')) {
                    alert(res.error +' 관리자만 접근 가능합니다.');
                    window.location.href = '/';
                }else{
                    setIsAdmin(true);
                }
            })
    }, [cookie.id])

    useEffect(() => {
        if(isAddmin){
        fetch('/api/auth/userlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'id': cookie.id,
            })
        })
            .then(res => res.json())
            .then(res => {
                if (res.hasOwnProperty('error')) {
                    alert(res.error);
                } else {
                    setRows(res.data);
                }
            })}
    }, [isAddmin,reload])


    const handleAppendUser = (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const id = data.get('id');
        const password = data.get('password');
        const passwordcheck = data.get('passwordcheck');
        const name = data.get('name');
        const email = data.get('email');
        const phone = data.get('phone');

        if(!id || !password || !name || !passwordcheck || !email ){
            alert('필수 항목을 입력해주세요.');
            return;
        }else if(!signupIdCheck){
            alert('아이디 중복체크를 해주세요.');
            return;
        }else if (password !== passwordcheck){
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }else if (password.length < 8){
            alert('비밀번호는 8자 이상 입력해주세요.');
            return;
        }else if (!email.includes('@')){
            alert('이메일 형식이 올바르지 않습니다.');
            return;
        }else{
            fetch('/api/auth/signup',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                    },
                    body:JSON.stringify({
                        'id':id,
                        'password':password,
                        'name':name,
                        'email':email,
                        'phone':phone
                        })
                    })
                    .then(res => res.json())
                    .then(res => {
                        if(res.hasOwnProperty('error')){
                            alert(`사용자 등록에 실패하였습니다. : ${res.error}`);
                            setOpen(false);
                        }else{
                            alert('사용자 등록이 완료되었습니다.');
                            setReload(!reload);
                            setOpen(false);
                        }
                    }
                )
        }
    }

    const handleChangeUser = (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const id = data.get('id');
        const password = data.get('password');
        const passwordcheck = data.get('passwordcheck');
        const name = data.get('name');
        const email = data.get('email');
        const phone = data.get('phone');

        if(password && password !== passwordcheck){
            alert('변경 비밀번호가 일치하지 않습니다.');
            return;
        }else if (password && password.length < 8){
            alert('변경 비밀번호는 8자 이상 입력해주세요.');
            return;
        }else if (!email.includes('@')){
            alert('이메일 형식이 올바르지 않습니다.');
            return;
        }else{
            fetch('/api/auth/userchange',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                    },
                    body:JSON.stringify({
                        'isadmin':cookie.id,
                        'id':userSettingId,
                        'password':password,
                        'name':name,
                        'email':email,
                        'phone':phone
                        })
                    })
                    .then(res => res.json())
                    .then(res => {
                        if(res.hasOwnProperty('error')){
                            alert(`사용자 정보 변경에 실패하였습니다. : ${res.error}`);
                            setUserSettingId('');
                            handleCloseUserSetting();
                        }else{
                            alert('사용자 정보 변경이 완료되었습니다.');
                            handleCloseUserSetting();
                            setReload(!reload);
                            setUserSettingId('');
                        }
                    }
                )
        }
    }

    const handleIdCheck = () => {
        if(signupId.length ===0){
            alert('아이디를 입력해주세요.');
            return;
        }else if(regex.test(signupId)){
            alert('아이디는 영문자 및 숫자만 입력 가능합니다.');
            return;
        }else{
            fetch(`/api/auth/signup/checkid/${signupId}`)
            .then(res => res.json())
            .then(res => {
                if(res.hasOwnProperty('error')){
                    alert(`아이디 중복체크에 실패하였습니다. : ${res.error}`);
                }else{
                    if(res.result === 'success'){
                        alert('사용 가능한 아이디입니다.');
                        setSignupIdCheck(true);
                    }else{
                        alert('이미 존재하는 아이디입니다.');
                        setSignupIdCheck(false);
                    }
                }
            })
        }
    }

    const handleDeleteUser = (e) => {
        e.preventDefault();
        if(!window.confirm('정말로 삭제하시겠습니까?')){
            return;
        }else{
            fetch(`/api/auth/userdelete`,{
                method:'DELETE',
                headers:{
                    'Content-Type':'application/json'
                    },
                    body:JSON.stringify({
                        'isadmin':cookie.id,
                        'id':userSettingId,
                        })
                    })
                    .then(res => res.json())
                    .then(res => {
                        if(res.hasOwnProperty('error')){
                            alert(`사용자 삭제에 실패하였습니다. : ${res.error}`);
                            setUserSettingId('');
                            handleCloseUserSetting();
                        }else{
                            alert('사용자 삭제가 완료되었습니다.');
                            handleCloseUserSetting();
                            setReload(!reload);
                            setUserSettingId('');
                        }
                    }
                )
        }
    }

    const findInfo = (findme)=>{
        if(openUserSetting){const data = rows.filter((row)=>row.user_id === userSettingId);
        if(data.length === 0){
            alert('사용자 정보를 찾을 수 없습니다.');
            setUserSettingId('');
            handleCloseUserSetting();
            return;
        }else{
            return data.at(0)[findme];
        }}
    }

    return(
        <div className="user-page" style={{height:'95vh',width:'100%'}}>
            <CssBaseline />
            {isAddmin?<Grid container component="main" sx={{ width:'100%',height: '95vh' }}>
                <Grid item sm={12} md={12} sx={{height:'95vh',display:'flex',flexDirection:'column', padding:'2rem'}}>
                    <div className="user-header" style={{display:'flex', justifyContent:'space-between', alignItems:'end'}}>
                        <h2><b style={{fontFamily:"BasicEB"}}>사용자 관리</b></h2>
                        <div><Button variant="outlined" onClick={e=>setReload(!reload)} sx={{height:'2rem', marginRight:'0.5rem'}}> Reload </Button><Button variant="contained" onClick={handleOpen} sx={{height:'2rem'}}> 사용자 등록 </Button></div>
                    </div>
                    <Modal
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="modal-modal-title"
                        aria-describedby="modal-modal-description"
                    >
                        {/* user add using fetch */}
                        <Paper className="user-add-modal" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:'32vw',height:'52vh',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',padding:'1rem'}}>
                            <h4><b>사용자 등록</b></h4>
                            <Box component="form" noValidate onSubmit={handleAppendUser} className="user-add-form" style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'space-evenly'}}>
                                <div className="user-append"><b>아이디 : </b><div style={{display:'flex',alignItems:'center',width:'83%'}}><TextField required size="small" name="id" id="id" type="id" label="ID" variant="outlined" onChange={e=>{setSignupId(e.target.value); setSignupIdCheck(false);}} style={{width:'100%',margin:'0.5rem'}}/><Button onClick={handleIdCheck} size="small" variant="contained" sx={{width:'25%', height:'5%', marginRight:'0.5rem'}}>중복 체크</Button></div></div>
                                <div className="user-append"><b>비밀번호 : </b><TextField required helperText="8자 이상 입력하세요." size="small" name="password" id="password" type="password" label="Password" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>비밀번호 확인 : </b><TextField required size="small" name="passwordcheck" id="passwordcheck" type="password" label="Password" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>사용자 명 : </b><TextField required size="small" id="name" name="name" type="name" label="Name" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>Email : </b><TextField required size="small" id="email" type="email" name="email" label="Email" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>Phone : </b><TextField size="small" id="phone" type="phone" name="phone" label="Phone" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div style={{display:'flex', }}><Button variant="outlined" style={{width:'30%',margin:'0.5rem'}} onClick={handleClose}>취소</Button><Button variant="contained" type="submit" style={{width:'30%',margin:'0.5rem'}}>등록</Button></div>
                            </Box>
                        </Paper>
                    </Modal>
                    <Modal
                        open={openUserSetting}
                        onClose={handleCloseUserSetting}
                        aria-labelledby="modal-modal-title"
                        aria-describedby="modal-modal-description"
                    >
                        {/* user setting change using fetch */}
                        <Paper className="user-add-modal" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:'32vw',height:'55vh',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',padding:'1rem'}}>
                            <h4><b>사용자 정보 수정</b></h4>
                            <Box component="form" noValidate onSubmit={handleChangeUser} className="user-add-form" style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'space-evenly'}}>
                                <div className="user-append"><b>아이디 : </b><TextField disabled size="small" name="id" id="id" type="id" label="ID" variant="outlined" defaultValue={findInfo('user_id')} style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>비밀번호 변경 : </b><TextField helperText="비밀번호 변경을 원하시는 경우 칸을 채워주세요." size="small" name="password" id="password" type="password" label="Password" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>비밀번호 확인 : </b><TextField helperText="비밀번호 변경을 원하시는 경우 칸을 채워주세요." size="small" name="passwordcheck" id="passwordcheck" type="password" label="Password" variant="outlined" style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>사용자 명 : </b><TextField size="small" id="name" name="name" type="name" label="Name" variant="outlined" defaultValue={findInfo('user_name')} style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>Email : </b><TextField size="small" id="email" type="email" name="email" label="Email" variant="outlined" defaultValue={findInfo('user_email')} style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>Phone : </b><TextField size="small" id="phone" type="phone" name="phone" label="Phone" variant="outlined" defaultValue={findInfo('user_address')} style={{width:'80%',margin:'0.5rem'}}/></div>
                                <div style={{display:'flex', }}><Button variant="outlined" style={{width:'30%',margin:'0.5rem'}} onClick={handleCloseUserSetting}>취소</Button><Button variant="contained" type="submit" style={{width:'30%',margin:'0.5rem'}}>변경</Button></div>
                                {userSettingId==="admin"?null:<div style={{display:'flex', width:'100%',flexDirection:'row-reverse'}}><Button variant="contained" color="error" style={{width:'20%'}} onClick={handleDeleteUser}>사용자 삭제</Button></div>}
                            </Box>
                        </Paper>
                    </Modal>
                    <div className="user-table" style={{display:'flex',flexDirection:'column',width:'100%',height:'80%', marginTop : '1rem'}}>
                        <Paper sx={{ width: '100%', overflow: 'auto', height:'100%', padding:'1rem' }}>
                            <StripedDataGrid
                                density="compact"
                                rows={rows}
                                columns={columns}
                                pageSize={pageSize}
                                onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
                                rowsPerPageOptions={[15, 30, 50]}
                                pagination
                                getRowClassName={(params) =>
                                    params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                                }
                                disableSelectionOnClick
                            />
                        </Paper>
                    </div>
                </Grid>
            </Grid>:<></>}
        </div>

    )
}