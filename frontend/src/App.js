import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import  { BrowserRouter, Route, Routes ,Redirect} from "react-router-dom";
import Login from './components/Login';
import MainPage from './components/MainPage';
import { withCookies, useCookies } from 'react-cookie';
import { useEffect, useState } from 'react';

function App() {

  const [cookie, setCookie, removeCookie] = useCookies(['reftoken']);
  const [hasCookie, setHasCookie] = useState(false);

  useEffect(() => {
    if(cookie.reftoken && cookie.reftoken !== 'undefined'){
      setHasCookie(true);
      console.log('cookie',cookie);
    }else{
      setHasCookie(false);
    }
  },[cookie.reftoken]);

  return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={hasCookie?<MainPage/>:<Login/>}/>
                <Route path='/login' element={<Login/>}/>
                <Route path='*' element={<>Not found</>}/>
            </Routes>
        </BrowserRouter>
  );
}

export default App;