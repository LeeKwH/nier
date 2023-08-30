import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
import pandas as pd
import numpy as np
from numpy.linalg import norm

from engine import mainmodel as MM
from engine import list_lr
from engine import pretools, premodel
from engine import core as C
import json,sys, os
from torch.utils.tensorboard import SummaryWriter

sys.path.append('./')
nowpath = os.getcwd()

# user_name = sys.argv[1]
# model_name = sys.argv[2]
user_name = 'nier'
model_name = 'model_test'
dir_script = f'{nowpath}/.user/{user_name}/.model/{model_name}/'
dir_model_save = f'{nowpath}/.user/{user_name}/.model/{model_name}/{model_name}_params.pth'
modelinfo = json.load(open(dir_script+'modelinfo.json', encoding='UTF8'))
layerinfo = json.load(open(dir_script+'layerinfo.json', encoding='UTF8'))

cols = layerinfo['cols']
mers = layerinfo['mers']

seqshf = modelinfo['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']

x_inputs = modelinfo['variable']['1']
y_targets = modelinfo['variable']['out']

tmp_learn_config = json.load(open(dir_script+'trainconfig.json','r', encoding="UTF-8"))
learn_config = json.load(open(dir_script+'trainconfig.json','r', encoding="UTF-8"))
train_ratio = tmp_learn_config['Train ratio']/10
valid_ratio = tmp_learn_config['Validation ratio']/10

dir_source = f'{nowpath}/.user/{user_name}/.data/'+modelinfo['input']+'/'+modelinfo['input']+'.csv'
dir_input = nowpath+'/.user/'+user_name+'/.model/'+model_name+'/.input/'
dir_log = nowpath+'/.share/.log/'+user_name+'-'+model_name
writer = SummaryWriter(dir_log)

rawdata = pretools.get_rawtrn(path=dir_source, encoding='UTF-8',indexcol='date')

raw_index = rawdata.index

inputs = rawdata[x_inputs].shift(-Inshift)
target = rawdata[y_targets].shift(-Outshift)

inputs = premodel.create_dataset(data = inputs, n_in=Inseq, n_out=1, dropnan=False).bfill().ffill()

target = target.loc[inputs.index]
# Test Dates save
test_dates = target.index

target = premodel.create_dataset(data=target, n_in=0, n_out=Outseq,dropnan=False).bfill().ffill()

print('inputs', inputs)
print('inputs shape', inputs.shape)
# 1d
input1d = inputs.values.reshape(inputs.shape[0],inputs.shape[1])
# 2d
input2d = inputs.values.reshape(inputs.shape[0],Inseq+1,len(x_inputs))
target = target.values.reshape(target.shape[0], Outseq)

#Split into train/val/test
train_number = round(target.shape[0]*train_ratio)
valid_number = round(target.shape[0]*valid_ratio)+train_number

test_date = test_dates[valid_number+1:].astype(str)

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


if mers:
    datas = {
        'cols' : cols,
        'mers' : mers
    }
    model = MM.MergeModel(datas,7,device)
    M_data ={
        'train_inputs':[],
        'train_target':None,
        'test_inputs':[],
        'test_target':None,
        'val_inputs':[],
        'val_target':None
    }
    for idx,inp in enumerate(Merge_input):
        train_inputs, train_target = inp[:train_number], target[:train_number]
        val_inputs, val_target = inp[train_number+1:valid_number],target[train_number+1:valid_number]
        test_inputs, test_target = inp[valid_number+1:], target[valid_number+1:]

        
        M_data['train_inputs'].append(torch.Tensor(train_inputs).to(device))
        M_data['test_inputs'].append(torch.Tensor(test_inputs).to(device))
        M_data['val_inputs'].append(torch.Tensor(val_inputs).to(device))
        
        if idx ==0:
            M_data['train_target'] = torch.Tensor(train_target).long().to(device)
            M_data['val_target']   = torch.Tensor(val_target).long().to(device)
            M_data['test_target']  = torch.Tensor(test_target).long().to(device)

    train_dataset = TensorDataset(*M_data['train_inputs'], M_data['train_target'])
    val_dataset   = TensorDataset(*M_data['val_inputs'], M_data['val_target'])
    test_dataset  = TensorDataset(*M_data['test_inputs'], M_data['test_target'])


else:
    # ref model
    if datas[0]['type'] in list_lr.list_lr_guide:
        model = C.AttentionLSTM(datas[0]['in'],Outseq).to(device)
    else:
        model = MM.MainModel(datas,7).to(device)
    print('train_number', train_number)
    print('valid_number', valid_number)
    print('inputs', inputs)
    print('inputs len', len(inputs))
    train_inputs, train_target = inputs[:train_number], target[:train_number]
    val_inputs, val_target = inputs[train_number+1:valid_number],target[train_number+1:valid_number]
    test_inputs, test_target = inputs[valid_number+1:], target[valid_number+1:]

    train_inputs = torch.Tensor(train_inputs).to(device)
    train_target = torch.Tensor(train_target).long().to(device)
    val_inputs   = torch.Tensor(val_inputs).to(device)
    val_target   = torch.Tensor(val_target).long().to(device)
    test_inputs  = torch.Tensor(test_inputs).to(device)
    test_target  = torch.Tensor(test_target).long().to(device)

    # generate dataset
    train_dataset = TensorDataset(train_inputs, train_target)
    val_dataset   = TensorDataset(val_inputs, val_target)
    print('val_dataset', len(val_dataset))
    test_dataset  = TensorDataset(test_inputs, test_target)


batch_size = 32
train_dataloader = DataLoader(train_dataset, batch_size=batch_size, shuffle=False)
val_dataloader   = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
test_dataloader  = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

# define loss and optimizer
exec('criterion = nn.{}Loss()'.format(learn_config['loss function']))
print('model', model)
exec('optimizer = torch.optim.{0}(model.parameters(), lr={1})'.format(learn_config['optimizer'],learn_config['learning rate']))

num_epochs = learn_config['epoch']
print('num_epochs', num_epochs)
with open(dir_script+'log.txt', "w") as f:
    for epoch in range(num_epochs):
        model.train()

        if mers:
            for batch_data in train_dataloader:
                # convert batch to tensor
                batch_targets = batch_data[-1].to(device)
                # update weights and biases with backprop
                optimizer.zero_grad()
                # run forward pass
                outputs = model(batch_data[:-1])
                # calculate loss
                loss = criterion(outputs, batch_targets.float())
                loss.backward()
                optimizer.step()

            # calculate validation loss
            val_loss = 0.0
            # switch to evaluation mode
            model.eval()  
            with torch.no_grad():
                for val_data in val_dataloader:
                    val_targets = val_data[-1].to(device)
                    val_outputs = model(val_data[:-1])
                    val_loss += criterion(val_outputs, val_targets).item()
            val_loss /= len(val_dataloader)


        else:
            for batch_inputs, batch_targets in train_dataloader:
                # convert batch to tensor
                batch_targets = batch_targets.to(device)
                # update weights and biases with backprop
                optimizer.zero_grad()
                # run forward pass
                outputs = model(batch_inputs)
                # calculate loss
                loss = criterion(outputs, batch_targets.float())
                loss.backward()
                optimizer.step()

            # calculate validation loss
            val_loss = 0.0
            # switch to evaluation mode
            model.eval()  
            with torch.no_grad():
                for val_inputs, val_targets in val_dataloader:
                    val_targets = val_targets.to(device)
                    val_outputs = model(val_inputs)
                    val_loss += criterion(val_outputs, val_targets).item()
            val_loss /= len(val_dataloader)

        writer.add_scalar('Loss/train',loss.item(),epoch)
        f.write(f'Epoch: {epoch}, train_loss: {loss.item():.4f}, val_loss: {val_loss:.4f} \n')
        if epoch == 0:
            best_val_loss = val_loss
        if val_loss<=best_val_loss:
            torch.save(model.state_dict(),open(dir_model_save,'wb'))
            best_val_loss = val_loss
    f.write('Learning completed')

y_true = pd.DataFrame()
y_pred = pd.DataFrame()

# Test
out_columns = ['%s(t+%d)'%(x,y) for x in y_targets for y in range(Outseq)]
model.eval()
if mers:
    with torch.no_grad():
        for test_data in test_dataloader:
            test_targets = test_data[-1].to(device)
            test_outputs = model(test_data[:-1])
            test_outputs[test_outputs<0] = 0
            test_out = pd.DataFrame(test_outputs.cpu().numpy(),columns=out_columns)
            test_in = pd.DataFrame(test_targets.cpu().numpy(),columns=out_columns)
            y_true = pd.concat([y_true,test_in],ignore_index=True)
            y_pred = pd.concat([y_pred,test_out],ignore_index=True)

else:
    with torch.no_grad():
        for test_inputs, test_targets in test_dataloader:
            # test_inputs = test_inputs.transpose(1, 2)
            test_outputs = model(test_inputs)
            test_outputs[test_outputs<0] = 0
            test_out = pd.DataFrame(test_outputs.cpu().numpy(),columns=out_columns)
            test_in = pd.DataFrame(test_targets.cpu().numpy(),columns=out_columns)
            y_true = pd.concat([y_true,test_in],ignore_index=True)
            y_pred = pd.concat([y_pred,test_out],ignore_index=True)

y_pred.index = test_date
y_true.index = test_date

y_eval = y_pred.to_numpy()
y_eval_true = y_true.to_numpy()

#Evaluation metrics
norm_y_eval_true = norm(y_eval_true.reshape(-1))
norm_y_eval = norm(y_eval.reshape(-1))
if norm_y_eval_true == 0 or norm_y_eval == 0:
    test_Cos_sim = 0.0  # 두 벡터 중 하나의 크기가 0인 경우 코사인 유사도는 0으로 설정
else:
    test_Cos_sim = np.round(np.dot(y_eval_true.reshape(-1), y_eval.reshape(-1))/(norm(y_eval_true.reshape(-1))*norm(y_eval.reshape(-1))),3) #scale -1~1
test_MAPE = np.round(mean_absolute_percentage_error(y_eval_true, y_eval),2)
test_RMSE = np.round(np.sqrt(mean_squared_error(y_eval_true, y_eval)),1)

with open(dir_script+'calresult.json', 'w') as f:
    json.dump({"MAPE":test_MAPE, "RMSE":test_RMSE, "Cos_sim":test_Cos_sim},f)

with open(dir_script+'testresult.json', 'w', encoding='utf-8') as f:
    json.dump({"test_yhat":y_pred.to_dict(), "test_y":y_true.to_dict(),'date':test_date.to_list(),'len':len(test_date)},f, ensure_ascii=False)

#Save the state
with open(dir_script+'status.config', 'w') as f:
    f.write('done')