import argparse, sys, os, torch
import json
import pandas as pd, numpy as np
import pickle
from numpy.linalg import norm
from etc_layer import *
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_log_error
import base64

sys.path.append('./')
nowpath = os.getcwd()

# parser = argparse.ArgumentParser()
# parser.add_argument('user_name', type=str)
# parser.add_argument('model_name', type=str)
# args = parser.parse_args()

user_name = sys.argv[1]
model_name = sys.argv[2]

dir_script = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/'
dir_input = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/.input/' #ej
dir_model_save = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/'+model_name +'_params.pth'

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))
test_dates = json.load(open(dir_input+'test_date.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
output_info = input_tmp.pop('out')
input_info = list(input_tmp.values())
dataset = model_info['input']
outseq = model_info['seqshf']['Output Sequence']

out_columns = ['%s(t+%d)'%(x,y) for x in output_info for y in range(outseq)]

dir_preprocess = nowpath+'/.user/'+user_name+'/.data/'+dataset+'/'

# #Create list_inps and outputs
# test = pd.read_csv(dir_input + 'test.csv', encoding='UTF-8',index_col=1)
# test_dates = test.index
# test_list_inps = []
# for inp in input_info:
#     test_list_inps.append(torch.tensor(test[inp].values, dtype= torch.float32))
# # test_y = torch.tensor(test[output_info].values, dtype= torch.float32)    
# test_y = test[output_info].to_numpy()    

test_list_inps = torch.load(dir_input + 'test_list_inps.pt')
test_y = torch.load(dir_input + 'test_y.pt').data.detach().cpu().numpy()

# 모델  매개변수 불러오기
f = open(dir_script+model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(model_name+'_load ='+model_name+'(test_list_inps)')
exec('%s_load.load_state_dict(torch.load(dir_model_save), strict=False)'%model_name)


# Generate prediction on the test data
exec('test_yhat = ' +model_name+ '_load(test_list_inps).data.detach().cpu().numpy()')

scaler_save = f"{dir_preprocess}/*{output_info}*.pkl"
# if scaler_save.os.path.is_file():
if os.path.isfile(scaler_save):
    load_scaler = load(open(scaler_save, 'rb'))
    test_yhat = load_scaler.inverse_transform(test_yhat)
# if min(test_y) >= 0:
test_yhat[test_yhat < 0] = 0


# print(test_y.shape)

# # #Evaluation metrics
test_Cos_sim = np.round(np.dot(test_y.reshape(-1), test_yhat.reshape(-1))/(norm(test_y.reshape(-1))*norm(test_yhat.reshape(-1))),3) #scale -1~1
test_MAPE = np.round(mean_absolute_percentage_error(test_y, test_yhat),2)
test_RMSLE = np.round(np.sqrt(mean_squared_log_error(test_y, test_yhat)),1)

# test_yhat = pd.DataFrame(test_yhat, index = test_dates, columns=output_info)
test_yhat = pd.DataFrame(test_yhat, columns=out_columns)
test_yhat.index = test_dates
# print(test_yhat)
# test_yhat.to_csv(dir_input + 'test_yhat.csv', encoding='UTF-8')
test_y = pd.DataFrame(test_y, columns=out_columns)
test_y.index = test_dates
print(json.dumps({
    'test_yhat':test_yhat.to_dict(),
    'test_y':test_y.to_dict(),
    'Cos_sim':test_Cos_sim.tolist(), 
    'MAPE':test_MAPE.tolist(),
    'RMSLE':test_RMSLE.tolist(),},
    separators=(',', ':')))
# # 한글 출력, ascii 없애기