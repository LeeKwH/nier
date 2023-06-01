import argparse, sys, os, torch
import hiddenlayer as hl
from torchviz import make_dot

sys.path.append('./')
os.environ["PATH"]+=os.pathsep+'C:/Program Files (x86)/Graphviz/bin/'

parser = argparse.ArgumentParser()

parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('input_info', type=str)

args = parser.parse_args()
dir_script = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/script/'+args.model_name
dir_graph = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/graph/'+args.model_name
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
exec(args.model_name+'_init ='+args.model_name+'(list_inps)')
exec('yhat='args.model_name+'_init(list_inps)')


#Export pictures of the model
exec('make_dot(yhat, params=dict('+args.model_name+'_init.named_parameters())).render('+dir_graph+'torchviz, format="jpg")')
exec('hl.build_graph('+args.model_name+'_init,(list_inps)).save('+dir_graph+'hl, format="jpg")')
