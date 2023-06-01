import React from "react";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Database from './subEngine/Database';
import Preprocessing from './subEngine/Preprocessing';
// import Models from './subEngine/Models';

import { StateProvider,StateContext } from "../context/Manage";
import { useState,useContext } from "react";
export default function Engine(){

    // const [test,settest] = useState('');
    // const {isApplyDB,isApplyP} = useContext(StateContext);
    
    // const handleChangePage=(event)=>{
    //     console.log(isApplyDB)
    //     // if(event === 'preprocessing')
    //     // isApplyDB?settest(event):alert('Database 탭의 Apply 버튼을 눌러주세요.');
    //     // else if(event === 'models')
    //     //     isApplyP?settest(event):alert('Preprocessing 탭의 Apply 버튼을 눌러주세요.');
    // }
    // console.log(isApplyDB);

    return( 
    <StateProvider>
            <div style={{width:'100%'}}>
                <Tabs
                    defaultActiveKey="database"
                    id="fill-tab-example"
                    className="project-tab"
                    // onSelect={handleChangePage}
                    fill
                >
                    <Tab eventKey="database" title="Database">
                        <Database />
                    </Tab>
                    <Tab eventKey="preprocessing" title="Dataprocessing">
                        {/* {isApplyDB&&<Preprocessing />} */}
                        <Preprocessing />
                    </Tab>
                    {/* <Tab eventKey="models" title="Models">
                        <Models />
                    </Tab> */}
                </Tabs>
            </div>
    </StateProvider>
    )
}