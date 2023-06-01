import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme();

export default function Login() {

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // console.log({
    //   id: data.get('id'),
    //   password: data.get('password'),
    // });
    const id = data.get('id');
    const password = data.get('password');
    if (id === '' || password === '') {
      alert('아이디와 비밀번호를 입력해주세요.');
    }
    else {
      fetch(`/api/auth/login`, {  // 로그인 요청
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: id,
            password: password,
            }),
            })
            .then((res) => res.json())
            .then((res) => {
              if (res.result === 'success') {
                console.log(res.token);
                window.location.href = '/';
              } else {
                  alert(`로그인 실패 : ${res.error}`);
              }
                  })
    };
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ width:'100vw',height: '100vh' }}>
        <CssBaseline />
        <Grid
          item
          xs={false}
          sm={9}
          md={9}
          sx={{
            backgroundImage: 'url(img/login_img.jpg)',
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}>
        <div className="login-header">
            <b>NIER </b>
            <span>AI Platform</span>
        </div>
      </Grid>
        
        <Grid item xs={12} sm={3} md={3} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop:'50%'
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'lightgray' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Sign in
            </Typography>
            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="id"
                label="ID"
                name="id"
                autoComplete="id"
                autoFocus
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
              />
              
              <Button
                className='signin-btn'
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, }}
              >
                Sign in
              </Button>
              {/* <Grid container> */}
                <Grid item>
                </Grid>
              {/* </Grid> */}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}
