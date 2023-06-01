import { Card,Box,TextField, Skeleton, List, ListItem,ListItemText, ListSubheader, Button, Grid, CssBaseline,  Paper, Tooltip, CardHeader, Divider } from "@mui/material";
import { useCookies } from 'react-cookie';

export default function Setting(){
    const [cookie, setCookie, removeCookie] = useCookies(['id']);
    const userid = cookie.id;

    const handleChangePASSWD = (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const oldpasswd = data.get('oldpasswd');
        const newpasswd = data.get('newpasswd');
        const newpasswd2 = data.get('newpasswd2');
        if (oldpasswd === '' || newpasswd === '' || newpasswd2 === '') {
            alert('모든 항목을 입력해주세요.');
        }
        else if (newpasswd !== newpasswd2) {
            alert('새 비밀번호가 일치하지 않습니다.');
        }
        else {
            fetch(`/api/auth/changepwd`, {  // 비밀번호 변경 요청
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: userid,
                        oldpasswd: oldpasswd,
                        newpasswd: newpasswd,
                        }),
                        })
                        .then((res) => res.json())
                        .then((res) => {
                            if (res.result === 'success') {
                                alert('비밀번호가 변경되었습니다.');
                                window.location.reload();
                            } else {
                                alert(`비밀번호 변경 실패 : ${res.error}`);
                            }
                        });
        }
    };

    const handleChangeINFO = (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const email = data.get('email');
        const phone = data.get('phone');
        if(email===''&&phone===''){
            alert('변경할 정보를 입력해주세요.');
            return;
        }else if(email!==''&&!email.includes('@')){
            alert('이메일 형식이 올바르지 않습니다.');
            return;
        }else{
            fetch(`/api/auth/changeinfo`, {  // 비밀번호 변경 요청
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: userid,
                        email: email,
                        phone: phone,
                        }),
            })
            .then((res) => res.json())
            .then((res) => {
                if (res.result === 'success') {
                    alert('정보가 변경되었습니다.');
                    window.location.reload();
                } else {
                    alert(`정보 변경 실패 : ${res.error}`);
                }
            });
        }
    };


    return(
        <div className="setting-page" style={{height:'95vh', width:'100%'}}>
            <CssBaseline/>
            <Grid container style={{height:'95vh', width:'100%'}}>
                <Grid item xs={6} ms={6} md={6} lg={6} xl={6} style={{display:'flex', flexDirection:'column',height:'95vh', padding:'1rem',alignItems:'center'}}>
                    {/* <Paper style={{height:'100%', width:'100%', display:'flex', flexDirection:'column',padding:'1rem'}}> */}
                        {/* <h4>User</h4> */}
                        {/* <div style={{display:'flex',height:'90%', flexDirection:'column', alignItems:'center', marginTop:'1.5rem'}}> */}
                            <Card style={{width:'90%',height:'50%',marginTop:'1rem'}}>
                                <CardHeader sx={{backgroundColor:'#F5F5F5'}} title="비밀번호 변경"/>
                                {/* <Box component="form" noValidate sx={{display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'space-evenly'}}> */}
                                <Box component="form" onSubmit={handleChangePASSWD} noValidate sx={{display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',padding:'1rem'}}>
                                    <div className="user-append"><b>현재 비밀번호 : </b><TextField required size="small" name="oldpasswd" id="oldpasswd" type="password" label="Password" variant="outlined" style={{width:'75%',margin:'0.5rem'}}/></div>
                                    <Divider sx={{width:'80%',backgroundColor:'black',marginY:'0.8rem'}}/>
                                    <div className="user-append"><b>변경 비밀번호 : </b><TextField required helperText="8자 이상 입력하세요." size="small" name="newpasswd" id="newpasswd" type="password" label="Password" variant="outlined" style={{width:'75%',margin:'0.5rem'}}/></div>
                                    <div className="user-append"><b>변경 비밀번호 확인 : </b><TextField required size="small" name="newpasswd2" id="newpasswd2" type="password" label="Password" variant="outlined" style={{width:'75%',margin:'0.5rem'}}/></div>
                                    <Button variant="contained" type="submit" style={{width:'30%',margin:'2rem'}}>변경</Button>
                                </Box>
                            </Card>
                        {/* </div> */}
                    {/* </Paper> */}
                </Grid>
                <Grid item xs={6} ms={6} md={6} lg={6} xl={6} style={{height:'95vh', display:'flex', flexDirection:'column',padding:'1rem',alignItems:'center'}}>
                        <Card style={{width:'90%',height:'50%',marginTop:'1rem'}}>
                            <CardHeader sx={{backgroundColor:'#F5F5F5'}} title="정보 수정"/>
                            <Box component="form" onSubmit={handleChangeINFO} noValidate sx={{display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',padding:'1rem'}}>
                                <div className="user-append"><b>Email : </b><TextField size="small" id="email" type="email" name="email" label="Email" variant="outlined" style={{width:'75%',margin:'0.5rem'}}/></div>
                                <div className="user-append"><b>Phone : </b><TextField size="small" id="phone" type="phone" name="phone" label="Phone" variant="outlined" style={{width:'75%',margin:'0.5rem'}}/></div>
                                <Button variant="contained" type="submit" style={{width:'30%',margin:'2rem'}}>변경</Button>
                            </Box>
                        </Card>
                </Grid>
            </Grid>
        </div>

    )
}