import argparse, sys, os, torch
from contextlib import redirect_stdout 
sys.path.append('./')
nowpath = os.getcwd()


parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('input_info', type=str) #[['죽산_수온_wee','죽산_수온_wee','죽산_수온_wee'],['죽산_수온_wee','죽산_수온_wee']] #숫자 연속형(":", "-") 사용 불가; 낱개로 parsing

args = parser.parse_args()

dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name #ej- 마지막의 '/' 제거
dir_layer = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/.layer_info/'+args.model_name


#Generate dummy inputs from the input info  => data error 아닌 model structure error을 테스트하기위해, dummy inputs 생성
list_inps = []  
for inp in args.input_info:
    list_inps.append(torch.rand(100,len(inp))) #ej- BETA ver. 현버전 2차원 인풋만 가능(conv, rnn layer 작동안됨)

#Import the model from the script
f = open(dir_script+'.py',encoding='UTF8')
exec(f.read())
f.close()

#Build the model OR ***raise an error message while building
exec(args.model_name+'_init ='+args.model_name+'(list_inps)')

#If the model building was successful, ***return the model structure
with open(dir_layer+'_info.txt', 'w') as f:
    with redirect_stdout(f):
        exec('print('+args.model_name+'_init)')