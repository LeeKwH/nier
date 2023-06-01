import argparse, sys, os, torch, glob
from sqlalchemy import create_engine
from functools import reduce
import json
import pandas as pd, numpy as np
import pickle
import psycopg2 as psql
from numpy.linalg import norm
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_log_error
from processingForecast import *
from datetime import datetime, timedelta
from dateutil.rrule import rrule, DAILY
from etc_layer import *
from list_lr import *

nowpath = os.getcwd()
sys.path.append(nowpath)
psql_db = psql.connect(host='localhost',dbname='NIERDB', user='nier', password='dkdk123', port=5432)
cursor = psql_db.cursor()

user_name = sys.argv[1]
model_name = sys.argv[2]
start_date = sys.argv[3]
end_date = sys.argv[4]

start_date = datetime.strptime(start_date, '%Y-%m-%d')
end_date = datetime.strptime(end_date, '%Y-%m-%d')

dir_script = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/'
dir_input = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/.input/' #ej
dir_model_input = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/first_cols.pkl'
dir_model_save = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/'+model_name +'_params.pth'

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
variables = model_info['allVariables']
output_info = input_tmp.pop('out') #아웃풋명
input_info = list(input_tmp.values()) 
dataset = model_info['input']
seqshf = model_info['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']

out_columns = ['%s(t+%d)'%(x,y) for x in output_info for y in range(Outseq)]


dir_preprocess = nowpath+'/.user/'+user_name+'/.data/'+dataset+'/' #process 정보

#Get data during the forecast period
collection = []
use_var =[]
for var in variables:
    category, site, item = var.split('-') #지금 psql조회는 지점명(파일명)으로 하기때문에 중복지점명 있을경우 오류발생
    use_var.append(category+'_'+site+'_'+item)
    date = pd.read_sql_query(str('select "1" from "') + site+ str('" as t("1")'), psql_db)  #첫열은 DATE;  ***시간 단위는 아직 처리 불가능
    current_db = pd.read_sql_query(str('select "') + item + str('" from "') + site+'"', psql_db)
    current_db.columns  = category+'_'+site +'_'+ current_db.columns
    var_df = pd.concat([date,current_db],axis=1)   #지점별 데이터들 횡방향 붙임
    var_df.rename(columns={'1':'date'}, inplace = True)
    var_df[var_df.columns[0]] = pd.DatetimeIndex(var_df[var_df.columns[0]])
    var_df = var_df.set_index(var_df[var_df.columns[0]])
    var_df = var_df.drop(var_df.columns[0],axis=1)
    collection.append(var_df)
df = reduce(lambda left,right: pd.merge(left,right,on=['date'], how='outer'),collection).sort_index()
forecast = df.loc[start_date-timedelta(days=30):end_date]
forecast_y = df[output_info].loc[start_date:end_date]

#전처리 수행
process_info = json.load(open(dir_preprocess+dataset+'_pre.json','r', encoding="UTF-8"))
# process_info = json.load(open('D://cyj/00_project/02_algaeAI/2023/00_dev/nier/backend/.user/admin/.data/lastTest/lastTest_pre.json','r', encoding="UTF-8"))
'''수정'''
for trial in process_info:
    if trial['function'] != 'Scaling':
        varList = list(set(trial['var']) & set(use_var))
        df_sel = forecast[varList]
        df_remain = forecast.drop(varList, axis=1)
        # if trial['attributes'] is not None: exec('df_tran = processingForecast.%s(df_sel,%s,%s)'%(trial['function'],trial['method'],trial['attributes']))
        if trial['attributes'] is not None: exec("df_tran = %s(df_sel,'%s',%s)"%(trial['function'],trial['method'],trial['attributes']))
        # else : exec('df_tran = processingForecast.%s(df_sel,%s)'%(trial['function'],trial['method']))
        else : exec('df_tran = %s(df_sel,%s)'%(trial['function'],trial['method']))
        forecast = pd.concat([df_tran,df_remain],axis=1,join='inner')#select columns의 dropna 후 길이에 맞춰 remain df 자름

forecast_dates = forecast.index.astype(str)

# 위치
scaler_save = f"{dir_preprocess}/*.pkl"    #scaler_save = '***-조류_공산지_anabaena-조류_공산지_microcystis-.pkl'
if os.path.isfile(scaler_save):
    for scaler_save in glob.glob(dir_preprocess + '*.pkl'):    
        load_scaler = pickle.load(open(scaler_save, 'rb'))
        df_sel = forecast[scaler_save.split('-')[1:-1]]
        df_tran = load_scaler.transform(df_sel)
        forecast[scaler_save.split('-')[1:-1]] = df_tran

#Create list_inps
df_input = []
for inp in input_info: df_input.append(forecast[inp])


def create_dataset(data, n_in=1, n_out=1, dropnan=True):
    n_vars = 1 if type(data) is list else data.shape[1]
    df = pd.DataFrame(data)
    cols, names = list(), list()
    # input sequence (t-n, ... t-1)
    for i in range(n_in, 0, -1): 
        cols.append(df.shift(i))
        names += [('var%d(t-%d)' % (j+1, i)) for j in range(n_vars)]
    # forecast sequence (t, t+1, ... t+n)
    for i in range(0, n_out):
        cols.append(df.shift(-i))
        if i == 0:
            names += [('var%d(t)' % (j+1)) for j in range(n_vars)]
        else:
            names += [('var%d(t+%d)' % (j+1, i)) for j in range(n_vars)]
    # put it all together
    agg = pd.concat(cols, axis=1)
    agg.columns = names
    # drop rows with NaN values
    if dropnan:
        agg.dropna(axis=0, how='any', inplace=True)
    return agg


#To tensor
with open(dir_model_input, 'rb') as f:
    first_cols = pickle.load(f)
forecast_list_inps = []                                                                                                                               
for idx,inp in enumerate(df_input): #inp type: dataframe
    inp_dataset = create_dataset(inp, Inseq, 0,dropnan=False)
    x_features = inp.shape[1]
    dt_list = []
    for dt in rrule(DAILY, dtstart=start_date, until=end_date): #YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, or SECONDLY.
        if first_cols[idx] in list_lr_2d:#현재 수치형 인풋(2D)->3D전환 밖에 안됨
            forecast_list_inps.append(torch.tensor(np.vstack(inp_dataset.values).reshape(inp_dataset.shape[0],Inseq,x_features), dtype=torch.float32))
            dt_list.append(dt)
        else: 
            forecast_list_inps.append(torch.tensor(np.vstack(inp_dataset.values), dtype=torch.float32))

# 모델  매개변수 불러오기
f = open(dir_script+model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(model_name+'_load ='+model_name+'(forecast_list_inps)')
exec('%s_load.load_state_dict(torch.load(dir_model_save), strict=False)'%model_name)


# Generate prediction on the forecast data
exec('forecast_yhat = ' +model_name+ '_load(forecast_list_inps).data.detach().cpu().numpy()')

scaler_save = f"{dir_preprocess}/{'-'.join(df.columns)}.pkl"
if os.path.isfile(scaler_save):
    load_scaler = pickle.load(open(scaler_save, 'rb'))
    forecast_yhat = load_scaler.inverse_transform(forecast_yhat)
train_y = torch.load(dir_input + 'train_y.pt').data.detach().cpu().numpy()

forecast_yhat[forecast_yhat < 0] = 0

forecast_yhat = pd.DataFrame(forecast_yhat, columns = out_columns)
forecast_yhat.index = forecast_dates

loc_start = start_date.strftime('%Y-%m-%d')
loc_end = end_date.strftime('%Y-%m-%d')
forecast_yhat = forecast_yhat.loc[loc_start:loc_end]

# print(forecast_y)
# print(forecast_yhat)

forecast_yhat.index = forecast_yhat.index.astype(str)
forecast_y.index = forecast_y.index.astype(str)

#프론트 반환
print(json.dumps({
    'forecast_yhat' : forecast_yhat.to_dict(),
    'forecast_y' : forecast_y.to_dict(),
    } ,separators=(',', ':')))
# print(json.dumps(forecast_yhat.to_dict(),ensure_ascii=False ,separators=(',', ':')))
# print(json.dumps(forecast_yhat.to_dict('records'),ensure_ascii=False ,separators=(',', ':')))