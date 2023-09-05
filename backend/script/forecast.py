import pandas as pd
import numpy as np
from functools import reduce
import json, glob,pickle
import pandas as pd, numpy as np
import psycopg2 as psql
from engine import pretools, premodel
from engine import list_lr
from engine import mainmodel as MM
from engine import core as C
import oracledb
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from processingForecast import *
from datetime import datetime, timedelta
import attr_mapping_info

from engine.core import AttentionLSTM, EarlyStopping
import os

nowpath = os.getcwd()
sys.path.append(nowpath)

user_name = sys.argv[1]
model_name = sys.argv[2]
start_date = sys.argv[3]
end_date = sys.argv[4]

# 오라클 DB
oracledb.init_oracle_client(lib_dir="C:\\instantclient_11_2")

username="WATER"
userpwd = "Innopost7557*"
host = "172.30.1.95"
port = 1521
service_name = "system"

dsn = f'{username}/{userpwd}@{host}:{port}/{service_name}'
connection = oracledb.connect(dsn)

start_date = datetime.strptime(start_date, '%Y-%m-%d')
end_date = datetime.strptime(end_date, '%Y-%m-%d')

formatted_start_date = start_date.strftime("%Y%m%d")
formatted_end_date = end_date.strftime("%Y%m%d")

dir_script = f'{nowpath}/.user/{user_name}/.model/{model_name}/'
modelinfo = json.load(open(dir_script+'modelinfo.json', encoding='UTF8'))
layerinfo = json.load(open(dir_script+'layerinfo.json', encoding='UTF8'))

cols = layerinfo['cols']
mers = layerinfo['mers']

# allVariables: [ '수질-광동댐-수온', '수질-광동댐-DO', '수질-광동댐-BOD', '수질-광동댐-COD' ]
variables = modelinfo['allVariables']
y_targets = modelinfo['variable']['out'] #아웃풋명
x_inputs = modelinfo['variable']['1']
dataset = modelinfo['input']
seqshf = modelinfo['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']


out_columns = ['%s(t+%d)'%(x,y) for x in y_targets for y in range(Outseq)]

dir_preprocess = f'{nowpath}/.user/{user_name}/.data/{dataset}/' #process 정보

attr_data = attr_mapping_info.get_data()

#Get data during the forecast period
collection = []
use_var =[]

for var in variables:
    category, site, item = var.split('-') #지금 psql조회는 지점명(파일명)으로 하기때문에 중복지점명 있을경우 오류발생
    use_var.append(category+'_'+site+'_'+item)
    if item in ['수온', 'DO', '투명도']:
        if category == '조류': item = f'조류_{item}'
    if item in ['유량']:
        if category == '유량': item = f'유량_{item}'

    vals = attr_data[item]
    if category=='수질':
        table = 'V_MSR_WQMN_DAY'
        sql = f"""
        SELECT TO_DATE(WTRSMPLE_DE, 'YYYY-MM-DD') as D, {vals} 
        FROM {table}
        WHERE TO_DATE(WTRSMPLE_DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND WQMN_NM = '{site}'
        ORDER BY WTRSMPLE_DE
        """
    elif category=='수위':
        table = 'V_FLU_WLV_DAY'
        sql = f"""
        SELECT TO_DATE(OBSR_DE, 'YYYY-MM-DD') as D, {vals}
        FROM {table}
        WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND OBSRVT_NM = '{site}'
        ORDER BY OBSR_DE
        """
    elif category=='강수량':
        table = 'V_FLU_GDWETHER_DAY'
        sql = f"""
        SELECT TO_DATE(OBSR_DE, 'YYYY-MM-DD') as D, {vals}
        FROM {table}
        WHERE TO_DATE(OBSR_DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND OBSRVT_NM = '{site}'
        ORDER BY OBSR_DE
        """
    elif category=='댐':
        table = 'V_FLU_DAM_DAY'
        sql = f"""
        SELECT TO_DATE(YEAR || MT || DE, 'YYYY-MM-DD') as D, {vals}
        FROM {table}
        WHERE TO_DATE(YEAR || MT || DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND OBSRVT_NM = '{site}'
        ORDER BY TO_DATE(YEAR || MT || DE, 'YYYYMMDD')
        """
    elif category=='유량':
        table = 'V_FLU_FLUX_DAY'
        sql = f"""
        SELECT TO_DATE(YEAR || MT || DE, 'YYYY-MM-DD') as D, {vals}
        FROM {table}
        WHERE TO_DATE(YEAR || MT || DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND OBSRVT_NM = '{site}'
        ORDER BY TO_DATE(YEAR || MT || DE, 'YYYYMMDD')
        """
    elif category=='조류':
        table = 'V_MSR_SWMN_DAY'
        sql = f"""
        SELECT TO_DATE(CHCK_DE, 'YYYY-MM-DD') as D, {vals}
        FROM {table}
        WHERE TO_DATE(CHCK_DE, 'YYYYMMDD') BETWEEN TO_DATE({formatted_start_date}, 'YYYYMMDD') AND TO_DATE({formatted_end_date}, 'YYYYMMDD') AND SWMN_NM || '(' || SWMN_DETAIL_NM || ')'= '{site}'
        ORDER BY CHCK_DE
        """
    current_db = connection
    var_df = pd.read_sql_query(sql, connection)
    var_df.rename(columns={'D':'date'}, inplace = True)
    item = item.replace('조류_', '').replace('유량_', '')
    var_df.columns = ['date'] + [category+'_'+site +'_'+item]
    var_df[var_df.columns[0]] = pd.DatetimeIndex(var_df[var_df.columns[0]])
    var_df = var_df.set_index(var_df[var_df.columns[0]])
    var_df = var_df.drop(var_df.columns[0],axis=1)
    collection.append(var_df)
df = reduce(lambda left,right: pd.merge(left,right,on=['date'], how='outer'),collection).sort_index()
forecast = df.loc[start_date-timedelta(days=30):end_date]
# forecast_y = df[output_info].loc[start_date:end_date]
forecast_y = forecast[y_targets]

process_info = json.load(open(dir_preprocess+dataset+'_pre.json','r', encoding="UTF-8"))
# => [{"var":["수질_광동댐_수온","수질_광동댐_DO","수질_광동댐_BOD","수질_광동댐_COD"],"function":"dropna","method":"all","attributes":""}]


for trial in process_info:
    if trial['function'] != 'Scaling' and trial['function'] != 'dropna':
        varList = list(set(trial['var']) & set(use_var))
        df_sel = forecast[varList]
        df_remain = forecast.drop(varList, axis=1)
        # if trial['attributes'] is not None: exec('df_tran = processingForecast.%s(df_sel,%s,%s)'%(trial['function'],trial['method'],trial['attributes']))
        if trial['attributes'] is not None: exec("df_tran = %s(df_sel,'%s',%s)"%(trial['function'],trial['method'],trial['attributes']))
        # else : exec('df_tran = processingForecast.%s(df_sel,%s)'%(trial['function'],trial['method']))
        else : exec('df_tran = %s(df_sel,%s)'%(trial['function'],trial['method']))
        forecast = pd.concat([df_tran,df_remain],axis=1,join='inner')#select columns의 dropna 후 길이에 맞춰 remain df 자름

forecast_dates = forecast.index.astype(str)

scaler_save = f"{dir_preprocess}/*.pkl"    #scaler_save = '***-조류_공산지_anabaena-조류_공산지_microcystis-.pkl'
if os.path.isfile(scaler_save):
    for scaler_save in glob.glob(dir_preprocess + '*.pkl'):    
        load_scaler = pickle.load(open(scaler_save, 'rb'))
        df_sel = forecast[scaler_save.split('-')[1:-1]]
        df_tran = load_scaler.transform(df_sel)
        forecast[scaler_save.split('-')[1:-1]] = df_tran

inputs = forecast[x_inputs]
inputs = premodel.create_dataset(data=inputs,n_in=Inseq, n_out=1, dropnan=False).bfill().ffill()

targets = premodel.create_dataset(data=forecast_y,n_in=0,n_out=Outseq,dropnan=False).bfill().ffill()

# 1d
input1d = inputs.values.reshape(inputs.shape[0],inputs.shape[1])
# 2d
input2d = inputs.values.reshape(inputs.shape[0],Inseq+1,len(x_inputs))
target = targets.values.reshape(targets.shape[0], Outseq)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# MergeModel
Merge_input = []
if mers:
    for col in list(cols.values()):
        if col[0]['type']in list_lr.list_lr_2d:
            Merge_input.append(input2d)
            if col[0]['type']in list_lr.list_lr_order:
                col[0]['in'] = input2d.shape[2]
            else:
                col[0]['in'] = input2d.shape[1]
        else:
            Merge_input.append(input1d)
            col[0]['in'] = input1d.shape[1]

else:
    datas = list(cols.values())[0]
    if datas[0]['type'] in list_lr.list_lr_2d:
        inputs = input2d
        if datas[0]['type']in list_lr.list_lr_order:
            datas[0]['in'] = input2d.shape[2]
        else:
            datas[0]['in'] = input2d.shape[1]
    # Model is ref model
    elif datas[0]['type'] in list_lr.list_lr_guide:
        inputs = input2d
        datas[0]['in'] = input2d.shape[2]
    else:
        inputs = input1d
        datas[0]['in'] = input1d.shape[1]


# Model make
if mers:
    datas = {
        'cols' : cols,
        'mers' : mers
    }
    model = MM.MergeModel(datas,7,device)
    M_data ={
        'inputs':[],
        'target':None,
    }
    for idx,inp in enumerate(Merge_input):
        
        M_data['inputs'].append(torch.Tensor(inp).to(device))
        
        if idx ==0:
            M_data['target'] = torch.Tensor(target).long().to(device)

    datasets = TensorDataset(*M_data['inputs'], M_data['target'])


else:
    # ref model
    if datas[0]['type'] in list_lr.list_lr_guide:
        model = C.AttentionLSTM(datas[0]['in'],Outseq).to(device)
    else:
        model = MM.MainModel(datas,7).to(device)

    inputs = torch.Tensor(inputs).to(device)
    target = torch.Tensor(target).long().to(device)

    # generate dataset
    datasets = TensorDataset(inputs, target)

batch_size = 32
D_loader = DataLoader(datasets,batch_size=batch_size,shuffle=False)

model.load_state_dict(torch.load(f'{dir_script}{model_name}_params.pth'),strict=False)


y_true = pd.DataFrame()
y_pred = pd.DataFrame()

model.eval()

if mers:
    with torch.no_grad():
        for test_data in D_loader:
            test_targets = test_data[-1].to(device)
            test_outputs = model(test_data[:-1])
            test_outputs[test_outputs<0] = 0
            test_out = pd.DataFrame(test_outputs.cpu().numpy(),columns=out_columns)
            test_in = pd.DataFrame(test_targets.cpu().numpy(),columns=out_columns)
            y_true = pd.concat([y_true,test_in],ignore_index=True)
            y_pred = pd.concat([y_pred,test_out],ignore_index=True)

else:
    with torch.no_grad():
        for test_inputs, test_targets in D_loader:
            # test_inputs = test_inputs.transpose(1, 2)
            test_outputs = model(test_inputs)
            test_outputs[test_outputs<0] = 0
            test_out = pd.DataFrame(test_outputs.cpu().numpy(),columns=out_columns)
            test_in = pd.DataFrame(test_targets.cpu().numpy(),columns=out_columns)
            y_true = pd.concat([y_true,test_in],ignore_index=True)
            y_pred = pd.concat([y_pred,test_out],ignore_index=True)


y_pred.index = forecast_dates
y_true.index = forecast_dates

print(json.dumps({
    'forecast_yhat' : y_pred.to_dict(),
    'forecast_y' : y_true.to_dict(),
    'date':forecast_dates.to_list()
    } ,separators=(',', ':')))