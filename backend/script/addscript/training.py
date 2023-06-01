import argparse, sys, os, torch, pickle
import json
import random, matplotlib.pyplot as plt
import pandas as pd
from torch.autograd import Variable
from datetime import datetime, timedelta
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

tmp_learn_config = json.load(open(dir_script+'trainconfig.json','r', encoding="UTF-8"))
learn_config = {'epoch':tmp_learn_config['epoch'],'learn_rate':tmp_learn_config['learning rate'],'device':'cuda','optim':tmp_learn_config['optimizer'],'loss_f':'torch.nn.'+tmp_learn_config['loss function']+'Loss()'}
train_ratio = tmp_learn_config['Train ratio']/10
valid_ratio = tmp_learn_config['Validation ratio']/10
device = torch.device(learn_config['device'])


#Import whole dataframes
df = pd.read_csv(dir_source,  encoding='UTF-8',index_col=0)
df_input = []
for inp in input_info: df_input.append(df[inp])
output = df[output_info].dropna(how='any') 
'''
dataset기간을 y target 기간에서 20일 전으로 미리 만들어놓기
'''

#To tensor
with open(dir_model_input, 'rb') as f:
    first_cols = pickle.load(f)
list_inps = []
for (idx,inp) in df_input: #inp type: dataframe
    tensor_input = []
    for i in range(0, len(output)):
        if first_cols[idx] in list_lr_2d:#현재 수치형 인풋(2D)->3D전환 밖에 안됨
            dateperiod = inp[output.index[i]-timedelta(days=sequence_num):output.index[i]].values
            tensor_input.append(dateperiod)
        else: 
            datepoint = inp.loc[output.index[i]-timedelta(days=sequence_num)].values
            tensor_input.append(datepoint) #transpose는 model스크립트에서 해줌, 여기선 필요x
    tensor_input = np.array(tensor_input)
    tensor_input = torch.tensor(tensor_input, dtype= torch.float32)
    list_inps.append(tensor_input)
output_tensor = torch.tensor(output, dtype= torch.float32)

'''
#Create list_inps and outputs (N,H)
train_list_inps = []
valid_list_inps = []
for inp in input_info:
    train_list_inps.append(torch.tensor(train[inp].values, dtype= torch.float32))
    valid_list_inps.append(torch.tensor(valid[inp].values,dtype= torch.float32))
train_y = torch.tensor(train[output_info].values, dtype= torch.float32)
valid_y = torch.tensor(valid[output_info].values, dtype= torch.float32)


train = df.loc[:train_number]
valid = df.loc[train_number+1:valid_number]
test = df.loc[valid_number+1:]

train.to_csv(dir_input + 'train.csv', encoding='UTF-8')
valid.to_csv(dir_input + 'valid.csv', encoding='UTF-8')
test.to_csv(dir_input + 'test.csv', encoding='UTF-8')
'''
#Split into train/val/test
train_number = round(output_tensor.size[0]*train_ratio)
valid_number = round(output_tensor.size[0]*valid_ratio)+train_number

train_list_inps = []
valid_list_inps = []
test_list_inps = []
for inp in list_inps:
    train_list_inps.append(inp[:train_number])
    valid_list_inps.append(inp[train_number+1:valid_number])
    test_list_inps.append(inp[valid_number+1:])
train_y = output_tensor[:train_number]
valid_y = output_tensor[train_number+1:valid_number]
test_y = output_tensor[valid_number+1:]
torch.save(train_list_inps, dir_input + 'train_list_inps.pt')
torch.save(valid_list_inps, dir_input + 'valid_list_inps.pt')
torch.save(test_list_inps, dir_input + 'test_list_inps.pt')
torch.save(train_y, dir_input + 'train_y.pt')
torch.save(valid_y, dir_input + 'valid_y.pt')
torch.save(test_y, dir_input + 'test_y.pt')

#Import the model from the script
f = open(dir_script+args.model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(args.model_name+'_init ='+args.model_name+'(train_list_inps)')


#Relocate them to gpu
exec(args.model_name+'_init ='+args.model_name+'_init.to(device)')
exec('optimizer = torch.optim.%s(%s_init.parameters(),lr = %f)'%(learn_config['optim'],args.model_name,learn_config['learn_rate']))
'''
train_list_inps = []
valid_list_inps = []
for inp in input_info:
    train_list_inps.append((torch.tensor(train[inp].values, dtype= torch.float32).to(device)))
    valid_list_inps.append((torch.tensor(valid[inp].values, dtype= torch.float32).to(device)))
'''
train_list_inps = []
valid_list_inps = []
test_list_inps = []
for inp in list_inps:
    train_list_inps.append(inp[:train_number].to(device))
    valid_list_inps.append(inp[train_number+1:valid_number].to(device))
    test_list_inps.append(inp[valid_number+1:].to(device))

#Learning loops
best_val_loss = 1
train_losses = []
validation_losses = []

with open(dir_loss+'log.txt', "w") as f: #ej
    for epoch in range(learn_config['epoch']): #Generate log files(.txt, .png) for every epoch
        exec('output = '+args.model_name+'_init(train_list_inps)')#forward pass and update output conv1d_d_input.float().to(device)
        optimizer.zero_grad() #clear the existing gradients though, else gradients will be accumulated to existing gradients.
        exec('loss = %s(output.to(device),train_y.to(device))'%learn_config['loss_f']) # calculate updated loss
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
            exec('torch.save(%s_init.state_dict(), open(dir_model_save,model_save_mode))'%args.model_name)  
            # f.write('best model save - Epoch: %d, train_loss: %1.5f, val_loss: %1.5f \n'%(epoch, loss.item(), val_loss.item()))      
            best_val_loss = val_loss.item()
        f.write('Epoch: %d, train_loss: %1.5f, val_loss: %1.5f \n' % (epoch+1, loss.item(), val_loss.item()))
    f.write('Learning completed')

#     #Plot the loss curve
#     fig = plt.figure(figsize=args.fig_size)
#     plt.plot(train_losses, label='Training Loss')
#     plt.plot(validation_losses, label='Validation Loss')
#     minposs = validation_losses.index(min(validation_losses))+1
#     plt.axvline(minposs, linestyle='--', color='r',label='val_loss_minima')
#     plt.xlabel('epochs')
#     plt.ylabel('loss')
#     plt.grid(True)
#     plt.legend(loc='upper right')
#     plt.tight_layout()
#     plt.show()
#     if os.path.isfile(dir_loss+'.png'):
#         os.remove(dir_loss+'.png')
#     plt.savefig(dir_loss+'loss.png', dpi=400)

#Save the state
with open(nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/status.config', 'w') as f:
    f.write('done')





