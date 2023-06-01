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

sys.path.append('./')
nowpath = os.getcwd()
psql_db = psql.connect(host='10.27.1.124',dbname='NIERSYS', user='nier', password='dkdk123', port=5432)
cursor = psql_db.cursor()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('start_date', type=lambda s: datetime.strptime(s, '%Y-%m-%d'))
parser.add_argument('end_date', type=lambda s: datetime.strptime(s, '%Y-%m-%d'))

args = parser.parse_args()

dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'
dir_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.input/' #ej
dir_model_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/first_cols.pkl'
dir_model_save = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'+args.model_name +'_params.pth'

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
variables = input_tmp.values()
variables_flatten = sum(variables,[])#변수명리스트 var = '조류_공산지_anabaena'
output_info = input_tmp.pop('out') #아웃풋명
input_info = list(input_tmp.values()) 
dataset = model_info['input']


dir_preprocess = nowpath+'/.user/'+args.user_name+'/.data/'+dataset+'/' #process 정보

#Get data during the forecast period
collection = []
for var in variables_flatten:
    category, site, item = var.split('_') #지금 psql조회는 지점명(파일명)으로 하기때문에 중복지점명 있을경우 오류발생
    date = pd.read_sql_query(str('select "1" from ') + site+ str(' as t("1")'), psql_db)  #첫열은 DATE;  ***시간 단위는 아직 처리 불가능
    current_db = pd.read_sql_query(str('select ') + item + str(' from ') + site, psql_db)
    current_db.columns  = category+'_'+site +'_'+ current_db.columns
    var_df = pd.concat([date,current_db],axis=1)   #지점별 데이터들 횡방향 붙임
    var_df.rename(columns={'1':'date'}, inplace = True)
    var_df[var_df.columns[0]] = pd.DatetimeIndex(var_df[var_df.columns[0]])
    var_df = var_df.set_index(var_df[var_df.columns[0]])
    var_df = var_df.drop(var_df.columns[0],axis=1)
    collection.append(var_df)
df = reduce(lambda left,right: pd.merge(left,right,on=['date'], how='outer'),collection).sort_index()
forecast = df.loc[args.start_date-timedelta(days=30):args.end_date]

#전처리 수행
process_info = json.load(open(dir_preprocess+dataset+'_pre.json','r', encoding="UTF-8"))
'''수정'''
for trial in process_info:
    if trial['function'] != 'Scaling':
        df_sel = forecast[trial['var']]
        df_remain = forecast.drop(trial['var'], axis=1)
        # if trial['attributes'] is not None: exec('df_tran = processingForecast.%s(df_sel,%s,%s)'%(trial['function'],trial['method'],trial['attributes']))
        if trial['attributes'] is not None: exec("df_tran = %s(df_sel,'%s',%s)"%(trial['function'],trial['method'],trial['attributes']))
        # else : exec('df_tran = processingForecast.%s(df_sel,%s)'%(trial['function'],trial['method']))
        else : exec('df_tran = %s(df_sel,%s)'%(trial['function'],trial['method']))
        forecast = pd.concat([df_tran,df_remain],axis=1,join='inner')#select columns의 dropna 후 길이에 맞춰 remain df 자름

# 위치
scaler_save = f"{dir_preprocess}/*.pkl"    #scaler_save = '***-조류_공산지_anabaena-조류_공산지_microcystis-.pkl'
if os.path.isfile(scaler_save):
    for scaler_save in glob.glob(dir_preprocess + '/scaler/*.pkl'):    
        load_scaler = pickle.load(open(scaler_save, 'rb'))
        df_sel = forecast[scaler_save.split('-')[1:-1]]
        df_tran = load_scaler.transform(df_sel)
        forecast[scaler_save.split('-')[1:-1]] = df_tran

#Create list_inps
'''
forecast_list_inps = []
for inp in input_info:
    forecast_list_inps.append(torch.tensor(forecast[inp].values, dtype= torch.float32))
'''
df_input = []
for inp in input_info: df_input.append(forecast[inp])

#To tensor
with open(dir_model_input, 'rb') as f:
    first_cols = pickle.load(f)
forecast_list_inps = []                                                                                                                               ^
for (idx,inp) in df_input: #inp type: dataframe
    tensor_input = []
    dt_list = []
    for dt in rrule(DAILY, dtstart=args.start_date, until=args.end_date): #YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, or SECONDLY.
        if first_cols[idx] in list_lr_2d:#현재 수치형 인풋(2D)->3D전환 밖에 안됨
            dateperiod = inp[dt.strftime('%Y-%m-%d')-timedelta(days=sequence_num):dt.strftime('%Y-%m-%d')].values
            tensor_input.append(dateperiod)
            dt_list.append(dt)
        else: 
            datepoint = inp.loc[dt.strftime('%Y-%m-%d')-timedelta(days=sequence_num)].values
            tensor_input.append(datepoint) #transpose는 model스크립트에서 해줌, 여기선 필요x
    tensor_input = np.array(tensor_input)
    dt_list = np.array(dt_list)
    tensor_input = torch.tensor(tensor_input, dtype= torch.float32)
    forecast_list_inps.append(tensor_input)


# 모델  매개변수 불러오기
f = open(dir_script+args.model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(args.model_name+'_load ='+args.model_name+'(forecast_list_inps)')
exec('%s_load.load_state_dict(torch.load(dir_model_save), strict=False)'%args.model_name)


# Generate prediction on the forecast data
exec('forecast_yhat = ' +args.model_name+ '_load(forecast_list_inps).data.detach().cpu().numpy()')

scaler_save = f"{dir_preprocess}/{'-'.join(df.columns)}.pkl"
if os.path.isfile(scaler_save):
    load_scaler = pickle.load(open(scaler_save, 'rb'))
    forecast_yhat = load_scaler.inverse_transform(forecast_yhat)
train_y = torch.load(dir_input + 'train_y.pt').data.detach().cpu().numpy()

if min(train_y) >= 0:
    forecast_yhat[forecast_yhat < 0] = 0

forecast_yhat = pd.DataFrame(forecast_yhat, index = dt_list, columns = output_info)

#프론트 반환
print(json.dumps(forecast_yhat.to_dict(),ensure_ascii=False ,separators=(',', ':')))
# print(json.dumps(forecast_yhat.to_dict('records'),ensure_ascii=False ,separators=(',', ':')))