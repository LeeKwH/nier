import argparse, sys, os, torch
import json
import pandas as pd, numpy as np
import pickle
from numpy.linalg import norm
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_log_error

sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
args = parser.parse_args()

dir_preprocess = nowpath+'/.user/'+args.user_name+'/.data/.preprocessing'
dir_script = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/script/'+args.model_name
dir_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.input/'######230328
dir_model_save = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'+args.model_name +'_params.pth'

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
output_info = input_tmp.pop('out')
input_info = list(input_tmp.values())


#Create list_inps and outputs
'''
test = pd.read_csv(dir_input + '_test.csv', encoding='UTF-8',index_col=0)
test_dates = test.index
test_list_inps = []
for inp in input_info:
    test_list_inps.append(torch.tensor(test[inp].values, dtype= torch.float32))
    
test_y = test[output_info].to_numpy()  
'''
test_list_inps = torch.load(dir_input + 'test_list_inps.pt')
test_y = torch.load(dir_input + 'test_y.pt').data.detach().cpu().numpy()

# 모델  매개변수 불러오기
f = open(dir_script+args.model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(args.model_name+'_load ='+args.model_name+'(test_list_inps)')
exec('%s_load.load_state_dict(torch.load(+dir_model_save), strict=False)'%args.model_name)


# Generate prediction on the test data
exec('test_yhat = ' +args.model_name+ '_load(test_list_inps).data.detach().cpu().numpy()')

scaler_save = f"{dir_preprocess}/scaler/*{output_info}*.pkl"
if scaler_save.is_file():
    load_scaler = load(open(scaler_save, 'rb'))
    test_yhat = load_scaler.inverse_transform(test_yhat)
if min(test_y) >= 0:
    test_yhat[test_yhat < 0] = 0


#Evaluation metrics
test_Cos_sim = np.round(np.dot(test_y.reshape(-1), test_yhat.reshape(-1))/(norm(test_y.reshape(-1))*norm(test_yhat.reshape(-1))),3) #scale -1~1
test_MAPE = np.round(mean_absolute_percentage_error(test_y, test_yhat),2)
test_RMSLE = np.round(np.sqrt(mean_squared_log_error(test_y, test_yhat)),1)


#프론트 반환
test_yhat = pd.DataFrame(test_yhat, index = test_dates, columns = output_info)
test_y = pd.DataFrame(test_y, index = test_dates, columns = output_info)
print(json.dumps({
    'test_yhat':test_yhat.to_dict('records'),
    'test_y':test_y.to_dict('records'),
    'Cos_sim':test_Cos_sim, 
    'MAPE':test_MAPE,
    'RMSLE':test_RMSLE},
    ensure_ascii=False ,separators=(',', ':')))