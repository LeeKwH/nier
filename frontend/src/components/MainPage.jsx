import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { Fragment, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import ListItemIcon from '@mui/material/ListItemIcon';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SsidChartRoundedIcon from '@mui/icons-material/SsidChartRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ModelTrainingRoundedIcon from '@mui/icons-material/ModelTrainingRounded';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useCookies } from 'react-cookie';

import { useState } from 'react';

import pages from "./subpage";


const drawerWidth = 240;
const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
    })(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
        }),
    }),
    }));
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
({ theme, open }) => ({
    '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: 'border-box',
    ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
        width: theme.spacing(9),
        },
    }),
    },
}),
);
const mdTheme = createTheme();

export default function MainPage(){
    const [cookie, setCookie, removeCookie] = useCookies(['name']);
    const [userName, setUserName] = useState("");
    // const jupyter_path = `http://10.27.1.105:8889/tree/${cookie.id}`;
    // const board_path = 'http://10.27.1.105:6006';
    // NIER변경
    const jupyter_path = `http://localhost:8889/tree/${cookie.id}`
    const board_path = 'http://localhost:6006';

    useEffect(() => {
        if(cookie.name&&cookie.name !== undefined){
            setUserName(cookie.name);
        }else{
            setUserName("Guest");
        }
    }, [cookie.name]);


    // pagenation
    const [selectedIndex, setSelectedIndex] = useState(0);
    const SubpageNow = pages[selectedIndex];
    const handleListItemClick = (event, index) => {
        setSelectedIndex(index);
    };

    // side bar
    const [open, setOpen] = useState(true);
    const toggleDrawer = () => {
        setOpen(!open);
    };

    // log
    const [anchorEl, setAnchorEl] = useState(null);
    const logopen = Boolean(anchorEl);
    const handlelogClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handlelogClose = () => {
        setAnchorEl(null);
    };
    const handlelogout = (event) =>{
        //logout event
        removeCookie('name');
        removeCookie('reftoken');
        removeCookie('id');
        setAnchorEl(null);
        // window.location.href = '/';
        fetch('/api/auth/logout', {
            method: 'GET',
            credentials: 'include',
        })
        .then((res) => {
            if(res.redirected){
                return window.location.replace(res.url);
            }
        })
        .catch((err) => {
            alert(`로그아웃에 실패했습니다. ${err}`);
        });
    }

    return(
        <ThemeProvider theme={mdTheme}>
            <Box sx={{ display: 'flex' }}>
                <CssBaseline />
                <AppBar className='nav-bar' position="absolute" open={open}>
                <Toolbar
                    sx={{
                    pr: '24px', // keep right padding when drawer closed
                    }}
                >
                    <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="open drawer"
                    onClick={toggleDrawer}
                    sx={{
                        marginRight: '36px',
                        ...(open && { display: 'none' }),
                    }}
                    >
                    <MenuIcon />
                    </IconButton>
                    <Typography
                    component="h1"
                    variant="h6"
                    color="inherit"
                    noWrap
                    sx={{ flexGrow: 1, fontFamily:"BasicEB" }}
                    >
                    물환경 정보시스템 AI 플랫폼
                    </Typography>
                    <Button
                        id="log-button"
                        className='log-button'
                        aria-haspopup='true'
                        aria-controls={logopen?'log-menu':undefined}
                        onClick={handlelogClick}
                    >
                        <PersonRoundedIcon style={{marginRight:"0.5rem"}}/>
                        <span className='user-name'> {userName}</span>
                    </Button>
                    <Menu
                        id="log-menu"
                        anchorEl={anchorEl}
                        open={logopen}
                        onClose={handlelogClose}
                        MenuListProps={{
                        'aria-labelledby': 'log-button',
                        }}
                    >
                        <MenuItem onClick={(event)=>handlelogout(event)}>Logout</MenuItem>
                    </Menu>
                </Toolbar>
                </AppBar>
                <Drawer variant="permanent" open={open}>
                <Toolbar
                    className='side-bar'
                    sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    px: [1],
                    }}
                >
                    <IconButton onClick={toggleDrawer}>
                    <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <Divider />
                <List className='side-bar' component="nav">
                    <Fragment>
                        <Divider sx={{ my: 3, backgroundColor:'#fff', height:'1px', width:'90%', marginLeft:'5%' }} />
                        <ListItemButton selected={selectedIndex === 0} onClick={(event) => handleListItemClick(event, 0)}>
                        <ListItemIcon>
                            <HomeRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Home" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 1} onClick={(event) => handleListItemClick(event, 1)}>
                        <ListItemIcon>
                            <BarChartIcon />
                        </ListItemIcon>
                        <ListItemText primary="Data" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 6} onClick={(event) => handleListItemClick(event, 6)}>
                        <ListItemIcon>
                            <DashboardRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Model" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 5} onClick={(event) => handleListItemClick(event, 5)}>
                        <ListItemIcon>
                            <ModelTrainingRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Train" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 4} onClick={(event) => handleListItemClick(event, 4)}>
                        <ListItemIcon>
                            <SsidChartRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Forecast" />
                        </ListItemButton>
                        <Divider sx={{ my: 3, backgroundColor:'#fff', height:'1px', width:'90%', marginLeft:'5%' }} />
                        <ListItemButton selected={selectedIndex === 2} onClick={(event) => handleListItemClick(event, 2)}>
                        <ListItemIcon>
                            <PersonRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="User" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 3} onClick={(event) => handleListItemClick(event, 3)}>
                        <ListItemIcon>
                            <SettingsRoundedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Setting" />
                        </ListItemButton>
                        <Divider sx={{ my: 3, backgroundColor:'#fff', height:'1px', width:'90%', marginLeft:'5%' }} />
                        <ListItemButton selected={selectedIndex === 7} onClick={(event) => {handleListItemClick(event, 7); window.open(jupyter_path)}}>
                        <ListItemIcon>
                            <AutoStoriesIcon />
                        </ListItemIcon>
                        <ListItemText primary="Notebook" />
                        </ListItemButton>
                        <ListItemButton selected={selectedIndex === 8} onClick={(event) => {handleListItemClick(event, 8); window.open(board_path)}}>
                        <ListItemIcon>
                            <TableChartIcon />
                        </ListItemIcon>
                        <ListItemText primary="Tensorboard" />
                        </ListItemButton>
                    </Fragment>
                </List>
                </Drawer>
                <Box
                component="main"
                sx={{
                    backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                        ? theme.palette.grey[100]
                        : theme.palette.grey[900],
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',
                }}
                >
                <Toolbar />
                <div className="under-right">{SubpageNow}</div>
                </Box>
            </Box>
        </ThemeProvider>

    )
}