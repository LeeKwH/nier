import argparse, sys, os, torch
import hiddenlayer as hl
from torchviz import make_dot
import json
sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()

parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)

args = parser.parse_args()
dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name
dir_graph = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.graph/'+args.model_name

model_info = json.load(open(dir_script+'/modelinfo.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
input_tmp.pop('out')
input_info = list(input_tmp.values())

#Generate dummy inputs from the input info
list_inps = []
for inp in input_info:
    print(len(inp))
    list_inps.append(torch.rand(len(inp)))
'''
#Import the model from the script
f = open(dir_script+'/'+args.model_name+'.py',encoding='UTF8')
exec(f.read())
f.close()

#Build the model OR ***raise an error message while building
exec(args.model_name+'_init ='+args.model_name+'(list_inps)')
exec('yhat='+args.model_name+'_init(list_inps)')


#Export pictures of the model
exec('make_dot(yhat, params=dict('+args.model_name+'_init.named_parameters())).render('+dir_graph+'torchviz, format="jpg")')
exec('hl.build_graph('+args.model_name+'_init,(list_inps)).save('+dir_graph+'hl, format="jpg")')
'''