import argparse, sys, os, torch
import random, matplotlib.pyplot as plt
from torch.autograd import Variable 
sys.path.append('./')


parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('input_info', type=str) #[['죽산_수온_wee','죽산_수온_wee','죽산_수온_wee'],['죽산_수온_wee','죽산_수온_wee']]
parser.add_argument('output_info', type=str) #'죽산_클로로필_wee'
parser.add_argument('learn_config', type=str) #learn_config = {'epoch':100,'learn_rate':0.01,'device':'cuda','optim':'torch.optim.RMSprop','loss_f':'torch.nn.MSELoss()'}
parser.add_argument('fig_size', type=str) #(10,4)


args = parser.parse_args()
dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name #ej
dir_input = nowpath+'/.user/'+args.user_name+'/.input/'+args.model_name #ej
dir_model_save = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.weight/'+args.model_name +'_params.pth'
model_save_mode = 'wb'
dir_loss = nowpath+'/.user/'+args.user_name+'/.train/'+args.model_name+'/.loss/'+args.model_name #ej
device = torch.device(args.learn_config['device'])


#Import whole dataframes
train = pd.read_csv(dir_input + '_train.csv', encoding='cp949',index_col=0)
valid = pd.read_csv(dir_input + '_valid.csv', encoding='cp949',index_col=0)


#Create list_inps and outputs
train_list_inps = []
valid_list_inps = []
for inp in args.input_info:
    train_list_inps.append(train[inp])
    valid_list_inps.append(valid[inp])

train_y = train[args.output_info]
valid_y = train[args.output_info]


#Import the model from the script
f = open(dir_script+'.py',encoding='UTF8')
exec(f.read())
f.close()
exec(args.model_name+'_init ='+args.model_name+'(train_list_inps)')


#Relocate them to gpu
exec(args.model_name+'_init.to(device)')
train_list_inps = []
valid_list_inps = []
for inp in args.input_info:
    train_list_inps.append(train[inp].to(device))
    valid_list_inps.append(valid[inp].to(device))
exec('optimizer = %s(%s_init.parameters(),lr = %d)'%(args.learn_config['optim'],args.model_name,args.learn_config['learn_rate']))


#Learning loops
best_val_loss = 1
train_losses = []
validation_losses = []

for epoch in range(args.learn_config['epoch']): #Generate log files(.txt, .png) for every epoch
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
    with open(dir_loss+'_log.txt', "w") as f: #ej
        #validation loss
        if val_loss.item() < best_val_loss:
            exec('torch.save(%s_init.state_dict(), open(dir_model_save,model_save_mode))'%args.model_name)  
            f.write('best model save - Epoch: %d, train_loss: %1.5f, val_loss: %1.5f'%(epoch, loss.item(), val_loss.item()))      
            best_val_loss = val_loss.item()
        if epoch % 10 == 0:
            f.write('Epoch: %d, train_loss: %1.5f, val_loss: %1.5f' % (epoch, loss.item(), val_loss.item()))
        f.write('Learning completed')

    #Plot the loss curve
    fig = plt.figure(figsize=args.fig_size)
    plt.plot(train_losses, label='Training Loss')
    plt.plot(validation_losses, label='Validation Loss')
    minposs = validation_losses.index(min(validation_losses))+1
    plt.axvline(minposs, linestyle='--', color='r',label='val_loss_minima')
    plt.xlabel('epochs')
    plt.ylabel('loss')
    plt.grid(True)
    plt.legend(loc='upper right')
    plt.tight_layout()
    plt.show()
    if os.path.isfile(dir_loss+'.png'):
        os.remove(dir_loss+'.png')
    plt.savefig(dir_loss+'.png', dpi=400)






