import argparse, sys, os, torch,pickle
import json
import numpy as np
import random, matplotlib.pyplot as plt
import pandas as pd
from torch.autograd import Variable 
from datetime import datetime, timedelta
from list_lr import *
from etc_layer import *
from torch.utils.tensorboard import SummaryWriter

sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
args = parser.parse_args()

dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))

input_tmp = model_info['variable']
input_dataset = model_info['input']
output_info = input_tmp.pop('out')
input_info = list(input_tmp.values())

dir_source = nowpath+'/.user/'+args.user_name+'/.data/'+input_dataset+'/'+input_dataset+'.csv' #processed dataset
dir_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.input/' #input폴더를 model폴더 하위에 둠
dir_model_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/first_cols.pkl'
dir_model_save = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'+args.model_name +'_params.pth'
model_save_mode = 'wb'
dir_loss = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'
dir_log = nowpath+'/.share/.log/'+args.user_name+'-'+args.model_name
writer = SummaryWriter(dir_log)

tmp_learn_config = json.load(open(dir_script+'trainconfig.json','r', encoding="UTF-8"))
learn_config = {'epoch':tmp_learn_config['epoch'],'learn_rate':tmp_learn_config['learning rate'],'device':'cpu','optim':tmp_learn_config['optimizer'],'loss_f':'torch.nn.'+tmp_learn_config['loss function']+'Loss()'}
train_ratio = tmp_learn_config['Train ratio']/10
valid_ratio = tmp_learn_config['Validation ratio']/10
device = torch.device(learn_config['device'])

# YJ
seqshf = model_info['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']

#Import whole dataframes
df = pd.read_csv(dir_source,  encoding='UTF-8',index_col='date')
df.index=pd.to_datetime(df.index, format='%Y-%m-%d')
df = df.astype('float')
df_input = []
for inp in input_info: df_input.append(df[inp]) 
# output = df[output_info].iloc[sequence_num:]

# YJ
output = df[output_info]
raw_index = output.dropna(how='any').index
output = output.interpolate(method='linear', limit=7, limit_direction='backward')
output = output.shift(-Outshift)

# YJ
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

list_inps = []
for idx,inp in enumerate(df_input): #inp type: dataframe
    inp_dataset = create_dataset(inp, Inseq, 0,dropnan=False)
    inp_dataset = inp_dataset.loc[raw_index].interpolate(method='linear',limit_direction='backward').bfill().ffill()
    x_features = inp.shape[1]
    if first_cols[idx] in list_lr_2d:
        list_inps.append(torch.tensor(np.vstack(inp_dataset.values).reshape(inp_dataset.shape[0],Inseq,x_features), dtype=torch.float32))
    else:
        list_inps.append(torch.tensor(np.vstack(inp_dataset.values), dtype=torch.float32))

outputs = create_dataset(output, 0, Outseq,dropnan=False)
outputs = outputs.loc[raw_index].interpolate(method='linear',limit_direction='backward').bfill().ffill()
test_dates = outputs.index
outputs = torch.tensor(np.vstack(outputs.values).reshape(outputs.shape[0],Outseq), dtype=torch.float32)


#Split into train/val/test
train_number = round(outputs.size()[0]*train_ratio)
valid_number = round(outputs.size()[0]*valid_ratio)+train_number

train_list_inps = []
valid_list_inps = []
test_list_inps = []

for inp in list_inps:
    train_list_inps.append(inp[:train_number])
    valid_list_inps.append(inp[train_number+1:valid_number])
    test_list_inps.append(inp[valid_number+1:])

# print(train_list_inps[0].shape)
train_y = outputs[:train_number]
valid_y = outputs[train_number+1:valid_number]
test_y = outputs[valid_number+1:]
torch.save(train_list_inps, dir_input + 'train_list_inps.pt')
torch.save(test_list_inps, dir_input + 'test_list_inps.pt')
torch.save(train_y, dir_input + 'train_y.pt')
torch.save(valid_y, dir_input + 'valid_y.pt')
torch.save(test_y, dir_input + 'test_y.pt')

test_date = test_dates[valid_number+1:]
test_date = [date.strftime('%Y-%m-%d') for date in test_date]
json.dump(test_date, open(dir_input + 'test_date.json', 'w'))

#Import the model from the script
f = open(dir_script+args.model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(args.model_name+'_init ='+args.model_name+'(train_list_inps)')

# writer.add_graph(args.model_name+'_init')

#Relocate them to gpu
exec(args.model_name+'_init ='+args.model_name+'_init.to(device)')
exec('optimizer = torch.optim.%s(%s_init.parameters(),lr = %f)'%(learn_config['optim'],args.model_name,learn_config['learn_rate']))
train_list_inps = []
valid_list_inps = []
test_list_inps = []
for inp in list_inps:
    train_list_inps.append(inp[:train_number].to(device))
    valid_list_inps.append(inp[train_number+1:valid_number].to(device))
    test_list_inps.append(inp[valid_number+1:].to(device))


#Learning loops
best_val_loss = 1
savecheck = 0
train_losses = []
validation_losses = []

with open(dir_loss+'log.txt', "w") as f: #ej
    # f.write()
    for epoch in range(learn_config['epoch']): #Generate log files(.txt, .png) for every epoch
        exec('output = '+args.model_name+'_init(train_list_inps)')#forward pass and update output conv1d_d_input.float().to(device)
        # print(output.shape)
        optimizer.zero_grad() #clear the existing gradients though, else gradients will be accumulated to existing gradients.
        exec('loss = %s(output.to(device),train_y.to(device))'%learn_config['loss_f']) # calculate updated loss
        writer.add_scalar('Loss/train', loss.item(), epoch)
        loss.backward() #To backpropagate the error
        optimizer.step() #update the model paramters, i.e backward
        train_losses.append(loss.item()) 
        ### validation data 
        exec('output_val = '+args.model_name+'_init(valid_list_inps)')
        exec('val_loss = %s(output_val.to(device), valid_y.to(device))'%learn_config['loss_f'])
        validation_losses.append(val_loss.item())
            #validation loss
        if epoch == 0:
            best_val_loss = val_loss.item()
        if val_loss.item() < best_val_loss:
            savecheck = 1
            exec('torch.save(%s_init.state_dict(), open(dir_model_save,model_save_mode))'%args.model_name)  
            # f.write('best model save - Epoch: %d, train_loss: %1.5f, val_loss: %1.5f \n'%(epoch, loss.item(), val_loss.item()))      
            best_val_loss = val_loss.item()
        if epoch == int(learn_config['epoch'])-1 and savecheck == 0:
            exec('torch.save(%s_init.state_dict(), open(dir_model_save,model_save_mode))'%args.model_name)  
            
        f.write('Epoch: %d, train_loss: %1.5f, val_loss: %1.5f \n' % (epoch+1, loss.item(), val_loss.item()))
    f.write('Learning completed')


#Save the state
with open(nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/status.config', 'w') as f:
    f.write('done')





