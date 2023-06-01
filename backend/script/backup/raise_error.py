import argparse, sys, os, torch
from contextlib import redirect_stdout 
sys.path.append('./')


parser = argparse.ArgumentParser()

parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('input_info', type=str)

args = parser.parse_args()

dir_script = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/script/'+args.model_name
dir_layer = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/layer_info/'+args.model_name
input_info = json.loads(args.input_info)


#Generate dummy inputs from the input info
list_inps = []
for inp in input_info:
    list_inps.append(torch.rand(inp))

#Import the model from the script
f = open(dir_script+'.py',encoding='UTF8')
exec(f.read())
f.close()

#Build the model OR ***raise an error message while building
exec(args.model_name+'_init ='+args.model_name+'()')

#If the model building was successful, ***return the model structure
with open(dir_layer+'_info.txt', 'w') as f:
    with redirect_stdout(f):
        exec('print('+args.model_name+'_init)')